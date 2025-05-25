import axios, { AxiosRequestConfig } from 'axios';

// Use the direct URL to the API server
const API_BASE_URL = 'http://localhost:5001/api';

// Configure axios defaults
axios.defaults.withCredentials = false;

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
export const fetchCryptoById = async (cryptoId: string): Promise<Cryptocurrency | null> => {
    try {
        const response = await fetchWithRetry(`${API_BASE_URL}/cmc-proxy`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
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
        // Fetch data from CoinMarketCap, specifically requesting newest coins first
        const response = await fetchWithRetry(`${API_BASE_URL}/cmc-proxy`, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            params: {
                endpoint: 'cryptocurrency/listings/latest',
                start: '1',
                limit: '5000', // Use maximum limit to get all available coins
                convert: 'USD',
                sort: 'date_added', // Sort by date_added to get newest coins first
                sort_dir: 'desc' // Descending order (newest first)
            }
        });
        
        // Check if the response contains data
        if (!response.data || !response.data.data) {
            console.error('Invalid API response structure:', response.data);
            throw new Error('Invalid API response structure');
        }
        
        const data = response.data.data;
        
        // Log what we found
        console.log(`API fetched ${data.length} coins from CoinMarketCap`);
        
        if (response.status === 429) {
          throw new Error('API rate limit exceeded - try again later');
        }

        if (!data || !Array.isArray(data)) {
          console.error('Invalid API response structure:', response.data);
          throw new Error('Invalid cryptocurrency data format');
        }

        // Process the data
        const processedData = data.map((coin: any) => {
          const addedDate = new Date(coin.date_added);
          const now = new Date();
          const ageHours = (now.getTime() - addedDate.getTime()) / (1000 * 60 * 60);
          
          return {
            id: coin.id.toString(),
            name: coin.name,
            symbol: coin.symbol,
            price: coin.quote.USD.price,
            current_price: coin.quote.USD.price,
            age_hours: ageHours, // This is crucial for filtering new coins
            volume_24h: coin.quote.USD.volume_24h,
            market_cap: coin.quote.USD.market_cap,
            price_change_percentage_24h: coin.quote.USD.percent_change_24h,
            date_added: coin.date_added
          };
        });
        
        // Log how many new coins we found (less than 24 hours old)
        const newCoinsCount = processedData.filter(coin => coin.age_hours < 24).length;
        console.log(`Found ${newCoinsCount} coins less than 24 hours old`);
        
        return processedData;
    } catch (error) {
        console.error('Error fetching cryptocurrencies:', error);
        throw error; // Throw the error instead of returning fallback data
    }
};