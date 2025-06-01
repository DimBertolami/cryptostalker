import os
import requests
from typing import Optional, Dict, List
from datetime import datetime

class NomicsAPI:
    BASE_URL = "https://api.nomics.com/v1"
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('NOMICS_API_KEY')
    
    def _make_request(self, endpoint: str, params: Dict = None) -> Dict:
        params = params or {}
        params['key'] = self.api_key
        
        response = requests.get(f"{self.BASE_URL}{endpoint}", params=params)
        response.raise_for_status()
        return response.json()
    
    def get_currencies_ticker(self, 
                            ids: List[str] = None, 
                            interval: str = '1d',
                            convert: str = 'USD') -> List[Dict]:
        """
        Get current market data for cryptocurrencies
        Args:
            ids: List of currency ids (e.g. ['BTC', 'ETH'])
            interval: Time interval for change calculation (1d,7d,30d,365d,ytd)
            convert: Currency to convert into (USD, EUR, etc)
        """
        params = {
            'ids': ','.join(ids) if ids else None,
            'interval': interval,
            'convert': convert
        }
        return self._make_request('/currencies/ticker', params)
    
    def get_historical_prices(self, 
                            currency: str, 
                            start: datetime, 
                            end: datetime, 
                            interval: str = '1d') -> List[Dict]:
        """
        Get historical prices for a cryptocurrency
        Args:
            currency: Currency id (e.g. 'BTC')
            start: Start datetime
            end: End datetime
            interval: Time interval between data points (1d,1h,1m)
        """
        params = {
            'currency': currency,
            'start': start.isoformat(),
            'end': end.isoformat(),
            'interval': interval
        }
        return self._make_request('/currencies/sparkline', params)
    
    def get_exchange_rates(self) -> Dict:
        """Get current exchange rates between currencies"""
        return self._make_request('/exchange-rates')
