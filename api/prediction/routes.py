"""
Prediction API Routes

This module implements the Flask routes for the prediction API.
It connects the SimpleDDPGModel with the API endpoints.
"""

from flask import Blueprint, jsonify, request, current_app as app
from .simple_prediction_model import SimpleDDPGModel
import numpy as np
import pandas as pd
import os
import json
import time
import matplotlib
import traceback
import logging
import random
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
from datetime import datetime
from flask_cors import cross_origin

# Create a blueprint for the prediction API
prediction_bp = Blueprint('prediction_api', __name__, url_prefix='/api/prediction')

# Set up logger
logger = logging.getLogger('prediction_api')
logger.setLevel(logging.DEBUG)

# Global variables to store model instances
models = {}
model_status = {
    "initialized": False,
    "last_training": None,
    "last_prediction": None,
    "error": None
}

# Create models directory if it doesn't exist
os.makedirs('models/ddpg', exist_ok=True)

@prediction_bp.route('/status', methods=['GET'])
@cross_origin()
def model_status_endpoint():
    try:
        logger.info("Status request received")
        response = {"status": "success", "model_info": model_status}
        logger.info(f"Returning status: {response}")
        return jsonify(response)
    except Exception as e:
        error_msg = f"Error getting model status: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        return jsonify({"status": "error", "error": error_msg}), 500

@prediction_bp.route('/initialize', methods=['POST', 'GET'])
@cross_origin()
def initialize_model():
    try:
        # Log request details for debugging
        logger.info(f"Initialize model request - Method: {request.method}, Args: {request.args}, JSON: {request.get_json(silent=True)}")
        
        if request.method == 'POST':
            data = request.get_json(silent=True) or {}
            exchange_id = data.get('exchange_id')
            symbol = data.get('symbol')
        else:  # GET
            exchange_id = request.args.get('exchange_id')
            symbol = request.args.get('symbol')
            
        logger.info(f"Initialize parameters - Exchange: {exchange_id}, Symbol: {symbol}")
            
        if not exchange_id or not symbol:
            error_msg = "Missing required parameters: exchange_id, symbol"
            logger.error(error_msg)
            return jsonify({"status": "error", "error": error_msg}), 400
            
        model_key = f"{exchange_id}_{symbol}"
        logger.info(f"Creating model with key: {model_key}")
        
        # Create model directory if it doesn't exist
        os.makedirs('models/ddpg', exist_ok=True)
        
        # Initialize the model
        try:
            models[model_key] = SimpleDDPGModel(state_dim=10, action_dim=1, save_dir='models/ddpg')
            model_status["initialized"] = True
            model_status["error"] = None
            
            response = {
                "status": "success", 
                "message": f"Model initialized for {exchange_id} {symbol}", 
                "model_key": model_key
            }
            logger.info(f"Model initialized successfully: {response}")
            return jsonify(response)
        except Exception as model_error:
            error_msg = f"Error creating model: {str(model_error)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            model_status["initialized"] = False
            model_status["error"] = error_msg
            return jsonify({"status": "error", "error": error_msg}), 500
        
    except Exception as e:
        error_msg = f"Error initializing model: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        model_status["initialized"] = False
        model_status["error"] = error_msg
        return jsonify({"status": "error", "error": error_msg}), 500

@prediction_bp.route('/train', methods=['POST'])
@cross_origin()
def train_model():
    try:
        data = request.get_json(silent=True) or {}
        logger.info(f"Train request received with data: {data}")
        
        exchange_id = data.get('exchange_id')
        symbol = data.get('symbol')
        epochs = data.get('epochs', 50)
        batch_size = data.get('batch_size', 64)
        
        if not exchange_id or not symbol:
            error_msg = "Missing required parameters: exchange_id, symbol"
            logger.error(error_msg)
            return jsonify({"status": "error", "error": error_msg}), 400
        
        model_key = f"{exchange_id}_{symbol}"
        logger.info(f"Looking for model with key: {model_key}")
        
        if model_key not in models:
            # Try to initialize the model if it doesn't exist
            logger.warning(f"Model {model_key} not found, attempting to initialize")
            try:
                models[model_key] = SimpleDDPGModel(state_dim=10, action_dim=1, save_dir='models/ddpg')
                logger.info(f"Successfully initialized model: {model_key}")
            except Exception as init_error:
                error_msg = f"Failed to initialize model: {str(init_error)}"
                logger.error(error_msg)
                logger.error(traceback.format_exc())
                return jsonify({"status": "error", "error": error_msg}), 500
        
        # Generate mock training data
        logger.info("Generating mock training data...")
        try:
            training_data = generate_mock_training_data()
            logger.info(f"Generated training data with shape: {training_data.shape if hasattr(training_data, 'shape') else 'unknown'}")
        except Exception as data_error:
            error_msg = f"Error generating training data: {str(data_error)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            return jsonify({"status": "error", "error": error_msg}), 500
        
        # Train the model
        logger.info(f"Training model with {epochs} epochs and batch size {batch_size}...")
        try:
            history = models[model_key].train(training_data, epochs=epochs, batch_size=batch_size)
            logger.info("Model training completed")
        except Exception as train_error:
            error_msg = f"Error during model training: {str(train_error)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            return jsonify({"status": "error", "error": error_msg}), 500
        
        # Create directory for plots if it doesn't exist
        os.makedirs('static/plots', exist_ok=True)
        
        # Save training history plot
        try:
            logger.info("Saving training plot...")
            save_training_plot(history, model_key)
            logger.info("Training plot saved")
        except Exception as plot_error:
            logger.warning(f"Could not save training plot: {str(plot_error)}")
            # Continue even if plot saving fails
        
        # Update status
        model_status["last_training"] = datetime.now().isoformat()
        
        response = {
            "status": "success", 
            "message": f"Model trained for {exchange_id} {symbol}",
            "epochs_completed": epochs,
            "final_loss": float(history['loss'][-1]) if history and 'loss' in history and history['loss'] else None
        }
        logger.info(f"Returning training response: {response}")
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"Error training model: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        return jsonify({"status": "error", "error": error_msg}), 500

@prediction_bp.route('/predict', methods=['POST'])
@cross_origin()
def predict():
    try:
        data = request.get_json(silent=True) or {}
        logger.info(f"Predict request received with data: {data}")
        
        exchange_id = data.get('exchange_id')
        symbol = data.get('symbol')
        market_state = data.get('market_state')
        
        if not exchange_id or not symbol or not market_state:
            error_msg = "Missing required parameters: exchange_id, symbol, or market_state"
            logger.error(error_msg)
            return jsonify({"status": "error", "error": error_msg}), 400
        
        model_key = f"{exchange_id}_{symbol}"
        logger.info(f"Looking for model with key: {model_key}")
        
        if model_key not in models:
            # Try to initialize the model if it doesn't exist
            logger.warning(f"Model {model_key} not found, attempting to initialize")
            try:
                models[model_key] = SimpleDDPGModel(state_dim=10, action_dim=1, save_dir='models/ddpg')
                logger.info(f"Successfully initialized model: {model_key}")
            except Exception as init_error:
                error_msg = f"Failed to initialize model: {str(init_error)}"
                logger.error(error_msg)
                logger.error(traceback.format_exc())
                return jsonify({"status": "error", "error": error_msg}), 500
        
        # Convert market_state to numpy array
        try:
            market_state = np.array(market_state, dtype=np.float32)
            logger.info(f"Market state shape: {market_state.shape}")
        except Exception as array_error:
            error_msg = f"Error converting market state to array: {str(array_error)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            return jsonify({"status": "error", "error": error_msg}), 400
        
        # Get prediction
        logger.info("Making prediction...")
        try:
            signal = models[model_key].predict_signal(market_state)
            logger.info(f"Prediction signal: {signal}")
        except Exception as predict_error:
            error_msg = f"Error making prediction: {str(predict_error)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            return jsonify({"status": "error", "error": error_msg}), 500
        
        # Update status
        model_status["last_prediction"] = datetime.now().isoformat()
        
        # Map signal to action
        action_map = {1: "BUY", -1: "SELL", 0: "HOLD"}
        action = action_map[signal]
        
        response = {
            "status": "success", 
            "prediction": {
                "signal": int(signal),  # Ensure signal is serializable
                "action": action,
                "confidence": 0.85,  # Mock confidence level
                "timestamp": datetime.now().isoformat()
            }
        }
        logger.info(f"Returning prediction: {response}")
        return jsonify(response)
        
    except Exception as e:
        error_msg = f"Error making prediction: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        return jsonify({"status": "error", "error": error_msg}), 500

@prediction_bp.route('/chart-data', methods=['GET'])
@cross_origin()
def get_chart_data():
    import traceback
    from flask import current_app
    from api.prediction import alpaca_integration
    try:
        exchange_id = request.args.get('exchange_id')
        symbol = request.args.get('symbol')
        timeframe = request.args.get('timeframe', '1h')
        limit = request.args.get('limit', 100)

        logger.info(f"Chart data request - exchange_id: {exchange_id}, symbol: {symbol}, timeframe: {timeframe}, limit: {limit}")

        if not symbol:
            error_msg = "Missing required parameter: symbol"
            logger.error(error_msg)
            return jsonify({"status": "error", "error": error_msg}), 400

        chart_data = []
        used_source = None
        try:
            # Use Alpaca as default if exchange_id is 'alpaca' or not provided
            if not exchange_id or exchange_id.lower() == 'alpaca':
                logger.info(f"Fetching chart data from Alpaca for {symbol} {timeframe} limit={limit}")
                chart_data = alpaca_integration.fetch_alpaca_ohlcv(symbol, timeframe=timeframe, limit=int(limit))
                used_source = 'alpaca'
            else:
                # Fallback to CCXT
                import ccxt
                if not hasattr(ccxt, exchange_id):
                    error_msg = f"Exchange {exchange_id} not supported by CCXT"
                    logger.error(error_msg)
                    return jsonify({"status": "error", "error": error_msg}), 400
                exchange_class = getattr(ccxt, exchange_id)
                exchange = exchange_class({'enableRateLimit': True})
                if not exchange.has['fetchOHLCV']:
                    error_msg = f"Exchange {exchange_id} does not support OHLCV data"
                    logger.error(error_msg)
                    return jsonify({"status": "error", "error": error_msg}), 400
                logger.info(f"Fetching OHLCV data from {exchange_id} for {symbol} on {timeframe} timeframe")
                ohlcv = exchange.fetch_ohlcv(symbol, timeframe, limit=int(limit))
                for candle in ohlcv:
                    timestamp, open_price, high, low, close, volume = candle
                    chart_data.append({
                        "timestamp": timestamp,
                        "open": float(open_price),
                        "high": float(high),
                        "low": float(low),
                        "close": float(close),
                        "volume": float(volume)
                    })
                logger.info(f"Fetched {len(chart_data)} OHLCV data points from {exchange_id}")
                used_source = exchange_id
        except Exception as data_error:
            error_msg = f"Error fetching chart data from {'Alpaca' if used_source == 'alpaca' else exchange_id}: {str(data_error)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            return jsonify({"status": "error", "error": error_msg}), 500

        logger.info(f"Returning chart data response with {len(chart_data)} data points from {used_source or exchange_id}")
        return jsonify(chart_data)
    except Exception as e:
        error_msg = f"Error generating chart data: {str(e)} | Params: exchange_id={request.args.get('exchange_id')}, symbol={request.args.get('symbol')}, timeframe={request.args.get('timeframe')}, limit={request.args.get('limit')}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        return jsonify({"status": "error", "error": error_msg}), 500

# Helper functions
def generate_mock_training_data():
    """Generate mock training data for the model."""
    # Generate 1000 random market states
    states = np.random.rand(1000, 10) * 2 - 1  # Values between -1 and 1
    return states

def save_training_plot(history, model_key):
    """Save a plot of the training history."""
    if not history or 'loss' not in history:
        return
    
    # Create directory if it doesn't exist
    os.makedirs('static/plots', exist_ok=True)
    
    plt.figure(figsize=(10, 6))
    plt.plot(history['loss'])
    plt.title(f'Training Loss for {model_key}')
    plt.ylabel('Loss')
    plt.xlabel('Epoch')
    plt.savefig(f'static/plots/{model_key}_training.png')
    plt.close()

# The generate_mock_chart_data function has been removed in favor of real-time data from CCXT
