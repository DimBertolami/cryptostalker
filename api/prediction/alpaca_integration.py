import os
import requests
import logging
from datetime import datetime

logger = logging.getLogger("alpaca")

ALPACA_BASE_URL = "https://data.alpaca.markets/v2"
ALPACA_API_KEY = os.getenv("ALPACA_API_KEY")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")


def fetch_alpaca_ohlcv(symbol, timeframe="1Hour", limit=100):
    """
    Fetch historical OHLCV data from Alpaca for a given symbol.
    Args:
        symbol (str): e.g., "BTC/USD" or "AAPL"
        timeframe (str): e.g., "1Min", "1Hour", "1Day"
        limit (int): Number of bars to fetch
    Returns:
        list of dicts: [{timestamp, open, high, low, close, volume}, ...]
    """
    if not ALPACA_API_KEY or not ALPACA_SECRET_KEY:
        logger.error("Alpaca API keys not set in environment variables.")
        raise ValueError("Alpaca API keys missing.")

    # Alpaca expects symbols like 'BTC/USD' as 'BTCUSD' for crypto
    alpaca_symbol = symbol.replace("/", "")
    headers = {
        "APCA-API-KEY-ID": ALPACA_API_KEY,
        "APCA-API-SECRET-KEY": ALPACA_SECRET_KEY,
    }
    url = f"{ALPACA_BASE_URL}/crypto/bars"
    params = {
        "symbols": alpaca_symbol,
        "timeframe": timeframe,
        "limit": limit,
    }
    response = requests.get(url, headers=headers, params=params)
    if response.status_code != 200:
        logger.error(f"Alpaca API error: {response.status_code} {response.text}")
        raise Exception(f"Alpaca API error: {response.status_code} {response.text}")
    data = response.json()
    bars = data.get("bars", {}).get(alpaca_symbol, [])
    chart_data = []
    for bar in bars:
        chart_data.append({
            "timestamp": int(datetime.fromisoformat(bar["t"].replace("Z", "+00:00")).timestamp() * 1000),
            "open": bar["o"],
            "high": bar["h"],
            "low": bar["l"],
            "close": bar["c"],
            "volume": bar["v"],
        })
    return chart_data
