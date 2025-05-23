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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch portfolio data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in fetchTradingData:', error);
    throw error; // Re-throw to let the component handle it
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