/**
 * Prediction API Service
 * 
 * This module provides functions to interact with the prediction and CCXT API endpoints.
 */

// Base URLs for API requests
const PREDICTION_API_BASE_URL = '/api/prediction';
const CCXT_API_BASE_URL = '/api/ccxt';

/**
 * Fetch the current status of the prediction model
 * 
 * Note: This is a mock implementation since we don't have a real prediction API yet.
 */
export const fetchPredictionStatus = async () => {
  try {
    // Try to check if CCXT is available at all
    const response = await fetch(`${CCXT_API_BASE_URL}/exchanges`);
    
    if (!response.ok) {
      throw new Error(`Backend services not available`);
    }
    
    // Return mock status data
    return {
      initialized: true,
      model_type: 'LSTM',
      trained: true,
      last_trained: new Date().toISOString(),
      accuracy: 0.78,
      symbols_available: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ADA/USDT'],
      timeframes_available: ['1m', '5m', '15m', '1h', '4h', '1d']
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
    // Use the CCXT endpoint instead of prediction API
    // Note: Since we're running locally, we don't need the API_URL prefix
    const response = await fetch(`${CCXT_API_BASE_URL}/exchanges`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    
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
 * Fetch historical price data for a symbol
 * 
 * Note: This is a mock implementation since we don't have a direct CCXT endpoint
 * for historical data. In a real implementation, you would use the CCXT
 * fetch_ohlcv endpoint or similar.
 */
export const fetchHistoricalData = async (exchange: string, symbol: string, timeframe: string) => {
  try {
    // First try to test if the exchange is available via CCXT
    const testResponse = await fetch(`${CCXT_API_BASE_URL}/test_exchange_markets?exchange_id=${exchange}`);
    
    if (!testResponse.ok) {
      throw new Error(`Exchange ${exchange} not available or not supported`);
    }
    
    // Generate mock historical data since we don't have the real endpoint
    const now = Date.now();
    const data = [];
    const basePrice = symbol.includes('BTC') ? 60000 : symbol.includes('ETH') ? 3000 : 1;
    
    // Generate 100 data points with random price movements
    for (let i = 0; i < 100; i++) {
      const timestamp = now - (99 - i) * (timeframe === '1h' ? 3600000 : timeframe === '1d' ? 86400000 : 60000);
      const volatility = 0.02; // 2% price movement
      const randomChange = (Math.random() - 0.5) * volatility;
      const price = basePrice * (1 + randomChange * i);
      
      data.push({
        timestamp,
        open: price * (1 - volatility/4),
        high: price * (1 + volatility/2),
        low: price * (1 - volatility/2),
        close: price,
        volume: Math.random() * 100
      });
    }
    
    return data;
  } catch (error: unknown) {
    console.error('Error fetching historical data:', error);
    // Return empty array instead of throwing to prevent UI errors
    return [];
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
  epochs?: number;
  actor_layers?: number[];
  critic_layers?: number[];
  learning_rate?: number;
  batch_size?: number;
}) => {
  try {
    const response = await fetch(`${PREDICTION_API_BASE_URL}/train`, {
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
    console.error('Error training model:', error);
    throw error;
  }
};

/**
 * Generate a prediction for a symbol
 */
export const fetchPrediction = async (exchange: string, symbol: string, timeframe: string) => {
  try {
    const response = await fetch(`${PREDICTION_API_BASE_URL}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        exchange_id: exchange,
        symbol: symbol,
        timeframe: timeframe,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error: unknown) {
    console.error('Error fetching prediction:', error);
    throw error;
  }
};

/**
 * Execute a trading signal based on prediction
 */
export const executePredictionSignal = async (params: {
  exchange_id: string;
  symbol: string;
}) => {
  try {
    const response = await fetch(`${PREDICTION_API_BASE_URL}/execute_signal`, {
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
    console.error('Error executing signal:', error);
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
    const response = await fetch(`${PREDICTION_API_BASE_URL}/remove_exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        exchange_id: exchangeId,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
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
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error: unknown) {
    console.error('Error getting open orders:', error);
    throw error;
  }
};
