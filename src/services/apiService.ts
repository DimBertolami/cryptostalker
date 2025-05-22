import axios, { AxiosRequestConfig } from 'axios';

// Ensure API_BASE is always set for development
const API_BASE = 'http://localhost:5001';

interface Cryptocurrency {
    id: string;
    name: string;
    symbol: string;
    price: number;
    current_price?: number;
    volume_24h: number;
    market_cap?: number;
    price_change_percentage_24h?: number;
    age_hours?: number;
    date_added: string;
}

const fetchWithRetry = async (url: string, config?: AxiosRequestConfig, retries = 3) => {
  try {
    // Add health check before making the actual request
    try {
      await axios.get(`${API_BASE}/api/health`, { timeout: 5000 });
    } catch (error) {
      console.error('Backend server is not responding to health check');
      throw new Error('Backend server is not available');
    }

    const response = await axios.get(url, {
      ...config,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...config?.headers
      },
      timeout: 10000 // 10 second timeout
    });
    
    if (response.status === 429) {
        console.warn('Rate limited - waiting 60 seconds before retry');
        await new Promise(resolve => setTimeout(resolve, 60000));
        return fetchWithRetry(url, config, retries - 1);
    }
    return response;
  } catch (error: any) {
    console.error('Network request failed:', error.message);
    
    if (error.response?.status === 429) {
        console.warn('Rate limited - waiting 60 seconds before retry');
        await new Promise(resolve => setTimeout(resolve, 60000));
        return fetchWithRetry(url, config, retries - 1);
    }
    
    if (retries <= 0) throw error;
    
    const delay = 1000 * (4 - retries); // Exponential backoff
    console.log(`Retrying in ${delay/1000} seconds...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return fetchWithRetry(url, config, retries - 1);
  }
};

/**
 * Fetches new cryptocurrencies from both CoinMarketCap and Jupiter
 * @returns {Promise<Cryptocurrency[]>}
 */
export const fetchCryptoById = async (cryptoId: string): Promise<Cryptocurrency | null> => {
    try {
        const response = await fetchWithRetry(`${API_BASE}/api/cmc-proxy`, {
            params: {
                endpoint: 'cryptocurrency/quotes/latest',
                id: cryptoId,
                convert: 'USD'
            }
        });
        
        if (response.status === 429) {
            throw new Error('API rate limit exceeded - try again later');
        }

        if (!response.data || !response.data.data) {
            console.error('Invalid API response structure:', response.data);
            throw new Error('Invalid cryptocurrency data format');
        }
        
        // The response structure is different for quotes endpoint
        const coin = response.data.data[cryptoId];
        if (!coin) {
            console.error('Coin not found in response');
            return null;
        }
        
        const addedDate = new Date(coin.date_added);
        const now = new Date();
        const ageHours = (now.getTime() - addedDate.getTime()) / (1000 * 60 * 60);
        
        return {
            id: coin.id.toString(),
            name: coin.name,
            symbol: coin.symbol,
            price: coin.quote.USD.price,
            current_price: coin.quote.USD.price,
            age_hours: ageHours,
            volume_24h: coin.quote.USD.volume_24h,
            market_cap: coin.quote.USD.market_cap,
            price_change_percentage_24h: coin.quote.USD.percent_change_24h,
            date_added: coin.date_added
        };
    } catch (error) {
        console.error('Error fetching cryptocurrency by ID:', error);
        return null;
    }
};

export const fetchNewCryptocurrencies = async (): Promise<Cryptocurrency[]> => {
    try {
        const response = await fetchWithRetry(`${API_BASE}/api/new-cryptos`);
        
        if (!response.data || !Array.isArray(response.data)) {
            console.error('Invalid API response structure:', response.data);
            throw new Error('Invalid cryptocurrency data format');
        }

        return response.data.map((coin: any) => {
            const addedDate = new Date(coin.date_added);
            const now = new Date();
            const ageHours = (now.getTime() - addedDate.getTime()) / (1000 * 60 * 60);
            
            return {
                id: coin.id.toString(),
                name: coin.name,
                symbol: coin.symbol,
                price: coin.price || coin.current_price,
                current_price: coin.current_price || coin.price,
                age_hours: ageHours,
                volume_24h: coin.volume_24h,
                market_cap: coin.market_cap,
                price_change_percentage_24h: coin.price_change_percentage_24h,
                date_added: coin.date_added
            };
        });
    } catch (error) {
        console.error('Error fetching cryptocurrencies:', error);
        throw error;
    }
};