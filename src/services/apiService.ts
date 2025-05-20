import axios from 'axios';
import { Cryptocurrency } from '../types';
import { format, parseISO, differenceInHours } from 'date-fns';

/**
 * Fetches new cryptocurrencies from both CoinMarketCap and Jupiter
 * @returns {Promise<Cryptocurrency[]>}
 */
import { withRetry } from '../utils/apiRetry';

export const fetchNewCryptocurrencies = async (): Promise<Cryptocurrency[]> => {
  try {
    // Use direct API call instead of Supabase function
    const response = await withRetry(() => 
      axios.get('https://api.coingecko.com/api/v3/coins/markets', {
        params: {
          vs_currency: 'usd',
          order: 'created_desc',
          per_page: 100,
          sparkline: true,
          price_change_percentage: '24h'
        },
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      })
    );

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
    console.error('Error fetching cryptocurrencies:', error);
    throw error;
  }
}