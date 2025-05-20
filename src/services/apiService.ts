import axios from 'axios';
import { Cryptocurrency } from '../types';
import { format, parseISO, differenceInHours } from 'date-fns';

const CORS_PROXY = 'https://corsproxy.io/?';
const API_BASE = 'https://api.coingecko.com/api/v3';

const fetchWithRetry = async (url: string, retries = 3) => {
  try {
    const response = await axios.get(`${CORS_PROXY}${encodeURIComponent(url)}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-requested-with': 'XMLHttpRequest'
      },
      timeout: 10000
    });
    
    // Handle rate limiting
    if (response.status === 429) {
      if (retries > 0) {
        await new Promise(res => setTimeout(res, 2000));
        return fetchWithRetry(url, retries - 1);
      }
      throw new Error('API rate limit exceeded');
    }
    
    return response;
  } catch (error) {
    if (retries > 0) {
      await new Promise(res => setTimeout(res, 1000));
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
};

/**
 * Fetches new cryptocurrencies from both CoinMarketCap and Jupiter
 * @returns {Promise<Cryptocurrency[]>}
 */
export const fetchNewCryptocurrencies = async (): Promise<Cryptocurrency[]> => {
  try {
    const url = `${API_BASE}/coins/markets?${new URLSearchParams({
      vs_currency: 'usd',
      order: 'created_desc',
      per_page: '100',
      sparkline: 'true',
      price_change_percentage: '24h'
    })}`;

    const response = await fetchWithRetry(url);

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid response format: expected an array');
    }

    // Process and transform the data
    const tokens = response.data.map((token: any) => ({
      id: token.id,
      symbol: token.symbol,
      name: token.name,
      image: token.image,
      current_price: token.current_price,
      market_cap: token.market_cap,
      total_volume: token.total_volume,
      high_24h: token.high_24h,
      low_24h: token.low_24h,
      price_change_percentage_24h: token.price_change_percentage_24h,
      market_cap_change_percentage_24h: token.market_cap_change_percentage_24h,
      age_hours: differenceInHours(new Date(), parseISO(token.created_at || new Date().toISOString())),
      price_history: token.sparkline_in_7d?.price || [],
      meets_threshold: token.market_cap > 1500000 || token.total_volume > 1500000
    }));

    return tokens;
  } catch (error) {
    console.error('Failed to fetch cryptocurrencies after retries:', error);
    throw error;
  }
};