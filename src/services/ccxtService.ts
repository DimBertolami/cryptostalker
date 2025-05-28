import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api/ccxt';

// Types for CCXT API responses
export interface Balance {
  total: Record<string, number>;
  free: Record<string, number>;
  used: Record<string, number>;
  timestamp: number;
  datetime: string;
}

export interface BalanceResponse {
  exchange_id: string;
  balance: Balance;
}

export interface Order {
  id: string;
  symbol: string;
  type: 'market' | 'limit';
  side: 'buy' | 'sell';
  price: number;
  amount: number;
  cost?: number;
  status: string;
  timestamp: number;
  datetime: string;
  [key: string]: any; // For other exchange-specific fields
}

export interface OrderResponse {
  exchange_id: string;
  order: Order;
}

export interface OpenOrdersResponse {
  exchange_id: string;
  symbol: string;
  open_orders: Order[];
}

export interface CancelOrderResponse {
  exchange_id: string;
  order_id: string;
  result: any;
}

/**
 * Fetch account balance from an exchange
 * @param exchangeId The exchange ID (e.g., 'binance', 'bitvavo')
 * @returns Promise with the account balance
 */
export const fetchExchangeBalance = async (exchangeId: string): Promise<BalanceResponse> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/balance`, {
      params: { exchange_id: exchangeId },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-User-Id': localStorage.getItem('userId') || '' // Add user ID from local storage
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching balance for ${exchangeId}:`, error);
    throw error;
  }
};

/**
 * Create a new order on an exchange
 * @param exchangeId The exchange ID (e.g., 'binance', 'bitvavo')
 * @param symbol Trading pair symbol (e.g., 'BTC/USDT')
 * @param type Order type ('market' or 'limit')
 * @param side Order side ('buy' or 'sell')
 * @param amount Amount of base currency to trade
 * @param price Price for limit orders (optional for market orders)
 * @param params Additional exchange-specific parameters (optional)
 * @returns Promise with the created order
 */
export const createOrder = async (
  exchangeId: string,
  symbol: string,
  type: 'market' | 'limit',
  side: 'buy' | 'sell',
  amount: number,
  price?: number,
  params?: Record<string, any>
): Promise<OrderResponse> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/create_order`, {
      exchange_id: exchangeId,
      symbol,
      type,
      side,
      amount,
      price,
      params
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-User-Id': localStorage.getItem('userId') || '' // Add user ID from local storage
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error creating order on ${exchangeId}:`, error);
    throw error;
  }
};

/**
 * Fetch open orders from an exchange
 * @param exchangeId The exchange ID (e.g., 'binance', 'bitvavo')
 * @param symbol Optional trading pair symbol to filter orders (e.g., 'BTC/USDT')
 * @returns Promise with the open orders
 */
export const fetchOpenOrders = async (
  exchangeId: string,
  symbol?: string
): Promise<OpenOrdersResponse> => {
  try {
    const params: Record<string, string> = { exchange_id: exchangeId };
    if (symbol) params.symbol = symbol;
    
    const response = await axios.get(`${API_BASE_URL}/open_orders`, {
      params,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-User-Id': localStorage.getItem('userId') || '' // Add user ID from local storage
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching open orders from ${exchangeId}:`, error);
    throw error;
  }
};

/**
 * Cancel an order on an exchange
 * @param exchangeId The exchange ID (e.g., 'binance', 'bitvavo')
 * @param orderId The ID of the order to cancel
 * @param symbol Optional trading pair symbol (required by some exchanges)
 * @returns Promise with the cancellation result
 */
export const cancelOrder = async (
  exchangeId: string,
  orderId: string,
  symbol?: string
): Promise<CancelOrderResponse> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/cancel_order`, {
      exchange_id: exchangeId,
      order_id: orderId,
      symbol
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-User-Id': localStorage.getItem('userId') || '' // Add user ID from local storage
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error canceling order ${orderId} on ${exchangeId}:`, error);
    throw error;
  }
};

// Export a list of supported exchanges for reference
export const getSupportedExchanges = async (): Promise<string[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/exchanges`);
    return response.data;
  } catch (error) {
    console.error('Error fetching supported exchanges:', error);
    throw error;
  }
};

// Helper function to test if an exchange connection works
export const testExchangeConnection = async (exchangeId: string): Promise<boolean> => {
  try {
    await fetchExchangeBalance(exchangeId);
    return true;
  } catch (error) {
    console.error(`Exchange connection test failed for ${exchangeId}:`, error);
    return false;
  }
};
