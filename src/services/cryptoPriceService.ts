import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

// Store price history per symbol to create realistic price movements
interface PriceCache {
  lastPrice: number;
  trend: number; // -1 to 1, represents current price trend direction
  volatility: number; // 0.5 to 5, represents how volatile the price is
  lastUpdated: number;
}

const priceCache: Record<string, PriceCache> = {};

// Initialize price cache for a symbol with realistic starting values
const initializePriceCache = (symbol: string, initialPrice?: number): PriceCache => {
  // Each symbol gets a different base price and volatility
  const symbolHash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Generate a base price between 10 and 1000 based on the symbol
  const basePrice = initialPrice || (10 + (symbolHash % 990));
  
  // Generate volatility between 0.5% and 5% based on the symbol
  const volatility = 0.5 + ((symbolHash % 45) / 10);
  
  return {
    lastPrice: basePrice,
    trend: (Math.random() * 2) - 1, // Random initial trend between -1 and 1
    volatility: volatility,
    lastUpdated: Date.now()
  };
};

/**
 * Fetches the current price for a cryptocurrency by symbol
 * @param symbol The cryptocurrency symbol (e.g., BTC, ETH)
 * @param initialPrice Optional initial price to use if no price exists
 * @returns Promise with the current price
 */
export const fetchCurrentPrice = async (symbol: string, initialPrice?: number): Promise<number> => {
  try {
    // Try to get real price from API
    try {
      const response = await axios.get(`${API_BASE_URL}/price/${symbol}`);
      if (response.data && response.data.price) {
        return response.data.price;
      }
    } catch (apiError) {
      // API failed, continue with simulated price
      console.log(`API call failed for ${symbol}, using simulated price`);
    }
    
    // Initialize or get cached price data
    if (!priceCache[symbol]) {
      priceCache[symbol] = initializePriceCache(symbol, initialPrice);
    }
    
    const cache = priceCache[symbol];
    const now = Date.now();
    const timeDiff = now - cache.lastUpdated;
    
    // Occasionally change the trend direction (more likely the longer it's been in one direction)
    if (Math.random() < (timeDiff / 60000) * 0.2) { // 20% chance per minute to change trend
      cache.trend = (Math.random() * 2) - 1;
    }
    
    // Generate a realistic price movement based on trend and volatility
    const trendFactor = cache.trend * cache.volatility;
    const randomFactor = ((Math.random() * 2) - 1) * cache.volatility;
    
    // Combine trend and random factors (70% trend, 30% random)
    const percentChange = (trendFactor * 0.7 + randomFactor * 0.3);
    
    // Calculate new price with percentage change
    const newPrice = cache.lastPrice * (1 + percentChange / 100);
    
    // Update cache
    cache.lastPrice = newPrice;
    cache.lastUpdated = now;
    
    return newPrice;
  } catch (error) {
    console.error(`Error generating price for ${symbol}:`, error);
    
    // Fallback to a simple random price if everything fails
    return 100 * (1 + ((Math.random() * 10) - 5) / 100);
  }
};
