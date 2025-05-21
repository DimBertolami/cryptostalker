import requests
from datetime import datetime, timedelta

API_KEY = '1758e18b-1744-4ad6-a2a9-908af2f33c8a'  # <- Replace this with your actual API key
headers = {'X-CMC_PRO_API_KEY': API_KEY}

def get_recent_cryptos(min_volume=1_500_000):
    url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest'
    params = {
        'start': '1',
        'limit': '100',
        'sort': 'date_added',
        'sort_dir': 'desc',
        'convert': 'USD'
    }

    response = requests.get(url, headers=headers, params=params)
    data = response.json()

    now = datetime.utcnow()
    one_day_ago = now - timedelta(days=1)
    recent_high_volume = []

    for coin in data.get('data', []):
        try:
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
        except Exception as e:
            print(f"Error parsing coin data: {e}")
            
    return recent_high_volume
