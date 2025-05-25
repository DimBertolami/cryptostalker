from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import os
import json
import time
import random
import requests
from datetime import datetime, timedelta
from recent_high_volume import get_recent_cryptos
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from dotenv import load_dotenv

# Load environment variables
try:
    load_dotenv()
except Exception as e:
    print(f"Warning: Could not load .env file: {e}")

# Create the Flask app
app = Flask(__name__, static_folder='../dist')

# Enable CORS for all routes with a more permissive configuration
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept"]}})

# Add CORS headers to all responses
@app.after_request
def add_cors_headers(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    response.headers.add('Access-Control-Max-Age', '3600')
    # Handle preflight OPTIONS requests
    if request.method == 'OPTIONS':
        response.status_code = 204
    return response

# Configure rate limiting and caching
#     "/api/*": {
#     "origins": ["http://localhost:4173", "http://localhost:5001", "http://localhost:5173"],
#     "methods": ["GET", "POST", "OPTIONS"],
#     "allow_headers": ["Content-Type", "Authorization"],
#     "supports_credentials": True
# }
# })  # Allow requests from frontend

from flask_caching import Cache  # If you're using caching

# Initialize cache if not already done
cache = Cache(config={'CACHE_TYPE': 'simple'})
cache.init_app(app)

# Change the limiter configuration to:
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    storage_uri="memory://",
    # 
)

COINMARKETCAP_API = 'https://pro-api.coinmarketcap.com/v1/'
# Use the environment variable if available, otherwise use the hardcoded key
API_KEY = os.getenv('CMC_API_KEY', 'a36ab379-15a0-409b-99ec-85ab7f2836ea')
print(f"Using CoinMarketCap API key: {API_KEY[:5]}...{API_KEY[-5:]}")

# Add a flag to enable/disable detailed logging
DEBUG_MODE = True

@app.route("/api/new-cryptos")
def new_cryptos():
    coins = get_recent_cryptos()
    return jsonify(coins)

@app.route('/api/test', methods=['GET'])
def test_endpoint():
    """A simple test endpoint to verify that the API server is working properly."""
    return jsonify({
        "status": "success",
        "message": "API server is working properly",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/cmc-proxy', methods=['GET'])
# @limiter.limit("5 per minute")  # 5 requests per minute max
@cache.cached(timeout=60, query_string=True)  # Cache for 60 seconds
def cmc_proxy():
    endpoint = request.args.get('endpoint')
    if not endpoint:
        return jsonify({"error": "Missing 'endpoint' parameter"}), 400
        
    print(f"Received proxy request for endpoint: {endpoint}")
    
    # Create a copy of the request arguments
    params = dict(request.args)
    params.pop('endpoint', None)
    
    # Log the parameters being sent
    if DEBUG_MODE:
        print(f"Request parameters: {params}")
    
    headers = {
        'X-CMC_PRO_API_KEY': API_KEY,
        'Accept': 'application/json'
    }
    
    try:
        # Construct the full URL
        full_url = f"{COINMARKETCAP_API}{endpoint}"
        print(f"Proxying to: {full_url}")
        
        # Make the request to CoinMarketCap
        response = requests.get(
            full_url, 
            headers=headers, 
            params=params,
            timeout=15  # Increased timeout
        )
        
        # Print the response status and content for debugging
        print(f"CoinMarketCap API response status: {response.status_code}")
        
        if DEBUG_MODE and response.text:
            print(f"CoinMarketCap API response content: {response.text[:300]}...") # Print first 300 chars
        
        # Check if the response is successful
        response.raise_for_status()
        
        # Parse the JSON response
        try:
            json_data = response.json()
            print("Successfully parsed JSON response")
            
            # Return the JSON response to the client
            return jsonify(json_data)
        except ValueError as json_error:
            print(f"Error parsing JSON response: {json_error}")
            print(f"Response content: {response.text}")
            return jsonify({"error": "Invalid JSON response from CoinMarketCap API", "details": str(json_error)}), 500
    except requests.exceptions.HTTPError as e:
        # Handle HTTP errors (e.g., 401, 403, 429)
        print(f"HTTP error from CoinMarketCap API: {e}")
        
        # Try to extract more detailed error information
        error_details = {}
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_json = e.response.json()
                if 'status' in error_json and 'error_message' in error_json['status']:
                    error_details['cmc_error'] = error_json['status']['error_message']
                    print(f"CoinMarketCap error message: {error_details['cmc_error']}")
            except ValueError:
                error_details['response_text'] = e.response.text
        
        error_response = jsonify({
            "error": f"Error from CoinMarketCap API: {str(e)}",
            "status_code": e.response.status_code if hasattr(e, 'response') else None,
            "details": error_details
        })
        
        # Return a more specific error code if available
        status_code = e.response.status_code if hasattr(e, 'response') and e.response is not None else 500
        return error_response, status_code
        
    except requests.exceptions.ConnectionError as e:
        # Handle connection errors
        print(f"Connection error to CoinMarketCap API: {e}")
        return jsonify({
            "error": "Connection error to CoinMarketCap API", 
            "details": str(e),
            "suggestion": "Check your internet connection or CoinMarketCap API status"
        }), 503  # Service Unavailable
        
    except requests.exceptions.Timeout as e:
        # Handle timeout errors
        print(f"Timeout error to CoinMarketCap API: {e}")
        return jsonify({
            "error": "Timeout error to CoinMarketCap API", 
            "details": str(e),
            "suggestion": "The API request took too long to complete. Try again later."
        }), 504  # Gateway Timeout
        
    except requests.exceptions.RequestException as e:
        # Handle all other request exceptions
        print(f"Request error to CoinMarketCap API: {e}")
        return jsonify({
            "error": "Request error to CoinMarketCap API", 
            "details": str(e)
        }), 500
        
    except Exception as e:
        # Handle all other exceptions
        import traceback
        traceback_str = traceback.format_exc()
        print(f"Unexpected error in cmc_proxy: {e}")
        print(f"Traceback: {traceback_str}")
        
        return jsonify({
            "error": "Unexpected error in cmc_proxy", 
            "details": str(e),
            "traceback": traceback_str if DEBUG_MODE else "Enable DEBUG_MODE for traceback"
        }), 500

@app.route('/api/trading/portfolio', methods=['GET'])
@cache.cached(timeout=60)  # Cache for 1 minute
def get_portfolio():
    try:
        print("Fetching real-time portfolio data...")
        
        # Get your actual portfolio positions from the database
        # This is just an example - replace with your actual database query
        portfolio_positions = get_portfolio_positions()  # Implement this function
        
        if not portfolio_positions:
            print("No portfolio positions found")
            return jsonify([])
            
        # Get symbols for price lookup
        symbols = [pos['symbol'] for pos in portfolio_positions]
        
        # Fetch current prices
        headers = {
            'X-CMC_PRO_API_KEY': API_KEY,
            'Accept': 'application/json'
        }
        
        # Get quotes in batches of 20 (API limit)
        batch_size = 20
        all_quotes = {}
        
        for i in range(0, len(symbols), batch_size):
            batch = symbols[i:i + batch_size]
            params = {
                'symbol': ','.join(batch),
                'convert': 'USD'
            }
            
            try:
                response = requests.get(
                    f"{COINMARKETCAP_API}cryptocurrency/quotes/latest",
                    headers=headers,
                    params=params
                )
                response.raise_for_status()
                batch_quotes = response.json().get('data', {})
                all_quotes.update(batch_quotes)
            except requests.exceptions.RequestException as e:
                print(f"Error fetching prices for batch: {e}")
                continue
        
        # Build response
        portfolio_data = []
        for position in portfolio_positions:
            symbol = position['symbol']
            if symbol not in all_quotes:
                print(f"Warning: No price data for {symbol}")
                continue
                
            quote = all_quotes[symbol]['quote']['USD']
            current_price = quote['price']
            
            portfolio_data.append({
                "id": position.get('id', str(hash(symbol))),
                "symbol": symbol,
                "name": all_quotes[symbol].get('name', symbol),
                "currentPrice": current_price,
                "balance": float(position['amount']),
                "averageBuyPrice": float(position['buy_price']),
                "purchaseTimestamp": int(position.get('buy_timestamp', 0)) * 1000,
                "currentValue": float(position['amount']) * current_price,
                "profitLoss": (current_price - float(position['buy_price'])) * float(position['amount']),
                "profitLossPercentage": ((current_price / float(position['buy_price'])) - 1) * 100,
                "lastUpdated": datetime.now().isoformat() + 'Z'
            })
        
        response = jsonify(portfolio_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    except Exception as e:
        print(f"Error in get_portfolio: {str(e)}")
        import traceback
        traceback.print_exc()
        
        error_response = jsonify({
            "error": "Failed to fetch portfolio data",
            "message": str(e)
        })
        error_response.status_code = 500
        error_response.headers.add('Access-Control-Allow-Origin', '*')
        return error_response

def get_portfolio_positions():
    """Fetch portfolio positions from your database"""
    # TODO: Replace this with your actual database query
    # Example:
    # return db.session.query(Portfolio).all()
    
    # For now, return mock data
    return [
        {
            "id": "1",
            "symbol": "ZEUS",
            "amount": "1000",
            "buy_price": "0.15",
            "buy_timestamp": 1716400000
        },
        {
            "id": "2",
            "symbol": "CAI",
            "amount": "5000",
            "buy_price": "0.03",
            "buy_timestamp": 1716400000
        }
    ]

@app.route('/api/trading/history/<symbol>', methods=['GET'])
def get_price_history(symbol):
    try:
        print(f"Fetching price history for {symbol}...")
        
        # Get portfolio positions to find buy prices and timestamps
        positions = get_portfolio_positions()
        position = next((p for p in positions if p['symbol'] == symbol), None)
        
        if not position:
            return jsonify({"error": "Position not found"}), 404
            
        buy_timestamp = int(position['buy_timestamp']) * 1000  # Convert to milliseconds
        buy_price = float(position['buy_price'])
        
        # Generate price history with some variation around the buy price
        import random
        import time
        
        current_time = int(time.time() * 1000)
        time_range = current_time - buy_timestamp
        num_points = 30  # Number of data points
        
        # Generate timestamps
        timestamps = [buy_timestamp + (i * time_range // num_points) for i in range(num_points + 1)]
        
        # Generate prices with some randomness
        prices = []
        current_price = buy_price
        for _ in range(len(timestamps)):
            prices.append(current_price)
            # Random walk for price movement
            current_price = current_price * (1 + (random.random() - 0.5) * 0.1)
        
        # Create history data points
        history = [
            {
                "timestamp": ts,
                "price": price,
                "isBuy": ts == buy_timestamp  # Mark the buy point
            }
            for ts, price in zip(timestamps, prices)
        ]
        
        response = jsonify({
            "history": history,
            "buyInfo": {
                "timestamp": buy_timestamp,
                "price": buy_price,
                "amount": position['amount']
            }
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response
        
    except Exception as e:
        print(f"Error in get_price_history: {str(e)}")
        error_response = jsonify({
            "error": f"Failed to fetch price history for {symbol}",
            "details": str(e)
        })
        error_response.status_code = 500
        error_response.headers.add('Access-Control-Allow-Origin', '*')
        return error_response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
