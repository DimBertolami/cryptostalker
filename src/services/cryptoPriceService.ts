import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';



/**
 * Fetches the current price for a cryptocurrency by symbol
 * @param symbol The cryptocurrency symbol (e.g., BTC, ETH)
 * @param initialPrice Optional initial price to use if no price exists
 * @returns Promise with the current price
 */
export const fetchCurrentPrice = async (symbol: string): Promise<number | null> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/price/${symbol}`);
    if (response.data && typeof response.data.price === 'number') {
      return response.data.price;
    } else {
      console.error(`Invalid price data received for ${symbol}:`, response.data);
      // Optionally, you could throw an error here to be caught by the caller
      // throw new Error(`Invalid price data for ${symbol}`);
      return null; // Or undefined, or handle as an error state in calling component
    }
  } catch (error) {
    // Log the error for debugging. The error might be from Axios (network error)
    // or from the backend (e.g., 404, 500).
    if (axios.isAxiosError(error)) {
      console.error(`API call failed for ${symbol}: ${error.message}`, error.response?.data);
    } else {
      console.error(`Error fetching price for ${symbol}:`, error);
    }
    // Optionally, re-throw the error if the caller should handle it
    // throw error;
    return null; // Or undefined, indicating failure
  }
};
