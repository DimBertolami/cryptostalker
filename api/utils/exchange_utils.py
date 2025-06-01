"""
Exchange utility functions for CryptoStalker
"""
import ccxt
from typing import List, Dict, Optional
import logging
#from api.utils.exchange_utils import get_supported_pairs, is_pair_supported

# Check all EUR pairs on Binance
#eur_pairs = get_supported_pairs('binance', 'EUR')
#print(f"Found {eur_pairs['pair_count']} EUR pairs")

# Check specifically for SOL/EUR
#sol_eur_available = is_pair_supported('binance', 'SOL/EUR')
#print(f"SOL/EUR is {'available' if sol_eur_available else 'not available'} on Binance")

logger = logging.getLogger(__name__)

def get_supported_pairs(exchange_id: str, quote_currency: Optional[str] = None) -> Dict:
    """
    Get all supported trading pairs for an exchange, optionally filtered by quote currency
    
    Args:
        exchange_id: CCXT exchange id (e.g. 'binance')
        quote_currency: Optional quote currency to filter by (e.g. 'EUR')
    
    Returns:
        {
            'exchange': exchange_id,
            'quote_currency': quote_currency,
            'pair_count': int,
            'pairs': List[str],
            'error': Optional[str]
        }
    """
    try:
        # Initialize exchange
        exchange = getattr(ccxt, exchange_id)({
            'enableRateLimit': True,
            'options': {'defaultType': 'spot'}
        })
        
        # Load markets
        markets = exchange.load_markets()
        
        # Filter active pairs
        active_pairs = [
            symbol for symbol, market in markets.items() 
            if market['active']
        ]
        
        # Filter by quote currency if specified
        if quote_currency:
            active_pairs = [
                symbol for symbol in active_pairs 
                if symbol.endswith(f'/{quote_currency}')
            ]
        
        return {
            'exchange': exchange_id,
            'quote_currency': quote_currency,
            'pair_count': len(active_pairs),
            'pairs': sorted(active_pairs),
            'error': None
        }
        
    except Exception as e:
        logger.error(f"Error fetching pairs for {exchange_id}: {str(e)}", exc_info=True)
        return {
            'exchange': exchange_id,
            'quote_currency': quote_currency,
            'pair_count': 0,
            'pairs': [],
            'error': str(e)
        }

def is_pair_supported(exchange_id: str, pair: str) -> bool:
    """
    Check if a specific trading pair is supported on an exchange
    
    Args:
        exchange_id: CCXT exchange id (e.g. 'binance')
        pair: Trading pair to check (e.g. 'SOL/EUR')
    
    Returns:
        bool: True if pair is supported and active
    """
    try:
        exchange = getattr(ccxt, exchange_id)({
            'enableRateLimit': True,
            'options': {'defaultType': 'spot'}
        })
        exchange.load_markets()
        return pair in exchange.markets and exchange.markets[pair]['active']
    except Exception:
        return False
