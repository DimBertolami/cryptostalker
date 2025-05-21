export interface Cryptocurrency {
  // Required properties from CoinMarketCap API
  id: string;
  symbol: string;
  name: string;
  
  // Properties we add in our API service
  price: number;
  current_price?: number; // Same as price, added for compatibility
  date_added: string;
  age_hours?: number;
  volume_24h?: number;
  market_cap?: number;
  
  // Optional properties from CoinGecko API or our app
  image?: string;
  total_volume?: number;
  high_24h?: number;
  low_24h?: number;
  price_change_percentage_24h?: number;
  market_cap_change_percentage_24h?: number;
  created_at?: string;
  meets_threshold?: boolean;
  consecutive_decreases?: number;
  price_history?: any[];
  local_min?: boolean;
  local_max?: boolean;
  trade_signals?: TradeSignal[];
  
  // CoinMarketCap nested properties
  quote?: {
    USD?: {
      price: number;
      volume_24h: number;
      market_cap: number;
      percent_change_24h: number;
    }
  };
}

export interface TradingStats {
  totalProfit: number;
  successfulTrades: number;
  failedTrades: number;
  averageProfit: number;
  largestGain: number;
  largestLoss: number;
  lastTradeProfit: number;
}

export interface CryptoState {
  // State properties
  cryptos: Cryptocurrency[];
  newCryptos: Cryptocurrency[];
  highValueCryptos: Cryptocurrency[];
  loading: boolean;
  error: null | string;
  updateInterval: number;
  autoRefresh?: boolean;
  isLiveTrading: boolean;
  isAutoTrading: boolean;
  monitoredCrypto: Cryptocurrency | null;
  trades: Trade[];
  portfolio: TradeableCrypto[];
  tradingStats: TradingStats;
  focusedMonitoring: boolean;
  isPaused?: boolean;
  
  // Actions
  fetchCryptos: () => Promise<void>;
  toggleAutoTrading: () => void;
  toggleFocusedMonitoring: () => void;
  getTradingStats: () => TradingStats;
  setMonitoredCrypto?: (crypto: Cryptocurrency | null) => void;
  setUpdateInterval?: (interval: number) => void;
  toggleLiveTrading?: () => void;
  togglePause?: () => void;
  buyManual: (crypto: Cryptocurrency, amount: number, exchange: 'bitvavo' | 'binance') => Trade;
  sellManual: (crypto: Cryptocurrency, amount: number, exchange: 'bitvavo' | 'binance') => Trade | null;
}

export interface TradeSignal {
  type: 'buy' | 'sell';
  price: number;
  timestamp: number;
}

export interface Trade {
  id: string;
  cryptoId: string;
  cryptoName: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  timestamp: number;
  exchange: 'bitvavo' | 'binance';
  isAuto: boolean;
  isSimulated: boolean;
  signalType?: 'local_minimum' | 'local_maximum';
}

export interface TradeableCrypto {
  id: string;
  name: string;
  symbol: string;
  balance: number;
  averageBuyPrice: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPercentage: number;
}

export interface AppState {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

// This interface was removed to avoid duplication with the CryptoState interface above

export interface ExchangeState {
  exchanges: {
    bitvavo: {
      connected: boolean;
      apiKey: string;
      apiSecret: string;
    };
    binance: {
      connected: boolean;
      apiKey: string;
      apiSecret: string;
    };
  };
  setApiKeys: (exchange: 'bitvavo' | 'binance', apiKey: string, apiSecret: string) => void;
}