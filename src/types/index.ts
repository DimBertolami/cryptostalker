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

export interface CryptoState {
  cryptos: Cryptocurrency[];
  newCryptos: Cryptocurrency[];
  highValueCryptos: Cryptocurrency[];
  loading: boolean;
  error: string | null;
  updateInterval: number;
  isAutoTrading: boolean;
  monitoredCrypto: Cryptocurrency | null;
  trades: Trade[];
  portfolio: TradeableCrypto[];
  isLiveTrading: boolean;
  isPaused: boolean;
  fetchCryptos: () => Promise<void>;
  toggleAutoTrading: () => void;
  setMonitoredCrypto: (crypto: Cryptocurrency | null) => void;
  setUpdateInterval: (interval: number) => void;
  toggleLiveTrading: () => void;
  togglePause: () => void;
  buyManual: (crypto: Cryptocurrency, amount: number, exchange: 'bitvavo' | 'binance') => void;
  sellManual: (crypto: Cryptocurrency, amount: number, exchange: 'bitvavo' | 'binance') => void;
}

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