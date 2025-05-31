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



// Helper: Fetch new coins from CoinGecko
export const fetchNewCoinsFromCoinGecko = async (): Promise<Cryptocurrency[]> => {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
            params: {
                vs_currency: 'usd',
                order: 'market_cap_desc',
                per_page: 250,
                page: 1,
                sparkline: false,
                price_change_percentage: '24h'
            }
        });
        if (!Array.isArray(response.data)) {
            console.error('CoinGecko: Unexpected response format', response.data);
            throw new Error('CoinGecko: Unexpected response format');
        }
        // Map CoinGecko data to Cryptocurrency interface
        const now = new Date();
        return response.data.map((coin: any) => {
            const addedDate = coin.atl_date ? new Date(coin.atl_date) : now;
            const ageHours = (now.getTime() - addedDate.getTime()) / (1000 * 60 * 60);
            return {
                id: coin.id,
                name: coin.name,
                symbol: coin.symbol,
                price: coin.current_price,
                current_price: coin.current_price,
                volume_24h: coin.total_volume ?? 0,
                market_cap: coin.market_cap ?? 0,
                price_change_percentage_24h: coin.price_change_percentage_24h ?? 0,
                age_hours: ageHours,
                date_added: coin.atl_date || now.toISOString(),
            };
        });
    } catch (error) {
        console.error('Error fetching from CoinGecko:', error);
        throw error;
    }
};

export const fetchNewCryptocurrencies = async (): Promise<Cryptocurrency[]> => {
    // Directly fetch from CoinGecko; Alpaca proxy logic removed
    return await fetchNewCoinsFromCoinGecko();
};