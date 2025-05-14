import axios from 'axios';
import { Cryptocurrency } from '../types';
import { format, parseISO, differenceInHours } from 'date-fns';

// Simulated data for testing
const MOCK_NEW_CRYPTOS = false;

/**
 * Fetches new cryptocurrencies from CoinGecko API
 * @returns {Promise<Cryptocurrency[]>}
 */
export const fetchNewCryptocurrencies = async (): Promise<Cryptocurrency[]> => {
  try {
    // Using CoinGecko API to get cryptocurrency data
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/coins/markets', 
      {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: 250,
          page: 1,
          sparkline: false,
          price_change_percentage: '24h'
        }
      }
    );

    // Process the data to identify new cryptos (< 24h old)
    let cryptos = response.data as Cryptocurrency[];
    
    // For demo purposes, we'll simulate that some cryptocurrencies are new
    if (MOCK_NEW_CRYPTOS) {
      return simulateNewCryptos(cryptos);
    }
    
    // In a real application, we would need to track when each crypto was first detected
    // For now, we'll use a random subset to simulate "new" cryptos
    const now = new Date();
    
    // We can't actually determine age from CoinGecko API directly
    // In a real app, you would maintain a database of when you first saw each coin
    // For demo purposes, we'll just tag random coins as "new"
    cryptos = cryptos.map(crypto => {
      // Simulating an age for each cryptocurrency
      const randomHoursAgo = Math.floor(Math.random() * 100); // Random hours 0-99
      const createdAt = new Date(now.getTime() - (randomHoursAgo * 60 * 60 * 1000)).toISOString();
      
      return {
        ...crypto,
        created_at: createdAt,
        age_hours: randomHoursAgo,
        meets_threshold: crypto.market_cap > 1500000 || crypto.total_volume > 1500000
      };
    });
    
    return cryptos;
  } catch (error) {
    console.error('Error fetching cryptocurrencies:', error);
    throw error;
  }
};

/**
 * Simulates new cryptocurrencies for testing
 * @param cryptos Base cryptocurrency data
 * @returns Processed cryptocurrency data with simulated new coins
 */
const simulateNewCryptos = (cryptos: Cryptocurrency[]): Cryptocurrency[] => {
  const now = new Date();
  
  return cryptos.map((crypto, index) => {
    // Make the first 10 cryptos appear as "new" for demonstration
    const isNew = index < 10;
    const randomHoursAgo = isNew ? Math.floor(Math.random() * 23) : 24 + Math.floor(Math.random() * 100);
    const createdAt = new Date(now.getTime() - (randomHoursAgo * 60 * 60 * 1000)).toISOString();
    
    // Randomly mark some as meeting the volume threshold
    const meetsThreshold = isNew && (index < 5 || Math.random() > 0.7);
    
    return {
      ...crypto,
      created_at: createdAt,
      age_hours: randomHoursAgo,
      meets_threshold: meetsThreshold,
      // Add some price history for demonstration
      price_history: [
        crypto.current_price * 0.95,
        crypto.current_price * 0.97,
        crypto.current_price * 0.99,
        crypto.current_price
      ],
      consecutive_decreases: 0
    };
  });
};