import os
from supabase import create_client, Client
from datetime import datetime
import logging

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

_client = None
logger = logging.getLogger(__name__)

def get_client():
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("Supabase URL and KEY must be set in environment variables")
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client

def get_model_status(exchange_id, symbol):
    supabase = get_client()
    response = supabase.table("model_status").select("*").eq("exchange_id", exchange_id).eq("symbol", symbol).single().execute()
    if response.data:
        return response.data
    return {
        "initialized": False,
        "last_training": None,
        "last_prediction": None,
        "error": None,
        "exchange_id": exchange_id,
        "symbol": symbol,
    }

def set_model_status(exchange_id, symbol, is_training, error=None):
    """Set model training status in Supabase with proper error handling"""
    supabase = get_client()
    data = {
        "exchange_id": exchange_id,
        "symbol": symbol,
        "is_training": is_training,
        "last_updated": datetime.now().isoformat(),
    }
    if error:
        data["error"] = str(error)[:255]  # Truncate long errors
        
    try:
        # First try to update existing record
        response = supabase.table("model_status")\
            .upsert(data)\
            .execute()
        return response
    except Exception as e:
        logger.warning(f"Failed to update model status: {str(e)}")
        return None
