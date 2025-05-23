from flask import Flask, request, jsonify
import requests
from flask_cors import CORS
from recent_high_volume import get_recent_cryptos
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import requests
load_dotenv()  # This loads the .env file

# First create the Flask app
app = Flask(__name__)
CORS(app) 
# CORS(app, resources={
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
API_KEY = os.getenv('COINMARKETCAP_API_KEY')

@app.route("/api/new-cryptos")
def new_cryptos():
    coins = get_recent_cryptos()
    return jsonify(coins)

@app.route('/api/cmc-proxy', methods=['GET'])
# @limiter.limit("5 per minute")  # 5 requests per minute max
@cache.cached(timeout=60, query_string=True)  # Cache for 60 seconds
def cmc_proxy():
    endpoint = request.args.get('endpoint')
    print(f"Received proxy request for endpoint: {endpoint}")
    params = dict(request.args)
    params.pop('endpoint', None)
    
    headers = {
        'X-CMC_PRO_API_KEY': API_KEY,
        'Accept': 'application/json'
    }
    
    try:
        print(f"Proxying to: {COINMARKETCAP_API}{endpoint}")
        response = requests.get(f"{COINMARKETCAP_API}{endpoint}", 
                              headers=headers, 
                              params=params,
                              timeout=10)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        print(f"Proxy error: {e}")
        return jsonify({"error": str(e)}), 500

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
            'X-CMC_PRO_API_KEY': os.getenv('COINMARKETCAP_API_KEY'),
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
