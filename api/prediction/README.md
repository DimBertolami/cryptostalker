# CryptoStalker Prediction and Trading Modules

This directory contains modules for cryptocurrency price prediction and trading, inspired by the Taurus trading bot architecture.

## Overview

The prediction and trading modules provide the following capabilities:

1. **Price Prediction** - Uses deep reinforcement learning (DDPG) to predict cryptocurrency price movements
2. **Data Processing** - Prepares and processes market data with technical indicators
3. **Trading Execution** - Connects to exchanges via CCXT to execute trades based on predictions
4. **Visualization** - Creates interactive charts of predictions and trading performance
5. **API Integration** - Exposes endpoints for model training, prediction, and trading

## Modules

- `simple_prediction_model.py` - Implements a Deep Deterministic Policy Gradient (DDPG) model
- `data_processor.py` - Handles data preparation and feature engineering
- `trading_module.py` - Manages exchange connections and trade execution via CCXT
- `visualization.py` - Creates interactive visualizations of predictions and performance
- `api_integration.py` - Provides Flask API endpoints for the prediction and trading functionality

## API Endpoints

### Prediction Endpoints

- `GET /api/prediction/status` - Get the status of the prediction module
- `POST /api/prediction/fetch_data` - Fetch market data for training or prediction
- `POST /api/prediction/train` - Train the prediction model
- `POST /api/prediction/predict` - Generate predictions using the trained model

### Trading Endpoints

- `GET /api/prediction/exchanges` - Get the list of available exchanges
- `POST /api/prediction/configure_exchange` - Configure an exchange
- `POST /api/prediction/remove_exchange` - Remove an exchange
- `GET /api/prediction/balance` - Get account balance
- `GET /api/prediction/open_orders` - Get open orders
- `POST /api/prediction/create_order` - Create an order
- `POST /api/prediction/cancel_order` - Cancel an order
- `POST /api/prediction/execute_signal` - Execute a trading signal
- `POST /api/prediction/start_trading` - Start the trading loop
- `POST /api/prediction/stop_trading` - Stop the trading loop

## Usage

### Integration with Main Application

The prediction and trading modules are integrated with the main application in `api/app_integration.py`. To use these modules:

1. Import the necessary modules in your application
2. Register the prediction API routes with your Flask application
3. Access the API endpoints to train models, generate predictions, and execute trades

### Example: Training a Model

```python
import requests

# Train a prediction model
response = requests.post('http://localhost:5000/api/prediction/train', json={
    'exchange_id': 'binance',
    'symbol': 'BTC/USDT',
    'timeframe': '1h',
    'limit': 1000,
    'actor_layers': [64, 32],
    'critic_layers': [64, 32],
    'learning_rate': 0.001,
    'batch_size': 64,
    'epochs': 50
})

print(response.json())
```

### Example: Getting a Prediction

```python
import requests

# Get a prediction
response = requests.post('http://localhost:5000/api/prediction/predict', json={
    'exchange_id': 'binance',
    'symbol': 'BTC/USDT',
    'timeframe': '1h'
})

prediction = response.json()
print(f"Signal: {prediction['signal_text']}, Confidence: {prediction['confidence']}")
```

## Dependencies

- TensorFlow/Keras - For deep learning models
- CCXT - For exchange connectivity
- Flask - For API endpoints
- Pandas/NumPy - For data processing
- Plotly/Matplotlib - For visualization

## Configuration

The trading module can be configured via a JSON configuration file (`trading_config.json`). The configuration includes:

- Exchange API keys
- Trading symbols
- Risk parameters
- Trading mode (paper or live)
- Update intervals

## Future Improvements

- Add more prediction models (LSTM, Transformer, etc.)
- Implement portfolio optimization
- Add more technical indicators
- Enhance backtesting capabilities
- Add more visualization options
- Implement advanced risk management
