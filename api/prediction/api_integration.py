"""
API Integration Module for Prediction and Trading

This module connects the prediction and trading modules with the CryptoStalker API,
providing endpoints for model training, prediction, and trading operations.
"""

import os
import json
import logging
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
import ccxt
import threading
import time

# Import our modules
from api.prediction.simple_prediction_model import DDPGPredictionModel
from api.prediction.data_processor import CryptoDataProcessor
from api.prediction.trading_module import CryptoTradingModule

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("prediction_api.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("prediction_api")

# Create Blueprint for prediction API
prediction_api = Blueprint('prediction_api', __name__)

# Initialize global instances
data_processor = CryptoDataProcessor()
prediction_model = None
trading_module = CryptoTradingModule()

# Model training status
training_status = {
    'is_training': False,
    'progress': 0,
    'start_time': None,
    'end_time': None,
    'error': None
}

def initialize_model():
    """Initialize the prediction model."""
    global prediction_model
    
    try:
        # Check if model exists
        model_path = os.path.join(os.path.dirname(__file__), 'models', 'ddpg_model')
        if os.path.exists(model_path):
            # Load existing model
            prediction_model = DDPGPredictionModel()
            prediction_model.load(model_path)
            logger.info(f"Loaded existing model from {model_path}")
        else:
            # Create new model with default parameters
            prediction_model = DDPGPredictionModel()
            logger.info("Created new prediction model")
            
            # Create models directory if it doesn't exist
            os.makedirs(os.path.join(os.path.dirname(__file__), 'models'), exist_ok=True)
    
    except Exception as e:
        logger.error(f"Error initializing prediction model: {e}")
        prediction_model = None

# Initialize model on module load
initialize_model()

@prediction_api.route('/status', methods=['GET'])
def get_status():
    """Get the status of the prediction module."""
    global prediction_model, training_status
    
    model_info = {
        'model_initialized': prediction_model is not None,
        'model_type': 'DDPG' if prediction_model else None,
        'training_status': training_status
    }
    
    if prediction_model:
        # Add model-specific information
        model_info.update({
            'actor_layers': prediction_model.actor_layers,
            'critic_layers': prediction_model.critic_layers,
            'state_dim': prediction_model.state_dim,
            'action_dim': prediction_model.action_dim,
            'memory_size': len(prediction_model.memory) if prediction_model.memory else 0
        })
    
    return jsonify({
        'status': 'ok',
        'model_info': model_info,
        'trading_module': {
            'initialized': trading_module is not None,
            'exchanges': len(trading_module.exchanges) if trading_module else 0,
            'is_running': trading_module.is_running if trading_module else False
        }
    })

@prediction_api.route('/fetch_data', methods=['POST'])
def fetch_data():
    """Fetch market data for training or prediction."""
    try:
        data = request.get_json()
        
        # Required parameters
        exchange_id = data.get('exchange_id', 'binance')
        symbol = data.get('symbol', 'BTC/USDT')
        timeframe = data.get('timeframe', '1h')
        limit = int(data.get('limit', 500))
        
        # Fetch data using trading module
        df = trading_module.fetch_market_data(exchange_id, symbol, timeframe, limit)
        
        if df is None:
            return jsonify({
                'status': 'error',
                'message': f"Failed to fetch data from {exchange_id} for {symbol}"
            }), 400
        
        # Add technical indicators
        df = data_processor.add_technical_indicators(df)
        
        # Create target variable if requested
        if data.get('create_target', True):
            target_type = data.get('target_type', 'binary')
            horizon = int(data.get('horizon', 24))
            df = data_processor.create_target(df, target_type, horizon)
        
        # Return summary statistics
        return jsonify({
            'status': 'ok',
            'data_shape': df.shape,
            'start_date': df.index[0].isoformat(),
            'end_date': df.index[-1].isoformat(),
            'columns': list(df.columns),
            'summary': df.describe().to_dict()
        })
        
    except Exception as e:
        logger.error(f"Error fetching data: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@prediction_api.route('/train', methods=['POST'])
def train_model():
    """Train the prediction model."""
    global prediction_model, training_status
    
    try:
        # Check if already training
        if training_status['is_training']:
            return jsonify({
                'status': 'error',
                'message': 'Model is already training'
            }), 400
        
        data = request.get_json()
        
        # Required parameters
        exchange_id = data.get('exchange_id', 'binance')
        symbol = data.get('symbol', 'BTC/USDT')
        timeframe = data.get('timeframe', '1h')
        limit = int(data.get('limit', 1000))
        
        # Model parameters
        actor_layers = data.get('actor_layers', [64, 32])
        critic_layers = data.get('critic_layers', [64, 32])
        learning_rate = float(data.get('learning_rate', 0.001))
        batch_size = int(data.get('batch_size', 64))
        epochs = int(data.get('epochs', 50))
        
        # Start training in a separate thread
        def train_thread():
            global prediction_model, training_status
            
            try:
                # Update training status
                training_status = {
                    'is_training': True,
                    'progress': 0,
                    'start_time': datetime.now().isoformat(),
                    'end_time': None,
                    'error': None
                }
                
                # Fetch data
                df = trading_module.fetch_market_data(exchange_id, symbol, timeframe, limit)
                
                if df is None:
                    training_status['is_training'] = False
                    training_status['error'] = f"Failed to fetch data from {exchange_id} for {symbol}"
                    return
                
                # Add technical indicators
                df = data_processor.add_technical_indicators(df)
                
                # Create target variable
                target_type = data.get('target_type', 'binary')
                horizon = int(data.get('horizon', 24))
                df = data_processor.create_target(df, target_type, horizon)
                
                # Select features
                features = data.get('features', None)
                if not features:
                    # Use all numeric columns except target
                    features = [col for col in df.columns if col != 'target' and pd.api.types.is_numeric_dtype(df[col])]
                
                # Prepare data
                X_train, X_val, X_test, y_train, y_val, y_test = data_processor.prepare_data(
                    df, features, 'target', scale=True
                )
                
                # Initialize or reset model
                state_dim = X_train.shape[2]  # Number of features
                action_dim = 1  # Predict buy/sell/hold
                
                prediction_model = DDPGPredictionModel(
                    state_dim=state_dim,
                    action_dim=action_dim,
                    actor_layers=actor_layers,
                    critic_layers=critic_layers,
                    learning_rate=learning_rate
                )
                
                # Train model
                history = prediction_model.train(
                    X_train, y_train, X_val, y_val,
                    batch_size=batch_size,
                    epochs=epochs,
                    callbacks=[
                        # Custom callback to update progress
                        lambda epoch, logs: update_training_progress(epoch, epochs, logs)
                    ]
                )
                
                # Evaluate model
                test_loss, test_accuracy = prediction_model.evaluate(X_test, y_test)
                
                # Save model
                model_path = os.path.join(os.path.dirname(__file__), 'models', 'ddpg_model')
                prediction_model.save(model_path)
                
                # Update training status
                training_status['is_training'] = False
                training_status['progress'] = 100
                training_status['end_time'] = datetime.now().isoformat()
                training_status['test_loss'] = test_loss
                training_status['test_accuracy'] = test_accuracy
                
                logger.info(f"Model training completed. Test accuracy: {test_accuracy}")
                
            except Exception as e:
                logger.error(f"Error training model: {e}")
                training_status['is_training'] = False
                training_status['error'] = str(e)
        
        # Start training thread
        threading.Thread(target=train_thread).start()
        
        return jsonify({
            'status': 'ok',
            'message': 'Model training started',
            'training_status': training_status
        })
        
    except Exception as e:
        logger.error(f"Error starting model training: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

def update_training_progress(epoch, total_epochs, logs=None):
    """Update the training progress."""
    global training_status
    
    progress = int((epoch + 1) / total_epochs * 100)
    training_status['progress'] = progress
    
    if logs:
        for key, value in logs.items():
            training_status[key] = value

@prediction_api.route('/predict', methods=['POST'])
def predict():
    """Generate predictions using the trained model."""
    global prediction_model
    
    try:
        if prediction_model is None:
            return jsonify({
                'status': 'error',
                'message': 'Model not initialized'
            }), 400
        
        data = request.get_json()
        
        # Required parameters
        exchange_id = data.get('exchange_id', 'binance')
        symbol = data.get('symbol', 'BTC/USDT')
        timeframe = data.get('timeframe', '1h')
        limit = int(data.get('limit', 100))
        
        # Fetch data
        df = trading_module.fetch_market_data(exchange_id, symbol, timeframe, limit)
        
        if df is None:
            return jsonify({
                'status': 'error',
                'message': f"Failed to fetch data from {exchange_id} for {symbol}"
            }), 400
        
        # Add technical indicators
        df = data_processor.add_technical_indicators(df)
        
        # Select features
        features = data.get('features', None)
        if not features:
            # Use all numeric columns
            features = [col for col in df.columns if pd.api.types.is_numeric_dtype(df[col])]
        
        # Scale features
        df_scaled = data_processor.scale_features(df, features, fit=False)
        
        # Prepare sequence
        X = np.array([df_scaled[features].values[-data_processor.sequence_length:]])
        
        # Generate prediction
        prediction = prediction_model.predict(X)
        
        # Get trading signal
        signal, confidence = prediction_model.get_trading_signal(X)
        
        signal_map = {
            -1: "SELL",
            0: "HOLD",
            1: "BUY"
        }
        
        return jsonify({
            'status': 'ok',
            'prediction': float(prediction[0][0]),
            'signal': int(signal),
            'signal_text': signal_map.get(int(signal), "UNKNOWN"),
            'confidence': float(confidence),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error generating prediction: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@prediction_api.route('/execute_signal', methods=['POST'])
def execute_signal_api():
    """Execute a trading signal."""
    try:
        data = request.get_json()
        
        # Required parameters
        exchange_id = data.get('exchange_id')
        symbol = data.get('symbol')
        signal = int(data.get('signal'))
        confidence = float(data.get('confidence', 0.5))
        amount = data.get('amount')
        
        if amount is not None:
            amount = float(amount)
        
        if not exchange_id or not symbol:
            return jsonify({
                'status': 'error',
                'message': 'exchange_id and symbol are required'
            }), 400
        
        # Execute signal
        order = trading_module.execute_signal(exchange_id, symbol, signal, confidence, amount)
        
        if order is None:
            return jsonify({
                'status': 'error',
                'message': 'Failed to execute signal'
            }), 400
        
        return jsonify({
            'status': 'ok',
            'order': order
        })
        
    except Exception as e:
        logger.error(f"Error executing signal: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@prediction_api.route('/exchanges', methods=['GET'])
def get_exchanges():
    """Get the list of available exchanges."""
    try:
        # Get exchange statuses
        statuses = trading_module.get_all_exchange_statuses()
        
        # Get all CCXT exchanges
        all_exchanges = ccxt.exchanges
        
        return jsonify({
            'status': 'ok',
            'configured_exchanges': statuses,
            'available_exchanges': all_exchanges
        })
        
    except Exception as e:
        logger.error(f"Error getting exchanges: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@prediction_api.route('/configure_exchange', methods=['POST'])
def configure_exchange():
    """Configure an exchange."""
    try:
        data = request.get_json()
        
        # Required parameters
        exchange_id = data.get('exchange_id')
        api_key = data.get('api_key', '')
        secret = data.get('secret', '')
        
        if not exchange_id:
            return jsonify({
                'status': 'error',
                'message': 'exchange_id is required'
            }), 400
        
        # Add exchange
        success = trading_module.add_exchange(exchange_id, api_key, secret)
        
        if not success:
            return jsonify({
                'status': 'error',
                'message': f"Failed to configure exchange {exchange_id}"
            }), 400
        
        return jsonify({
            'status': 'ok',
            'message': f"Exchange {exchange_id} configured successfully"
        })
        
    except Exception as e:
        logger.error(f"Error configuring exchange: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@prediction_api.route('/remove_exchange', methods=['POST'])
def remove_exchange():
    """Remove an exchange."""
    try:
        data = request.get_json()
        
        # Required parameters
        exchange_id = data.get('exchange_id')
        
        if not exchange_id:
            return jsonify({
                'status': 'error',
                'message': 'exchange_id is required'
            }), 400
        
        # Remove exchange
        success = trading_module.remove_exchange(exchange_id)
        
        if not success:
            return jsonify({
                'status': 'error',
                'message': f"Failed to remove exchange {exchange_id}"
            }), 400
        
        return jsonify({
            'status': 'ok',
            'message': f"Exchange {exchange_id} removed successfully"
        })
        
    except Exception as e:
        logger.error(f"Error removing exchange: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@prediction_api.route('/balance', methods=['GET'])
def get_balance():
    """Get account balance."""
    try:
        exchange_id = request.args.get('exchange_id')
        
        if not exchange_id:
            return jsonify({
                'status': 'error',
                'message': 'exchange_id is required'
            }), 400
        
        # Fetch balance
        balance = trading_module.fetch_balance(exchange_id)
        
        if balance is None:
            return jsonify({
                'status': 'error',
                'message': f"Failed to fetch balance for {exchange_id}"
            }), 400
        
        return jsonify({
            'status': 'ok',
            'balance': balance
        })
        
    except Exception as e:
        logger.error(f"Error getting balance: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@prediction_api.route('/open_orders', methods=['GET'])
def get_open_orders():
    """Get open orders."""
    try:
        exchange_id = request.args.get('exchange_id')
        symbol = request.args.get('symbol')
        
        if not exchange_id:
            return jsonify({
                'status': 'error',
                'message': 'exchange_id is required'
            }), 400
        
        # Fetch open orders
        orders = trading_module.fetch_open_orders(exchange_id, symbol)
        
        if orders is None:
            return jsonify({
                'status': 'error',
                'message': f"Failed to fetch open orders for {exchange_id}"
            }), 400
        
        return jsonify({
            'status': 'ok',
            'orders': orders
        })
        
    except Exception as e:
        logger.error(f"Error getting open orders: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@prediction_api.route('/create_order', methods=['POST'])
def create_order():
    """Create an order."""
    try:
        data = request.get_json()
        
        # Required parameters
        exchange_id = data.get('exchange_id')
        symbol = data.get('symbol')
        order_type = data.get('order_type')
        side = data.get('side')
        amount = data.get('amount')
        price = data.get('price')
        params = data.get('params', {})
        
        if not exchange_id or not symbol or not order_type or not side or amount is None:
            return jsonify({
                'status': 'error',
                'message': 'exchange_id, symbol, order_type, side, and amount are required'
            }), 400
        
        # Convert amount to float
        amount = float(amount)
        
        # Convert price to float if provided
        if price is not None:
            price = float(price)
        
        # Create order
        order = trading_module.create_order(exchange_id, symbol, order_type, side, amount, price, params)
        
        if order is None:
            return jsonify({
                'status': 'error',
                'message': f"Failed to create order"
            }), 400
        
        return jsonify({
            'status': 'ok',
            'order': order
        })
        
    except Exception as e:
        logger.error(f"Error creating order: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@prediction_api.route('/cancel_order', methods=['POST'])
def cancel_order():
    """Cancel an order."""
    try:
        data = request.get_json()
        
        # Required parameters
        exchange_id = data.get('exchange_id')
        order_id = data.get('order_id')
        symbol = data.get('symbol')
        
        if not exchange_id or not order_id:
            return jsonify({
                'status': 'error',
                'message': 'exchange_id and order_id are required'
            }), 400
        
        # Cancel order
        result = trading_module.cancel_order(exchange_id, order_id, symbol)
        
        if result is None:
            return jsonify({
                'status': 'error',
                'message': f"Failed to cancel order"
            }), 400
        
        return jsonify({
            'status': 'ok',
            'result': result
        })
        
    except Exception as e:
        logger.error(f"Error canceling order: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@prediction_api.route('/start_trading', methods=['POST'])
def start_trading():
    """Start the trading loop."""
    try:
        data = request.get_json()
        
        # Optional parameters
        interval_seconds = int(data.get('interval_seconds', 60))
        
        # Start trading
        trading_module.start_trading(interval_seconds)
        
        return jsonify({
            'status': 'ok',
            'message': 'Trading started'
        })
        
    except Exception as e:
        logger.error(f"Error starting trading: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@prediction_api.route('/stop_trading', methods=['POST'])
def stop_trading():
    """Stop the trading loop."""
    try:
        # Stop trading
        trading_module.stop_trading()
        
        return jsonify({
            'status': 'ok',
            'message': 'Trading stopped'
        })
        
    except Exception as e:
        logger.error(f"Error stopping trading: {e}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

def register_routes(app):
    """Register the prediction API routes with the Flask app."""
    app.register_blueprint(prediction_api, url_prefix='/api/prediction')
    logger.info("Registered prediction API routes")
