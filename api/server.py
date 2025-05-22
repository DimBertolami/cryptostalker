from flask import Flask, request, jsonify
import requests
from flask_cors import CORS
from recent_high_volume import get_recent_cryptos
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache

app = Flask(__name__)
# Update CORS to be more specific and secure
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "https://localhost:5173"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

cache = Cache(app, config={'CACHE_TYPE': 'SimpleCache'})

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    storage_uri="memory://",
)

COINMARKETCAP_API = 'https://pro-api.coinmarketcap.com/v1/'
API_KEY = '1758e18b-1744-4ad6-a2a9-908af2f33c8a'

@app.route("/api/new-cryptos")
def new_cryptos():
    try:
        coins = get_recent_cryptos()
        response = jsonify(coins)
        return response
    except Exception as e:
        print(f"Error in new_cryptos: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/cmc-proxy', methods=['GET'])
@cache.cached(timeout=60, query_string=True)
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

@app.route('/api/health')
def health_check():
    return jsonify({"status": "healthy"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)