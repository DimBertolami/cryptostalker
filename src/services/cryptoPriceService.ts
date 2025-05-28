import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';



/**
 * Fetches the current price for a cryptocurrency by symbol
 * @param symbol The cryptocurrency symbol (e.g., BTC, ETH)
 * @param initialPrice Optional initial price to use if no price exists
 * @returns Promise with the current price
 */
export const fetchCurrentPrice = async (
  symbol: string,
  fetchSource: 'coinmarketcap' | 'coingecko' = 'coinmarketcap'
): Promise<number | null> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/price/${symbol}`, {
      params: { source: fetchSource }
    });
    if (response.data && typeof response.data.price === 'number') {
      return response.data.price;
    } else {
      console.error(`Invalid price data received for ${symbol}:`, response.data);
      return null;
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`API call failed for ${symbol}: ${error.message}`, error.response?.data);
    } else {
      console.error(`Error fetching price for ${symbol}:`, error);
    }
    return null;
  }
};
