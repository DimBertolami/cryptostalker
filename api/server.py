from flask import Flask, request, jsonify, Blueprint, current_app, send_from_directory
from flask_cors import CORS
import os
import json
import logging
import time
import random
import requests
from datetime import datetime, timedelta
from recent_high_volume import get_recent_cryptos
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from dotenv import load_dotenv

# Load environment variables first
try:
    load_dotenv()
except Exception as e:
    print(f"Warning: Could not load .env file: {e}")
import ccxt
from supabase import create_client, Client
from flask import Blueprint
from api.utils.encryption import encrypt_data, decrypt_data

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in environment variables.")
    # Depending on your app's needs, you might want to exit or disable Supabase features.
    supabase: Client = None
else:
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        print("Successfully connected to Supabase with service role key.")
    except Exception as e:
        print(f"Error connecting to Supabase: {e}")
        supabase: Client = None

# Create the Flask app
app = Flask(__name__)
app.logger.setLevel(logging.INFO)
app.config['static_folder'] = '../dist'

# Enable CORS specifically for the frontend origin
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173", "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"], "allow_headers": ["Content-Type", "Authorization", "X-User-Id", "X-Requested-With", "Accept"], "supports_credentials": True}})



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

# --- Exchange Configurations Blueprint ---
exchange_configurations_bp = Blueprint('exchange_configurations_api', __name__, url_prefix='/api/exchange-configurations')

# Placeholder for getting user_id from authenticated session (e.g., JWT)
# THIS IS NOT SECURE FOR PRODUCTION. Replace with actual JWT auth.
def get_current_user_id_placeholder():
    # Option 1: For testing, get from a custom header (e.g., "X-User-Id")
    # The frontend/Postman should send a header: X-User-Id: your-actual-user-uuid
    user_id = request.headers.get("X-User-Id") # Get the header named "X-User-Id"
    if not user_id:
        # It's good practice to specify which header was expected in the error.
        raise ValueError("Required 'X-User-Id' header is missing for testing.")
    return user_id # The value of this header will be the user's UUID
    # Option 2: For backend-only testing, hardcode a test user_id from your auth.users table
    # return "905bdb52-190f-442d-8a96-bd777c3b5120" # Example UUID
    # Option 3: Raise error until auth is implemented (commented out for Option 1 to work)
    # raise NotImplementedError("User authentication not implemented. Cannot get user_id.")

@exchange_configurations_bp.route('/', methods=['POST'])
def create_exchange_configuration():
    if not supabase:
        return jsonify({"error": "Supabase client not initialized"}), 500
    try:
        user_id = get_current_user_id_placeholder() # Replace with actual user ID from auth
    except (NotImplementedError, ValueError) as e:
        return jsonify({"error": str(e)}), 401

    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON payload"}), 400

    required_fields = ['exchange_id_name', 'api_key', 'api_secret']
    if not all(field in data for field in required_fields):
        return jsonify({"error": f"Missing one or more required fields: {', '.join(required_fields)}"}), 400

    try:
        new_config = {
            "user_id": user_id,
            "exchange_id_name": data['exchange_id_name'],
            "nickname": data.get('nickname'),
            "api_key_encrypted": encrypt_data(data['api_key']),
            "secret_key_encrypted": encrypt_data(data['api_secret']),
            "password_encrypted": encrypt_data(data['password']) if data.get('password') else None,
        }
        current_app.logger.info(f"Attempting to insert new_config: {new_config}") # Cascade Debug Log
        response = supabase.table('exchange_configurations').insert(new_config).execute()
        
        if response.data:
            return jsonify(response.data[0]), 201
        elif response.error:
            return jsonify({"error": "Failed to create exchange configuration", "details": response.error.message}), 500
        else:
            return jsonify({"error": "Failed to create exchange configuration", "details": "Unknown error"}), 500

    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

@exchange_configurations_bp.route('/', methods=['GET'])
def get_exchange_configurations_list():
    if not supabase:
        return jsonify({"error": "Supabase client not initialized"}), 500
    try:
        user_id = get_current_user_id_placeholder() # Replace with actual user ID from auth
    except (NotImplementedError, ValueError) as e:
        return jsonify({"error": str(e)}), 401

    try:
        response = supabase.table('exchange_configurations')\
            .select('id, user_id, exchange_id_name, nickname, created_at, updated_at')\
            .eq('user_id', user_id)\
            .execute()
        
        if response.data:
            return jsonify(response.data)
        elif response.error:
            return jsonify({"error": "Failed to fetch exchange configurations", "details": response.error.message}), 500
        else:
            return jsonify([]) # Return empty list if no error but no data
            
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

@exchange_configurations_bp.route('/<uuid:config_id>', methods=['GET'])
def get_single_exchange_configuration(config_id):
    if not supabase:
        return jsonify({"error": "Supabase client not initialized"}), 500
    try:
        user_id = get_current_user_id_placeholder() # Replace with actual user ID from auth
    except (NotImplementedError, ValueError) as e:
        return jsonify({"error": str(e)}), 401

    try:
        response = supabase.table('exchange_configurations')\
            .select('*')\
            .eq('id', str(config_id))\
            .eq('user_id', user_id)\
            .single()\
            .execute()

        if response.data:
            config = response.data
            # Decrypt sensitive fields
            config['api_key'] = decrypt_data(config.pop('api_key_encrypted', ''))
            config['secret_key'] = decrypt_data(config.pop('secret_key_encrypted', ''))
            if 'password_encrypted' in config and config['password_encrypted']:
                config['password'] = decrypt_data(config.pop('password_encrypted'))
            else:
                config.pop('password_encrypted', None) # remove if None or empty
                config['password'] = None
            return jsonify(config)
        elif response.error:
             # Check if error is due to 'PGRST116' (0 rows) which means not found or not authorized
            if response.error.code == 'PGRST116': 
                return jsonify({"error": "Exchange configuration not found or access denied"}), 404
            return jsonify({"error": "Failed to fetch exchange configuration", "details": response.error.message}), 500
        else: # Should not happen with .single() if no error, but as a fallback
            return jsonify({"error": "Exchange configuration not found"}), 404
            
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

@exchange_configurations_bp.route('/<uuid:config_id>', methods=['PUT'])
def update_exchange_configuration(config_id):
    if not supabase:
        return jsonify({"error": "Supabase client not initialized"}), 500
    try:
        user_id = get_current_user_id_placeholder() # Replace with actual user ID from auth
    except (NotImplementedError, ValueError) as e:
        return jsonify({"error": str(e)}), 401

    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON payload"}), 400

    update_payload = {}
    if 'nickname' in data: update_payload['nickname'] = data['nickname']
    if 'exchange_id_name' in data: update_payload['exchange_id_name'] = data['exchange_id_name'] # usually not changed but possible
    if 'api_key' in data: update_payload['api_key_encrypted'] = encrypt_data(data['api_key'])
    if 'secret_key' in data: update_payload['secret_key_encrypted'] = encrypt_data(data['secret_key'])
    if 'password' in data: # handles empty string for password removal or new password
        update_payload['password_encrypted'] = encrypt_data(data['password']) if data['password'] else None
    
    if not update_payload:
        return jsonify({"error": "No update fields provided"}), 400
    
    update_payload['updated_at'] = 'now()' # Let Supabase handle the timestamp

    try:
        response = supabase.table('exchange_configurations')\
            .update(update_payload)\
            .eq('id', str(config_id))\
            .eq('user_id', user_id)\
            .execute()

        if response.data:
            return jsonify(response.data[0]), 200
        elif response.error:
            if response.error.code == 'PGRST116': # Not found or RLS prevented update
                 return jsonify({"error": "Exchange configuration not found or update failed due to permissions"}), 404
            return jsonify({"error": "Failed to update exchange configuration", "details": response.error.message}), 500
        else: # No data and no error might mean RLS prevented update without erroring explicitly, or 0 rows matched
            return jsonify({"error": "Update did not affect any rows. Configuration not found or no changes made."}), 404

    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

@exchange_configurations_bp.route('/<uuid:config_id>', methods=['DELETE'])
def delete_exchange_configuration(config_id):
    if not supabase:
        return jsonify({"error": "Supabase client not initialized"}), 500
    try:
        user_id = get_current_user_id_placeholder() # Replace with actual user ID from auth
    except (NotImplementedError, ValueError) as e:
        return jsonify({"error": str(e)}), 401

    try:
        response = supabase.table('exchange_configurations')\
            .delete()\
            .eq('id', str(config_id))\
            .eq('user_id', user_id)\
            .execute()

        if response.data:
            return jsonify({"message": "Exchange configuration deleted successfully"}), 200
        elif response.error:
            if response.error.code == 'PGRST116': # Not found or RLS prevented delete
                 return jsonify({"error": "Exchange configuration not found or delete failed due to permissions"}), 404
            return jsonify({"error": "Failed to delete exchange configuration", "details": response.error.message}), 500
        else: # No data and no error might mean RLS prevented delete or 0 rows matched
            return jsonify({"message": "Exchange configuration not found or no action taken."}), 404
            
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

# Register Blueprints
app.register_blueprint(exchange_configurations_bp)

# --- Price Endpoint ---
@app.route('/api/price/<string:symbol>', methods=['GET'])
@limiter.limit("10/minute") # Example rate limit: 10 requests per minute per IP
@cache.cached(timeout=60)    # Cache results for 60 seconds
def get_price(symbol):
    if not API_KEY:
        return jsonify({"error": "CoinMarketCap API key not configured"}), 500

    headers = {
        'Accepts': 'application/json',
        'X-CMC_PRO_API_KEY': API_KEY,
    }
    params = {
        'symbol': symbol.upper(),
        'convert': 'USD' # Or any other currency you prefer
    }
    url = COINMARKETCAP_API + 'cryptocurrency/quotes/latest'

    try:
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status() # Raises an HTTPError for bad responses (4XX or 5XX)
        data = response.json()

        if data['status']['error_code'] != 0:
            return jsonify({"error": "CoinMarketCap API error", "details": data['status']['error_message']}), 500

        if symbol.upper() not in data['data']:
            return jsonify({"error": f"Data for symbol {symbol.upper()} not found in CoinMarketCap response"}), 404
            
        price = data['data'][symbol.upper()]['quote']['USD']['price']
        return jsonify({"symbol": symbol.upper(), "price": price})
    
    except requests.exceptions.HTTPError as http_err:
        # Attempt to parse error from CoinMarketCap if possible
        try:
            error_details = response.json().get('status', {}).get('error_message', str(http_err))
        except ValueError:
            error_details = str(http_err)
        current_app.logger.error(f"HTTP error fetching price for {symbol}: {error_details}")
        return jsonify({"error": f"CoinMarketCap API request failed: {error_details}"}), response.status_code
    except requests.exceptions.RequestException as req_err:
        current_app.logger.error(f"Request error fetching price for {symbol}: {req_err}")
        return jsonify({"error": f"Error connecting to CoinMarketCap: {str(req_err)}"}), 503
    except KeyError as key_err:
        current_app.logger.error(f"KeyError parsing CoinMarketCap response for {symbol}: {key_err} - Data: {data}")
        return jsonify({"error": "Error parsing price data from CoinMarketCap"}), 500
    except Exception as e:
        current_app.logger.error(f"Unexpected error fetching price for {symbol}: {e}")
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500
# Add other blueprints here if you create more

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

@app.route('/api/ccxt/exchanges', methods=['GET'])
def list_ccxt_exchanges():
    """Returns a list of all exchange IDs supported by CCXT."""
    try:
        return jsonify(ccxt.exchanges)
    except Exception as e:
        print(f"Error listing CCXT exchanges: {e}")
        return jsonify({"error": "Could not retrieve CCXT exchanges", "details": str(e)}), 500

@app.route('/api/ccxt/test_exchange_markets', methods=['GET'])
# @limiter.limit("10 per minute") # Optional: consider rate limiting later
def test_ccxt_exchange_markets():
    """Tests loading markets for a given CCXT exchange ID."""
    exchange_id = request.args.get('exchange_id')
    if not exchange_id:
        return jsonify({"error": "Missing 'exchange_id' parameter"}), 400

    if exchange_id not in ccxt.exchanges:
        return jsonify({"error": f"Exchange '{exchange_id}' is not supported by CCXT."}), 404

    try:
        if DEBUG_MODE:
            print(f"Attempting to initialize CCXT exchange: {exchange_id}")
        
        exchange_class = getattr(ccxt, exchange_id)
        # Initialize without API keys for public data (loading markets)
        exchange = exchange_class()
        
        if DEBUG_MODE:
            print(f"Successfully initialized {exchange_id}. Attempting to load markets...")
            
        markets = exchange.load_markets()
        
        if DEBUG_MODE:
            print(f"Successfully loaded markets for {exchange_id}. Number of markets: {len(markets) if markets else 0}")
            
        # Return a summary or a sample of markets to avoid overly large responses
        if markets:
            sample_markets = list(markets.keys())[:5] # First 5 market symbols
            return jsonify({
                "exchange_id": exchange_id,
                "status": "success",
                "message": f"Successfully loaded markets for {exchange_id}.",
                "market_count": len(markets),
                "sample_markets": sample_markets
            })
        else:
            return jsonify({
                "exchange_id": exchange_id,
                "status": "success",
                "message": f"Loaded markets for {exchange_id}, but no markets were returned or the list was empty.",
                "market_count": 0
            })

    except ccxt.NetworkError as e:
        print(f"NetworkError loading markets for {exchange_id}: {e}")
        return jsonify({"error": f"Network error connecting to {exchange_id}", "details": str(e)}), 502
    except ccxt.ExchangeError as e:
        print(f"ExchangeError loading markets for {exchange_id}: {e}")
        return jsonify({"error": f"Error from {exchange_id} exchange API", "details": str(e)}), 500
    except AttributeError as e:
        # This might happen if getattr fails for some reason, though unlikely if exchange_id is in ccxt.exchanges
        print(f"AttributeError for {exchange_id}: {e}")
        return jsonify({"error": f"Could not find or initialize exchange class for {exchange_id}", "details": str(e)}), 500
    except Exception as e:
        import traceback
        traceback_str = traceback.format_exc()
        print(f"Unexpected error loading markets for {exchange_id}: {e}")
        print(f"Traceback: {traceback_str}")
        return jsonify({
            "error": f"Unexpected error processing {exchange_id}", 
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

@app.route('/api/bitvavo/order', methods=['POST'])
def bitvavo_place_order():
    if not bitvavo_client:
        return jsonify({"error": "Bitvavo client not initialized. Check API keys."}), 500

    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request body"}), 400

    market = data.get('market')  # e.g., 'BTC-EUR'
    side = data.get('side')      # 'buy' or 'sell'
    order_type = data.get('orderType', 'market') # Default to market
    amount_str = data.get('amount') # Amount as string

    if not all([market, side, amount_str]):
        return jsonify({"error": "Missing required fields: market, side, amount"}), 400

    if order_type != 'market':
        return jsonify({"error": "Only market orders are currently supported by this endpoint"}), 400

    try:
        # For market buy, 'amountQuote' is used (amount of quote currency)
        # For market sell, 'amount' is used (amount of base currency)
        payload = {}
        if side == 'buy':
            payload['amountQuote'] = amount_str
        elif side == 'sell':
            payload['amount'] = amount_str
        else:
            return jsonify({"error": "Invalid side. Must be 'buy' or 'sell'."}), 400
        
        if DEBUG_MODE:
            print(f"Placing Bitvavo order: market={market}, side={side}, orderType={order_type}, payload={payload}")

        response = bitvavo_client.placeOrder(market, side, order_type, payload)
        
        if DEBUG_MODE:
            print(f"Bitvavo API response: {response}")
            
        return jsonify(response), 200

    except Exception as e:
        error_message = str(e)
        if DEBUG_MODE:
            print(f"Error placing Bitvavo order: {error_message}")
            import traceback
            traceback.print_exc()
        
        # Try to parse Bitvavo's specific error format if possible
        try:
            error_details = json.loads(error_message)
            return jsonify({"error": "Bitvavo API error", "details": error_details}), 500
        except json.JSONDecodeError:
            return jsonify({"error": "Failed to place Bitvavo order", "details": error_message}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
