import axios from 'axios';
import { Cryptocurrency } from '../types';
import { format, parseISO, differenceInHours } from 'date-fns';

/**
 * Fetches new cryptocurrencies from both CoinMarketCap and Jupiter
 * @returns {Promise<Cryptocurrency[]>}
 */
export const fetchNewCryptocurrencies = async (): Promise<Cryptocurrency[]> => {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-tokens`,
      {
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const tokens = await response.json();

    // Process and return the tokens
    return tokens.map((token: any) => ({
      ...token,
      image: `https://assets.coincap.io/assets/icons/${token.symbol.toLowerCase()}@2x.png`,
    }));
  } catch (error) {
    console.error('Error fetching cryptocurrencies:', error);
    throw error;
  }
};