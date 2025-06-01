"""
Prediction API Routes

Handles requests for cryptocurrency price predictions using advanced DL models.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
from datetime import datetime
import numpy as np
import pandas as pd

from src.advanced_dl_models import (
    build_transformer_model,
    build_hybrid_model,
    build_temporal_fusion_transformer
)
from src.data_preprocessor import prepare_prediction_data
from src.cmc import get_historical_data

router = APIRouter(
    prefix="/api/prediction",
    tags=["prediction"],
    responses={404: {"description": "Not found"}},
)

@router.get("/{symbol}")
async def get_prediction(
    symbol: str,
    model_type: str = "transformer",
    timeframe: str = "1h",
    prediction_length: int = 24
):
    """
    Get price predictions for a cryptocurrency symbol.
    
    Args:
        symbol: Cryptocurrency symbol (e.g. BTC, ETH)
        model_type: Type of model to use (transformer|hybrid|tft)
        timeframe: Timeframe for prediction (1h|4h|1d)
        prediction_length: Number of periods to predict ahead
    
    Returns:
        JSON with prediction results and metadata
    """
    try:
        # Get historical data
        df = await get_historical_data(symbol, timeframe)
        
        # Prepare data for model
        X, y, scaler = prepare_prediction_data(df)
        
        # Load appropriate model
        if model_type == "transformer":
            model = build_transformer_model(input_shape=X.shape[1:])
        elif model_type == "hybrid":
            model = build_hybrid_model(input_shape=X.shape[1:])
        elif model_type == "tft":
            model = build_temporal_fusion_transformer(input_shape=X.shape[1:])
        else:
            raise HTTPException(status_code=400, detail="Invalid model type")
        
        # Make prediction
        predictions = model.predict(X[-1:])  # Predict using most recent data
        predictions = scaler.inverse_transform(predictions)
        
        # Format response
        timestamps = pd.date_range(
            start=datetime.utcnow(),
            periods=prediction_length,
            freq=timeframe
        ).strftime('%Y-%m-%d %H:%M:%S').tolist()
        
        return JSONResponse({
            "symbol": symbol,
            "model_type": model_type,
            "timeframe": timeframe,
            "predictions": {
                "timestamps": timestamps,
                "prices": predictions.flatten().tolist()
            },
            "last_updated": datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
