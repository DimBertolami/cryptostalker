import { TradeableCrypto } from '../types';

const API_BASE_URL = '/api/trading'; // Update this with your actual API endpoint

export interface PortfolioItem {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  balance: number;
  averageBuyPrice: number;
  purchaseTimestamp: number;
}

export const fetchTradingData = async (): Promise<PortfolioItem[]> => {
  try {
    console.log('Fetching trading data...');
    const response = await fetch('http://localhost:5001/api/trading/portfolio');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching trading data:', error);
    throw error;
  }
};

export const fetchPriceHistory = async (symbol: string): Promise<{ timestamp: number; price: number }[]> => {
  try {
    console.log(`Fetching price history for ${symbol}...`);
    const response = await fetch(`http://localhost:5001/api/trading/history/${symbol}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server responded with:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Received price history for ${symbol}:`, data);
    return data;
  } catch (error) {
    console.error(`Error in fetchPriceHistory for ${symbol}:`, error);
    throw error;
  }
};