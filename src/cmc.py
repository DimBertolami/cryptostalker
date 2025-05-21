import requests
from datetime import datetime, timedelta
import time

# Your CoinMarketCap API Key
API_KEY = '1758e18b-1744-4ad6-a2a9-908af2f33c8a'
headers = {'X-CMC_PRO_API_KEY': API_KEY}

# Cache variables
last_fetch_time = 0
cached_data = None
CACHE_DURATION = 900  # 15 minutes

# Track rate limits
last_rate_limit_time = 0
RATE_LIMIT_COOLDOWN = 300  # 5 minutes

def get_recent_cryptos(min_volume=1_500_000):
    global last_fetch_time, cached_data, last_rate_limit_time
    
    # Check if we're in rate limit cooldown
    current_time = time.time()
    if current_time - last_rate_limit_time < RATE_LIMIT_COOLDOWN:
        print(f"In rate limit cooldown, returning cached data")
        return cached_data or []
    
    # Check cache first
    if cached_data and (current_time - last_fetch_time) < CACHE_DURATION:
        return cached_data
    
    url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest'
    params = {
        'start': '1',
        'limit': '50',  
        'sort': 'date_added',  
        'sort_dir': 'desc',
        'convert': 'USD'
    }
    
    try:
        response = requests.get(url, headers=headers, params=params)
        
        # Handle rate limits
        if response.status_code == 429:
            print(f"Rate limited - entering cooldown for {RATE_LIMIT_COOLDOWN} seconds")
            last_rate_limit_time = current_time
            return cached_data or []
            
        response.raise_for_status()
        data = response.json()
        
        now = datetime.utcnow()
        one_day_ago = now - timedelta(days=1)
        
        recent_high_volume = []

        for coin in data['data']:
            date_added = datetime.strptime(coin['date_added'], "%Y-%m-%dT%H:%M:%S.%fZ")
            volume_24h = coin['quote']['USD']['volume_24h']
            
            if date_added > one_day_ago and volume_24h > min_volume:
                recent_high_volume.append({
                    'name': coin['name'],
                    'symbol': coin['symbol'],
                    'date_added': coin['date_added'],
                    'volume_24h': volume_24h,
                    'cmc_rank': coin['cmc_rank'],
                    'market_cap': coin['quote']['USD']['market_cap']
                })
        
        # Update cache
        cached_data = recent_high_volume
        last_fetch_time = current_time
        return recent_high_volume
    
    except requests.exceptions.RequestException as e:
        print(f"API Error: {e}")
        return cached_data or []  

# Example usage
if __name__ == "__main__":
    coins = get_recent_cryptos()
    for coin in coins:
        print(coin)
