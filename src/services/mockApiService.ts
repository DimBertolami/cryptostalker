import { Cryptocurrency } from '../types';

// Sample cryptocurrency data for testing
const mockCryptoData: Cryptocurrency[] = [
  {
    id: '1',
    name: 'Bitcoin',
    symbol: 'BTC',
    current_price: 65000,
    volume_24h: 30000000000,
    market_cap: 1200000000000,
    total_volume: 35000000000,
    price_change_percentage_24h: 2.5,
    age_hours: 100000,
    date_added: '2013-04-28T00:00:00.000Z',
    price_history: [64000, 64500, 65000, 65200, 65000],
    consecutive_decreases: 0
  },
  {
    id: '1027',
    name: 'Ethereum',
    symbol: 'ETH',
    current_price: 3500,
    volume_24h: 15000000000,
    market_cap: 420000000000,
    total_volume: 18000000000,
    price_change_percentage_24h: 1.8,
    age_hours: 90000,
    date_added: '2015-08-07T00:00:00.000Z',
    price_history: [3400, 3450, 3480, 3500, 3520],
    consecutive_decreases: 0
  },
  {
    id: '5426',
    name: 'Solana',
    symbol: 'SOL',
    current_price: 150,
    volume_24h: 2000000000,
    market_cap: 65000000000,
    total_volume: 2500000000,
    price_change_percentage_24h: 3.2,
    age_hours: 30000,
    date_added: '2020-04-10T00:00:00.000Z',
    price_history: [145, 147, 148, 149, 150],
    consecutive_decreases: 0
  },
  {
    id: '3408',
    name: 'Jupiter',
    symbol: 'JUP',
    current_price: 1.25,
    volume_24h: 150000000,
    market_cap: 1500000000,
    total_volume: 180000000,
    price_change_percentage_24h: 5.7,
    age_hours: 10000,
    date_added: '2022-01-15T00:00:00.000Z',
    price_history: [1.15, 1.18, 1.20, 1.22, 1.25],
    consecutive_decreases: 0
  },
  {
    id: '5000',
    name: 'New Coin',
    symbol: 'NEW',
    current_price: 0.05,
    volume_24h: 5000000,
    market_cap: 50000000,
    total_volume: 6000000,
    price_change_percentage_24h: 15.3,
    age_hours: 12,
    date_added: new Date().toISOString(),
    price_history: [0.03, 0.035, 0.04, 0.045, 0.05],
    consecutive_decreases: 0
  }
];

/**
 * Mock function to fetch cryptocurrencies
 * @returns {Promise<Cryptocurrency[]>}
 */
export const fetchNewCryptocurrencies = async (): Promise<Cryptocurrency[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return mockCryptoData;
};

/**
 * Mock function to fetch a cryptocurrency by ID
 * @param {string} cryptoId - The ID of the cryptocurrency to fetch
 * @returns {Promise<Cryptocurrency | null>}
 */
export const fetchCryptoById = async (cryptoId: string): Promise<Cryptocurrency | null> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const crypto = mockCryptoData.find(c => c.id === cryptoId);
  return crypto || null;
};
