"""
Trading Module for Cryptocurrency Trading

This module integrates the prediction model with CCXT for executing trades
and managing positions across multiple exchanges.
"""

import os
import json
import time
import logging
import pandas as pd
import numpy as np
import ccxt
from datetime import datetime, timedelta
import threading
from typing import Dict, List, Optional, Union, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("trading_module.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("trading_module")

class CryptoTradingModule:
    """
    A module for executing trades based on prediction model signals
    using CCXT for exchange connectivity.
    """
    
    def __init__(self, config_file='trading_config.json'):
        """
        Initialize the trading module.
        
        Args:
            config_file (str): Path to the JSON configuration file
        """
        self.config_file = config_file
        self.config = {}
        self.exchanges = {}
        self.is_running = False
        self.thread = None
        self.trade_history = []
        self.open_orders = {}
        self.balances = {}
        self.last_update_time = {}
        
        # Load configuration
        self.load_config()
        
        # Initialize exchange connections
        self._initialize_exchanges()
        
        logger.info(f"Trading module initialized with {len(self.exchanges)} exchanges")
    
    def load_config(self):
        """Load configuration from JSON file."""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    self.config = json.load(f)
            else:
                # Create default configuration
                self.config = {
                    'exchanges': [],
                    'symbols': ['BTC/USDT', 'ETH/USDT'],
                    'base_currency': 'USDT',
                    'risk_percentage': 2,
                    'trade_mode': 'paper',  # 'paper' or 'live'
                    'update_interval': 60,  # seconds
                    'stop_loss_pct': 5,
                    'take_profit_pct': 10,
                    'max_open_trades': 5
                }
                self.save_config()
                
            logger.info(f"Configuration loaded from {self.config_file}")
            
        except Exception as e:
            logger.error(f"Error loading configuration: {e}")
            # Use default configuration
            self.config = {
                'exchanges': [],
                'symbols': ['BTC/USDT', 'ETH/USDT'],
                'base_currency': 'USDT',
                'risk_percentage': 2,
                'trade_mode': 'paper',
                'update_interval': 60,
                'stop_loss_pct': 5,
                'take_profit_pct': 10,
                'max_open_trades': 5
            }
    
    def save_config(self):
        """Save current configuration to JSON file."""
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=4)
                
            logger.info(f"Configuration saved to {self.config_file}")
            
        except Exception as e:
            logger.error(f"Error saving configuration: {e}")
    
    def _initialize_exchanges(self):
        """Initialize connections to configured exchanges."""
        self.exchanges = {}
        
        for exchange_config in self.config.get('exchanges', []):
            try:
                exchange_id = exchange_config.get('id')
                api_key = exchange_config.get('api_key', '')
                secret = exchange_config.get('secret', '')
                
                if not exchange_id:
                    logger.warning("Exchange ID missing in configuration, skipping")
                    continue
                
                # Initialize the exchange
                if exchange_id in ccxt.exchanges:
                    exchange_class = getattr(ccxt, exchange_id)
                    exchange = exchange_class({
                        'apiKey': api_key,
                        'secret': secret,
                        'enableRateLimit': True,
                        'options': {'adjustForTimeDifference': True}
                    })
                    
                    # Test connection
                    if api_key and secret:
                        try:
                            # Try to fetch balance to test API keys
                            if self.config.get('trade_mode') == 'live':
                                exchange.fetch_balance()
                                logger.info(f"Successfully connected to {exchange_id} with API keys")
                        except Exception as e:
                            logger.warning(f"Could not authenticate with {exchange_id}: {e}")
                            # Continue without API keys for public data
                            exchange = exchange_class({
                                'enableRateLimit': True,
                                'options': {'adjustForTimeDifference': True}
                            })
                    
                    # Store the exchange instance
                    self.exchanges[exchange_id] = exchange
                    logger.info(f"Initialized exchange: {exchange_id}")
                else:
                    logger.warning(f"Exchange {exchange_id} not supported by CCXT")
                    
            except Exception as e:
                logger.error(f"Error initializing exchange: {e}")
    
    def add_exchange(self, exchange_id, api_key='', secret=''):
        """
        Add a new exchange to the configuration.
        
        Args:
            exchange_id (str): CCXT exchange ID
            api_key (str): API key for the exchange
            secret (str): Secret key for the exchange
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Check if exchange is supported by CCXT
            if exchange_id not in ccxt.exchanges:
                logger.error(f"Exchange {exchange_id} not supported by CCXT")
                return False
            
            # Check if exchange already exists
            for i, exchange in enumerate(self.config.get('exchanges', [])):
                if exchange.get('id') == exchange_id:
                    # Update existing exchange
                    self.config['exchanges'][i] = {
                        'id': exchange_id,
                        'api_key': api_key,
                        'secret': secret
                    }
                    self.save_config()
                    self._initialize_exchanges()
                    return True
            
            # Add new exchange
            if 'exchanges' not in self.config:
                self.config['exchanges'] = []
                
            self.config['exchanges'].append({
                'id': exchange_id,
                'api_key': api_key,
                'secret': secret
            })
            
            self.save_config()
            self._initialize_exchanges()
            
            return True
            
        except Exception as e:
            logger.error(f"Error adding exchange: {e}")
            return False
    
    def remove_exchange(self, exchange_id):
        """
        Remove an exchange from the configuration.
        
        Args:
            exchange_id (str): CCXT exchange ID
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Find and remove the exchange
            for i, exchange in enumerate(self.config.get('exchanges', [])):
                if exchange.get('id') == exchange_id:
                    self.config['exchanges'].pop(i)
                    self.save_config()
                    
                    # Remove from active exchanges
                    if exchange_id in self.exchanges:
                        del self.exchanges[exchange_id]
                        
                    return True
            
            logger.warning(f"Exchange {exchange_id} not found in configuration")
            return False
            
        except Exception as e:
            logger.error(f"Error removing exchange: {e}")
            return False
    
    def fetch_market_data(self, exchange_id, symbol, timeframe='1h', limit=500):
        """
        Fetch market data from an exchange.
        
        Args:
            exchange_id (str): CCXT exchange ID
            symbol (str): Trading pair symbol
            timeframe (str): Candlestick timeframe
            limit (int): Number of candlesticks to fetch
            
        Returns:
            pd.DataFrame: DataFrame with OHLCV data
        """
        try:
            if exchange_id not in self.exchanges:
                logger.error(f"Exchange {exchange_id} not initialized")
                return None
            
            exchange = self.exchanges[exchange_id]
            
            # Check if the exchange supports OHLCV data
            if not exchange.has['fetchOHLCV']:
                logger.error(f"Exchange {exchange_id} does not support OHLCV data")
                return None
            
            # Fetch OHLCV data
            ohlcv = exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
            
            # Convert to DataFrame
            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
            df.set_index('timestamp', inplace=True)
            
            logger.info(f"Fetched {len(df)} {timeframe} candles for {symbol} from {exchange_id}")
            
            return df
            
        except Exception as e:
            logger.error(f"Error fetching market data: {e}")
            return None
    
    def fetch_balance(self, exchange_id):
        """
        Fetch account balance from an exchange.
        
        Args:
            exchange_id (str): CCXT exchange ID
            
        Returns:
            dict: Account balance
        """
        try:
            if exchange_id not in self.exchanges:
                logger.error(f"Exchange {exchange_id} not initialized")
                return None
            
            exchange = self.exchanges[exchange_id]
            
            # Check if we have API keys
            if not exchange.apiKey or not exchange.secret:
                logger.error(f"No API keys configured for {exchange_id}")
                return None
            
            # Fetch balance
            balance = exchange.fetch_balance()
            
            # Store in cache
            self.balances[exchange_id] = balance
            self.last_update_time[f"{exchange_id}_balance"] = datetime.now()
            
            logger.info(f"Fetched balance from {exchange_id}")
            
            return balance
            
        except Exception as e:
            logger.error(f"Error fetching balance: {e}")
            return None
    
    def fetch_open_orders(self, exchange_id, symbol=None):
        """
        Fetch open orders from an exchange.
        
        Args:
            exchange_id (str): CCXT exchange ID
            symbol (str, optional): Trading pair symbol
            
        Returns:
            list: Open orders
        """
        try:
            if exchange_id not in self.exchanges:
                logger.error(f"Exchange {exchange_id} not initialized")
                return None
            
            exchange = self.exchanges[exchange_id]
            
            # Check if we have API keys
            if not exchange.apiKey or not exchange.secret:
                logger.error(f"No API keys configured for {exchange_id}")
                return None
            
            # Fetch open orders
            orders = exchange.fetch_open_orders(symbol=symbol)
            
            # Store in cache
            key = f"{exchange_id}_{symbol if symbol else 'all'}"
            self.open_orders[key] = orders
            self.last_update_time[f"{key}_orders"] = datetime.now()
            
            logger.info(f"Fetched {len(orders)} open orders from {exchange_id}")
            
            return orders
            
        except Exception as e:
            logger.error(f"Error fetching open orders: {e}")
            return None
    
    def create_order(self, exchange_id, symbol, order_type, side, amount, price=None, params={}):
        """
        Create an order on an exchange.
        
        Args:
            exchange_id (str): CCXT exchange ID
            symbol (str): Trading pair symbol
            order_type (str): Order type (limit, market)
            side (str): Order side (buy, sell)
            amount (float): Order amount
            price (float, optional): Order price (required for limit orders)
            params (dict, optional): Additional parameters
            
        Returns:
            dict: Order details
        """
        try:
            if self.config.get('trade_mode') != 'live':
                logger.info(f"Paper trading mode: Would create {order_type} {side} order for {amount} {symbol} at {price}")
                
                # Create a simulated order
                order = {
                    'id': f"paper_{int(time.time())}",
                    'datetime': datetime.now().isoformat(),
                    'timestamp': int(time.time() * 1000),
                    'status': 'open',
                    'symbol': symbol,
                    'type': order_type,
                    'side': side,
                    'price': price,
                    'amount': amount,
                    'filled': 0,
                    'remaining': amount,
                    'cost': 0,
                    'fee': {'cost': 0, 'currency': symbol.split('/')[1]},
                    'info': {'paper_trading': True}
                }
                
                # Add to trade history
                self.trade_history.append(order)
                
                return order
            
            if exchange_id not in self.exchanges:
                logger.error(f"Exchange {exchange_id} not initialized")
                return None
            
            exchange = self.exchanges[exchange_id]
            
            # Check if we have API keys
            if not exchange.apiKey or not exchange.secret:
                logger.error(f"No API keys configured for {exchange_id}")
                return None
            
            # Create order
            if order_type == 'limit':
                if price is None:
                    logger.error("Price is required for limit orders")
                    return None
                
                order = exchange.create_limit_order(symbol, side, amount, price, params)
            elif order_type == 'market':
                order = exchange.create_market_order(symbol, side, amount, price, params)
            else:
                logger.error(f"Unsupported order type: {order_type}")
                return None
            
            # Add to trade history
            self.trade_history.append(order)
            
            logger.info(f"Created {order_type} {side} order for {amount} {symbol} at {price}")
            
            return order
            
        except ccxt.InsufficientFunds as e:
            logger.error(f"Insufficient funds to create order: {e}")
            return None
        except Exception as e:
            logger.error(f"Error creating order: {e}")
            return None
    
    def cancel_order(self, exchange_id, order_id, symbol=None):
        """
        Cancel an order on an exchange.
        
        Args:
            exchange_id (str): CCXT exchange ID
            order_id (str): Order ID
            symbol (str, optional): Trading pair symbol
            
        Returns:
            dict: Cancellation result
        """
        try:
            if self.config.get('trade_mode') != 'live':
                logger.info(f"Paper trading mode: Would cancel order {order_id}")
                
                # Find the paper order
                for i, order in enumerate(self.trade_history):
                    if order.get('id') == order_id and order.get('status') == 'open':
                        self.trade_history[i]['status'] = 'canceled'
                        return {'id': order_id, 'status': 'canceled'}
                
                logger.warning(f"Paper order {order_id} not found or not open")
                return None
            
            if exchange_id not in self.exchanges:
                logger.error(f"Exchange {exchange_id} not initialized")
                return None
            
            exchange = self.exchanges[exchange_id]
            
            # Check if we have API keys
            if not exchange.apiKey or not exchange.secret:
                logger.error(f"No API keys configured for {exchange_id}")
                return None
            
            # Cancel order
            result = exchange.cancel_order(order_id, symbol)
            
            logger.info(f"Canceled order {order_id}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error canceling order: {e}")
            return None
    
    def execute_signal(self, exchange_id, symbol, signal, confidence=0.0, amount=None):
        """
        Execute a trading signal.
        
        Args:
            exchange_id (str): CCXT exchange ID
            symbol (str): Trading pair symbol
            signal (int): Trading signal (1=buy, -1=sell, 0=hold)
            confidence (float): Signal confidence (0.0-1.0)
            amount (float, optional): Order amount (if None, calculated based on risk)
            
        Returns:
            dict: Order details if executed, None otherwise
        """
        try:
            if signal == 0:
                logger.info(f"Hold signal for {symbol}, no action taken")
                return None
            
            # Get current price
            ticker = self.fetch_ticker(exchange_id, symbol)
            if not ticker:
                logger.error(f"Could not fetch ticker for {symbol}")
                return None
            
            current_price = ticker['last']
            
            # Determine side
            side = 'buy' if signal == 1 else 'sell'
            
            # Calculate amount if not provided
            if amount is None:
                if side == 'buy':
                    # Calculate amount based on risk percentage
                    risk_pct = self.config.get('risk_percentage', 2) / 100
                    
                    # Get account balance
                    balance = self.fetch_balance(exchange_id)
                    if not balance:
                        logger.error(f"Could not fetch balance for {exchange_id}")
                        return None
                    
                    # Get base currency (e.g., USDT in BTC/USDT)
                    base_currency = symbol.split('/')[1]
                    
                    # Get available balance
                    available = balance.get('free', {}).get(base_currency, 0)
                    
                    # Calculate amount to buy
                    amount_in_base = available * risk_pct * confidence
                    amount = amount_in_base / current_price
                    
                    logger.info(f"Calculated buy amount: {amount} {symbol.split('/')[0]} (risk: {risk_pct}, confidence: {confidence})")
                else:
                    # For sell, get current position
                    balance = self.fetch_balance(exchange_id)
                    if not balance:
                        logger.error(f"Could not fetch balance for {exchange_id}")
                        return None
                    
                    # Get quote currency (e.g., BTC in BTC/USDT)
                    quote_currency = symbol.split('/')[0]
                    
                    # Get available balance
                    available = balance.get('free', {}).get(quote_currency, 0)
                    
                    # Sell a portion based on confidence
                    amount = available * confidence
                    
                    logger.info(f"Calculated sell amount: {amount} {quote_currency} (confidence: {confidence})")
            
            # Check if amount is sufficient
            if amount <= 0:
                logger.warning(f"Calculated amount is zero or negative: {amount}")
                return None
            
            # Execute order
            order_type = 'market'  # Use market orders for simplicity
            order = self.create_order(exchange_id, symbol, order_type, side, amount)
            
            return order
            
        except Exception as e:
            logger.error(f"Error executing signal: {e}")
            return None
    
    def fetch_ticker(self, exchange_id, symbol):
        """
        Fetch ticker for a symbol.
        
        Args:
            exchange_id (str): CCXT exchange ID
            symbol (str): Trading pair symbol
            
        Returns:
            dict: Ticker data
        """
        try:
            if exchange_id not in self.exchanges:
                logger.error(f"Exchange {exchange_id} not initialized")
                return None
            
            exchange = self.exchanges[exchange_id]
            
            # Fetch ticker
            ticker = exchange.fetch_ticker(symbol)
            
            return ticker
            
        except Exception as e:
            logger.error(f"Error fetching ticker: {e}")
            return None
    
    def get_portfolio_value(self, exchange_id, base_currency='USDT'):
        """
        Calculate the total portfolio value in the specified base currency.
        
        Args:
            exchange_id (str): CCXT exchange ID
            base_currency (str): Base currency for valuation
            
        Returns:
            float: Portfolio value
        """
        try:
            if exchange_id not in self.exchanges:
                logger.error(f"Exchange {exchange_id} not initialized")
                return 0
            
            # Get balance
            balance = self.fetch_balance(exchange_id)
            if not balance:
                logger.error(f"Could not fetch balance for {exchange_id}")
                return 0
            
            # Get total balance (including funds in open orders)
            total_value = balance.get('total', {}).get(base_currency, 0)
            
            # Convert other currencies to base currency
            for currency, amount in balance.get('total', {}).items():
                if currency == base_currency or amount <= 0:
                    continue
                
                try:
                    # Try to get ticker for currency/base_currency
                    symbol = f"{currency}/{base_currency}"
                    ticker = self.fetch_ticker(exchange_id, symbol)
                    
                    if ticker:
                        # Add value to total
                        total_value += amount * ticker['last']
                    else:
                        # Try reverse pair
                        symbol = f"{base_currency}/{currency}"
                        ticker = self.fetch_ticker(exchange_id, symbol)
                        
                        if ticker:
                            # Add value to total
                            total_value += amount / ticker['last']
                except:
                    # Skip currencies that can't be converted
                    logger.warning(f"Could not convert {currency} to {base_currency}")
            
            return total_value
            
        except Exception as e:
            logger.error(f"Error calculating portfolio value: {e}")
            return 0
    
    def start_trading(self, interval_seconds=60):
        """
        Start the trading loop.
        
        Args:
            interval_seconds (int): Seconds between trading cycles
        """
        if self.is_running:
            logger.warning("Trading already running")
            return
            
        self.is_running = True
        logger.info(f"Starting trading with {len(self.exchanges)} exchanges")
        
        def trading_loop():
            while self.is_running:
                try:
                    self.run_trading_cycle()
                    # Sleep until next cycle
                    time.sleep(interval_seconds)
                except Exception as e:
                    logger.error(f"Error in trading loop: {e}")
                    time.sleep(10)  # Shorter sleep on error
        
        # Start trading in a separate thread
        self.thread = threading.Thread(target=trading_loop)
        self.thread.daemon = True
        self.thread.start()
    
    def stop_trading(self):
        """Stop the trading loop."""
        if not self.is_running:
            logger.warning("Trading already stopped")
            return
            
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=10)
        
        logger.info("Trading stopped")
    
    def run_trading_cycle(self):
        """Run a single trading cycle."""
        logger.info("Running trading cycle")
        
        # Update balances and open orders
        for exchange_id in self.exchanges:
            try:
                # Update balance
                self.fetch_balance(exchange_id)
                
                # Update open orders for all configured symbols
                for symbol in self.config.get('symbols', []):
                    self.fetch_open_orders(exchange_id, symbol)
                    
                # Calculate portfolio value
                base_currency = self.config.get('base_currency', 'USDT')
                portfolio_value = self.get_portfolio_value(exchange_id, base_currency)
                
                logger.info(f"Portfolio value for {exchange_id}: {portfolio_value} {base_currency}")
                
            except Exception as e:
                logger.error(f"Error updating data for {exchange_id}: {e}")
        
        # TODO: Implement trading logic using prediction model
        # This would be integrated with the prediction module
    
    def get_exchange_status(self, exchange_id):
        """
        Get the status of an exchange.
        
        Args:
            exchange_id (str): CCXT exchange ID
            
        Returns:
            dict: Exchange status
        """
        try:
            if exchange_id not in self.exchanges:
                logger.error(f"Exchange {exchange_id} not initialized")
                return None
            
            exchange = self.exchanges[exchange_id]
            
            # Get basic exchange info
            status = {
                'id': exchange_id,
                'name': exchange.name,
                'has_api_keys': bool(exchange.apiKey and exchange.secret),
                'last_balance_update': self.last_update_time.get(f"{exchange_id}_balance"),
                'portfolio_value': None,
                'symbols': self.config.get('symbols', [])
            }
            
            # Get portfolio value if possible
            if status['has_api_keys']:
                base_currency = self.config.get('base_currency', 'USDT')
                status['portfolio_value'] = self.get_portfolio_value(exchange_id, base_currency)
                status['base_currency'] = base_currency
            
            return status
            
        except Exception as e:
            logger.error(f"Error getting exchange status: {e}")
            return None
    
    def get_all_exchange_statuses(self):
        """
        Get the status of all exchanges.
        
        Returns:
            list: Exchange statuses
        """
        statuses = []
        
        for exchange_id in self.exchanges:
            status = self.get_exchange_status(exchange_id)
            if status:
                statuses.append(status)
        
        return statuses

# Example usage
if __name__ == "__main__":
    # This is just a demonstration of how to use the module
    print("Crypto Trading Module")
    print("Import this module to use the trading functionality in your system")
