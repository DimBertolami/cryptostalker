import axios, { AxiosRequestConfig } from 'axios';

const API_BASE = import.meta.env.DEV 
    ? 'http://localhost:5001' 
    : window.location.origin;

interface Cryptocurrency {
    id: string;
    name: string;
    symbol: string;
    price: number;
    volume_24h: number;
    date_added: string;
}

const fetchWithRetry = async (url: string, config?: AxiosRequestConfig, retries = 3) => {
  try {
    const response = await axios.get(url, config);
    if (response.status === 429) {
        console.warn('Rate limited - waiting 60 seconds before retry');
        await new Promise(resolve => setTimeout(resolve, 60000));
        return fetchWithRetry(url, config, retries - 1);
    }
    return response;
  } catch (error: any) {
    if (error.response?.status === 429) {
        console.warn('Rate limited - waiting 60 seconds before retry');
        await new Promise(resolve => setTimeout(resolve, 60000));
        return fetchWithRetry(url, config, retries - 1);
    }
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, 1000));
    return fetchWithRetry(url, config, retries - 1);
  }
};

/**
 * Fetches new cryptocurrencies from both CoinMarketCap and Jupiter
 * @returns {Promise<Cryptocurrency[]>}
 */
export const fetchNewCryptocurrencies = async (): Promise<Cryptocurrency[]> => {
    try {
        const response = await fetchWithRetry(`${API_BASE}/api/cmc-proxy`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            params: {
                endpoint: 'cryptocurrency/listings/latest',
                start: '1',
                limit: '5000', // Increased to maximum supported by CoinMarketCap
                convert: 'USD'
            }
        });
        
        // Reduce console logging - just show API was successful
        console.log(`API fetched ${response.data.data.length} coins successfully from CoinMarketCap`);
        
        const data = response.data.data;

        if (response.status === 429) {
          throw new Error('API rate limit exceeded - try again later');
        }

        if (!data || !Array.isArray(data)) {
          console.error('Invalid API response structure:', response.data);
          throw new Error('Invalid cryptocurrency data format');
        }

        return data.map((coin: any) => {
          const addedDate = new Date(coin.date_added);
          const now = new Date();
          const ageHours = (now.getTime() - addedDate.getTime()) / (1000 * 60 * 60);
          
          return {
            id: coin.id.toString(),
            name: coin.name,
            symbol: coin.symbol,
            price: coin.quote.USD.price,
            current_price: coin.quote.USD.price, // Add this for the store filter
            age_hours: ageHours, // Add this for the store filter
            volume_24h: coin.quote.USD.volume_24h,
            market_cap: coin.quote.USD.market_cap, // Add market cap for high value filter
            date_added: coin.date_added
          };
        });
    } catch (error) {
        console.error('Error fetching cryptocurrencies:', error);
        throw error;
    }
};