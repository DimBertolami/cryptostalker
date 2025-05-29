export interface Cryptocurrency {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  market_cap: number;
  total_volume?: number;  // Make optional to match API response
  price_change_percentage_24h: number;
  age_hours: number | null;
  date_added: string;
  volume_24h: number;
  quote?: {
    USD: {
      price: number;
      volume_24h: number;
      percent_change_24h: number;
      market_cap: number;
    }
  };
  image?: string;
  price?: number;
  price_history: number[];
  consecutive_decreases?: number;  // Make optional as it's calculated
  [key: string]: any;  // Allow additional properties to handle API response variations
}

export interface TradeSignal {
  type: 'buy' | 'sell';
  reason: string;
  timestamp: number;
  price: number;
}

export type FetchSource = 'coinmarketcap' | 'coingecko' | 'binance' | 'bitvavo' | 'jupiter';

// Moved Window interface to avoid circular dependency
export interface Window {
  cryptoStore: any; // TODO: Replace with proper type once store is stable
}

export interface CryptoState {
  // State properties
  cryptos: Cryptocurrency[];
  newCryptos: Cryptocurrency[];
  highValueCryptos: Cryptocurrency[];
  showAllCryptos: boolean;
  loading: boolean;
  error: string | null;
  autoRefresh: boolean;
  isLiveTrading: boolean;
  isAutoTrading: boolean;
  monitoredCrypto: Cryptocurrency | null;
  fetchSource: FetchSource;
  connectedExchanges: string[];
  focusedMonitoring: boolean;
  trades: Trade[];
  portfolio: TradeableCrypto[];
  updateInterval: number;
  isPaused: boolean;
  lastUpdated: string;
  tradeSettings: {
    walletAllocation: Record<string, number>;
    strategyParams: {
      linear: {
        buyThreshold: number;
        sellThreshold: number;
      };
      volatile: {
        volatilityThreshold: number;
        quickSellThreshold: number;
        quickBuyThreshold: number;
      };
    };
  };
  tradingStats: {
    totalProfit: number;
    successfulTrades: number;
    failedTrades: number;
    averageProfit: number;
    largestGain: number;
    largestLoss: number;
    lastTradeProfit: number;
  };
  
  // Actions
  setFetchSource: (source: FetchSource) => void;
  addConnectedExchange: (exchange: string) => void;
  setShowAllCryptos: (showAll: boolean) => void;
  updateTradeSettings: (settings: Partial<CryptoState['tradeSettings']>) => void;
  updateTradingStats: (stats: Partial<CryptoState['tradingStats']>) => void;
  togglePause: () => void;
  toggleAutoRefresh: () => void;
  setUpdateInterval: (interval: number) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  setMonitoredCrypto: (crypto: Cryptocurrency | null) => void;
  setFocusedMonitoring: (focused: boolean) => void;
  toggleFocusedMonitoring: () => void;
  toggleAutoTrading: () => void;
  toggleLiveTrading: () => void;
  updatePriceForCrypto: (cryptoId: string, newPrice: number) => void;
  addToPortfolio: (crypto: Cryptocurrency, amount: number, price: number) => void;
  removeFromPortfolio: (cryptoId: string) => void;
  fetchCryptos: () => Promise<void>;
  buyManual: (crypto: Cryptocurrency, amount: number, exchange: 'bitvavo' | 'binance') => Promise<Trade | undefined>;
  sellManual: (crypto: Cryptocurrency | TradeableCrypto, amount: number, exchange: 'bitvavo' | 'binance') => Promise<Trade | undefined>;
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

export interface PurchaseEvent {
  amount: number;
  price: number;
  timestamp: number;
}

export interface TradeableCrypto {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  balance: number;
  averageBuyPrice: number;
  purchaseTimestamp?: number;
  sellTimestamp?: number;
  highestPrice?: number;
  highestPriceTimestamp?: number;
  price_history?: Array<{timestamp: number, price: number}>;
  firstBuyTime?: number;
}

export interface AppState {
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export interface ExchangeState {
  exchanges: {
    bitvavo: {
      apiKey: string;
      apiSecret: string;
      isConfigured: boolean;
    };
    binance: {
      apiKey: string;
      apiSecret: string;
      isConfigured: boolean;
    };
  };
  
  updateExchangeCredentials: (
    exchange: 'bitvavo' | 'binance',
    apiKey: string,
    apiSecret: string
  ) => void;
}
