/**
 * Prediction API Service
 * 
 * This module provides functions to interact with the prediction and CCXT API endpoints.
 */

// Base URLs for API endpoints
const PREDICTION_API_BASE_URL = '/api/prediction';
const CCXT_API_BASE_URL = '/api/ccxt';

// Helper function to handle API requests
async function apiRequest(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      },
      // Important: This ensures cookies are sent with the request
      credentials: 'same-origin',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API request error for ${url}:`, error);
    throw error;
  }
}

/**
 * Fetch the current status of the prediction model
 */
export const fetchPredictionStatus = async () => {
  try {
    console.log('Fetching prediction status...');
    const data = await apiRequest(`${PREDICTION_API_BASE_URL}/status`);
    console.log('Prediction status response:', data);
    
    // Check if the model is initialized
    const initialized = data?.model_info?.initialized === true;
    
    return {
      initialized,
      model_type: 'DDPG',
      trained: initialized && data?.model_info?.last_training !== null,
      last_trained: data?.model_info?.last_training || null,
      last_prediction: data?.model_info?.last_prediction || null,
      symbols_available: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT'],
      timeframes_available: ['1m', '5m', '15m', '1h', '4h', '1d'],
      error: data?.model_info?.error || null
    };
  } catch (error: unknown) {
    console.error('Error fetching prediction status:', error);
    // Return a basic status object instead of throwing
    return {
      initialized: false,
      trained: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

/**
 * Fetch available exchanges using CCXT
 */
export const fetchExchanges = async () => {
  try {
    console.log('Fetching exchanges from:', `${CCXT_API_BASE_URL}/exchanges`);
    const data = await apiRequest(`${CCXT_API_BASE_URL}/exchanges`);
    console.log('Exchanges response:', data);
    
    // The CCXT endpoint returns an array of exchange IDs
    // We need to return it as is since the component expects an array
    if (Array.isArray(data)) {
      return data;
    } else {
      console.error('Unexpected response format from CCXT exchanges endpoint:', data);
      throw new Error('Invalid response format');
    }
  } catch (error: unknown) {
    console.error('Error fetching exchanges:', error);
    // Return a default list of popular exchanges as fallback
    return ['binance', 'kraken', 'coinbase', 'kucoin', 'bitstamp'];
  }
};

/**
 * Fetch historical chart data for a symbol
 */
export const fetchHistoricalData = async (params: {
  exchange_id: string;
  symbol: string;
  timeframe: string;
  limit: number;
}) => {
  try {
    const { exchange_id, symbol, timeframe, limit } = params;
    const url = `${PREDICTION_API_BASE_URL}/chart-data?exchange_id=${encodeURIComponent(exchange_id)}&symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}&limit=${limit}`;
    
    console.log('Fetching historical data from:', url);
    const result = await apiRequest(url);
    console.log('Historical data response:', result);
    return result;
  } catch (error: unknown) {
    console.error('Error fetching historical data:', error);
    throw error;
  }
};

/**
 * Train the prediction model
 */
export const trainModel = async (params: {
  exchange_id: string;
  symbol: string;
  timeframe: string;
  limit: number;
  epochs: number;
}) => {
  try {
    console.log('Training model with params:', params);
    const result = await apiRequest(`${PREDICTION_API_BASE_URL}/train`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    console.log('Training response:', result);
    return result;
  } catch (error: unknown) {
    console.error('Error training model:', error);
    throw error;
  }
};

/**
 * Initialize the prediction model
 */
export const initializeModel = async (params: {
  exchange_id: string;
  symbol: string;
}) => {
  try {
    console.log('Initializing model with params:', params);
    
    // Use query parameters for initialization
    const url = `${PREDICTION_API_BASE_URL}/initialize?exchange_id=${encodeURIComponent(params.exchange_id)}&symbol=${encodeURIComponent(params.symbol)}`;
    console.log('Initializing model with URL:', url);
    
    const result = await apiRequest(url);
    console.log('Model initialization response:', result);
    return result;
  } catch (error: unknown) {
    console.error('Error initializing model:', error);
    throw error;
  }
};

/**
 * Generate a prediction for a symbol
 */
export const fetchPrediction = async (exchange: string, symbol: string, timeframe: string) => {
  try {
    console.log('Fetching prediction with params:', { exchange_id: exchange, symbol, timeframe });
    
    // Generate mock market state data - in a real implementation, this would come from historical data
    const marketState = Array(10).fill(0).map(() => Math.random() * 2 - 1); // 10 random values between -1 and 1
    
    const result = await apiRequest(`${PREDICTION_API_BASE_URL}/predict`, {
      method: 'POST',
      body: JSON.stringify({
        exchange_id: exchange,
        symbol: symbol,
        timeframe: timeframe,
        market_state: marketState
      }),
    });
    
    console.log('Prediction response:', result);
    return result;
  } catch (error: unknown) {
    console.error('Error fetching prediction:', error);
    throw error;
  }
};

/**
 * Execute a prediction signal
 */
export const executePredictionSignal = async (params: {
  exchange_id: string;
  symbol: string;
  market_state: number[];
}) => {
  try {
    console.log('Executing prediction with params:', params);
    const result = await apiRequest(`${PREDICTION_API_BASE_URL}/predict`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
    console.log('Prediction response:', result);
    return result;
  } catch (error: unknown) {
    console.error('Error executing prediction:', error);
    throw error;
  }
};

/**
 * Start the trading loop
 */
export const startTrading = async (params: {
  exchange_id: string;
  symbols: string[];
  timeframe: string;
  update_interval: number;
}) => {
  try {
    const response = await fetch(`${PREDICTION_API_BASE_URL}/start_trading`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error: unknown) {
    console.error('Error starting trading:', error);
    throw error;
  }
};

/**
 * Stop the trading loop
 */
export const stopTrading = async () => {
  try {
    const response = await fetch(`${PREDICTION_API_BASE_URL}/stop_trading`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error: unknown) {
    console.error('Error stopping trading:', error);
    throw error;
  }
};

/**
 * Fetch trading performance data
 * 
 * Note: This is a mock implementation since we don't have a real performance API yet.
 */
export const fetchTradingPerformance = async (symbol: string) => {
  try {
    // Generate mock trading performance data
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // 3 months ago
    
    const startTimestamp = startDate.getTime();
    const endTimestamp = Date.now();
    
    // Generate equity curve data points
    const equityCurve = [];
    let equity = 10000; // Starting with $10,000
    const dataPoints = 90; // One point per day for 3 months
    
    for (let i = 0; i < dataPoints; i++) {
      const timestamp = startTimestamp + (i * (endTimestamp - startTimestamp) / dataPoints);
      const dailyReturn = (Math.random() - 0.45) * 0.03; // Slightly positive bias
      equity = equity * (1 + dailyReturn);
      
      equityCurve.push({
        timestamp,
        equity
      });
    }
    
    // Generate mock trades
    const trades = [];
    const numTrades = 25;
    
    for (let i = 0; i < numTrades; i++) {
      const entryTimestamp = startTimestamp + (Math.random() * (endTimestamp - startTimestamp));
      const exitTimestamp = entryTimestamp + (Math.random() * 86400000 * 5); // Exit within 5 days
      const entryPrice = symbol.includes('BTC') ? 60000 * (1 + (Math.random() - 0.5) * 0.2) : 3000 * (1 + (Math.random() - 0.5) * 0.2);
      const exitPrice = entryPrice * (1 + (Math.random() - 0.45) * 0.1); // Slightly positive bias
      const profit = exitPrice - entryPrice;
      const profitPercent = (profit / entryPrice) * 100;
      
      trades.push({
        id: i + 1,
        symbol,
        side: Math.random() > 0.5 ? 'buy' : 'sell',
        entryTimestamp,
        exitTimestamp,
        entryPrice,
        exitPrice,
        amount: Math.random() * 2,
        profit,
        profitPercent
      });
    }
    
    // Sort trades by timestamp
    trades.sort((a, b) => a.entryTimestamp - b.entryTimestamp);
    
    // Calculate performance metrics
    const winningTrades = trades.filter(t => t.profit > 0);
    const losingTrades = trades.filter(t => t.profit <= 0);
    
    const metrics = {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / trades.length) * 100,
      averageWin: winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.profitPercent, 0) / winningTrades.length : 0,
      averageLoss: losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + t.profitPercent, 0) / losingTrades.length : 0,
      profitFactor: losingTrades.length > 0 ? 
        Math.abs(winningTrades.reduce((sum, t) => sum + t.profit, 0) / losingTrades.reduce((sum, t) => sum + t.profit, 0)) : 0,
      totalProfit: trades.reduce((sum, t) => sum + t.profit, 0),
      totalProfitPercent: (equity / 10000 - 1) * 100
    };
    
    return {
      equityCurve,
      trades,
      metrics
    };
  } catch (error: unknown) {
    console.error('Error fetching trading performance:', error);
    // Return empty data instead of throwing
    return {
      equityCurve: [],
      trades: [],
      metrics: {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0,
        totalProfit: 0,
        totalProfitPercent: 0
      }
    };
  }
};

/**
 * Configure an exchange
 * 
 * Note: This would ideally use the exchange_configurations API endpoints
 * but we're providing a mock implementation for now.
 */
export const configureExchange = async (params: {
  exchange_id: string;
  api_key: string;
  api_secret: string;
  password?: string;
}) => {
  try {
    // First check if the exchange is valid using CCXT
    const testResponse = await fetch(`${CCXT_API_BASE_URL}/test_exchange_markets?exchange_id=${params.exchange_id}`);
    
    if (!testResponse.ok) {
      throw new Error(`Exchange ${params.exchange_id} not available or not supported`);
    }
    
    // In a real implementation, you would save the API keys securely
    // For now, just return a success response
    return {
      success: true,
      message: `Exchange ${params.exchange_id} configured successfully`,
      exchange_id: params.exchange_id
    };
  } catch (error: unknown) {
    console.error('Error configuring exchange:', error);
    throw error;
  }
};

/**
 * Remove an exchange
 */
export const removeExchange = async (exchangeId: string) => {
  try {
    console.log('Removing exchange:', exchangeId);
    const result = await apiRequest(`${PREDICTION_API_BASE_URL}/remove_exchange`, {
      method: 'POST',
      body: JSON.stringify({
        exchange_id: exchangeId,
      }),
    });
    
    console.log('Remove exchange response:', result);
    return result;
  } catch (error: unknown) {
    console.error('Error removing exchange:', error);
    throw error;
  }
};

/**
 * Get account balance
 * 
 * Note: This would ideally use the CCXT balance endpoint
 * but we're providing a mock implementation for now.
 */
export const getAccountBalance = async (exchangeId: string) => {
  try {
    // Check if the exchange is valid
    const testResponse = await fetch(`${CCXT_API_BASE_URL}/test_exchange_markets?exchange_id=${exchangeId}`);
    
    if (!testResponse.ok) {
      throw new Error(`Exchange ${exchangeId} not available or not supported`);
    }
    
    // Generate mock balance data
    const currencies = ['BTC', 'ETH', 'USDT', 'SOL', 'ADA'];
    const balance: {
      total: Record<string, number>;
      free: Record<string, number>;
      used: Record<string, number>;
      timestamp: number;
      datetime: string;
    } = {
      total: {},
      free: {},
      used: {},
      timestamp: Date.now(),
      datetime: new Date().toISOString()
    };
    
    currencies.forEach(currency => {
      const total = Math.random() * (currency === 'USDT' ? 10000 : 1);
      const used = Math.random() * total * 0.2; // 20% in orders
      balance.total[currency] = total;
      balance.free[currency] = total - used;
      balance.used[currency] = used;
    });
    
    return {
      exchange_id: exchangeId,
      balance
    };
  } catch (error: unknown) {
    console.error('Error getting account balance:', error);
    throw error;
  }
};

/**
 * Get open orders
 */
export const getOpenOrders = async (params: {
  exchange_id: string;
  symbol?: string;
}) => {
  try {
    let url = `${PREDICTION_API_BASE_URL}/open_orders?exchange_id=${encodeURIComponent(params.exchange_id)}`;
    if (params.symbol) {
      url += `&symbol=${encodeURIComponent(params.symbol)}`;
    }
    
    console.log('Fetching open orders from:', url);
    const result = await apiRequest(url);
    console.log('Open orders response:', result);
    return result;
  } catch (error: unknown) {
    console.error('Error getting open orders:', error);
    throw error;
  }
};
