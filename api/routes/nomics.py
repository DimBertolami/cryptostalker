from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timedelta
from ..utils.nomics import NomicsAPI
from flask import Blueprint, jsonify, request
import requests

router = APIRouter(prefix="/api/nomics", tags=["nomics"])

@router.get("/market-data")
async def get_market_data(coins: str = 'BTC,ETH,SOL'):
    """Get current market data for specified coins"""
    try:
        nomics = NomicsAPI()
        return nomics.get_currencies_ticker(ids=coins.split(','))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/historical-prices/{currency}")
async def get_historical_prices(
    currency: str,
    days: int = 7,
    interval: str = '1d'
):
    """Get historical prices for a cryptocurrency"""
    try:
        end = datetime.now()
        start = end - timedelta(days=days)
        nomics = NomicsAPI()
        return nomics.get_historical_prices(
            currency=currency,
            start=start,
            end=end,
            interval=interval
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/exchange-rates")
async def get_exchange_rates():
    """Get current exchange rates"""
    try:
        nomics = NomicsAPI()
        return nomics.get_exchange_rates()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/coingecko/coins/markets")
async def get_coingecko_coins_markets(
    vs_currency: str = 'usd',
    order: str = 'market_cap_desc',
    per_page: int = 100,
    page: int = 1
):
    """Get current coins markets from CoinGecko API"""
    try:
        params = {
            'vs_currency': vs_currency,
            'order': order,
            'per_page': per_page,
            'page': page
        }
        response = requests.get(
            'https://api.coingecko.com/api/v3/coins/markets',
            params=params
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=str(e))
