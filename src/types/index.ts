export interface Cryptocurrency {
  id: string;
  name: string;
  symbol: string;
  current_price?: number;
  market_cap?: number;
  total_volume?: number;
  price_change_percentage_24h?: number;
  age_hours?: number;
  date_added?: string;
  volume_24h?: number;
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
  price_history?: number[];
  consecutive_decreases?: number;
}

export interface TradeSignal {
  type: 'buy' | 'sell';
  reason: string;
  timestamp: number;
  price: number;
}

export interface CryptoState {
  cryptos: Cryptocurrency[];
  newCryptos: Cryptocurrency[];
  highValueCryptos: Cryptocurrency[];
  loading: boolean;
  error: string | null;
  autoRefresh: boolean;
  isLiveTrading: boolean;
  isAutoTrading: boolean;
  monitoredCrypto: Cryptocurrency | null;
  focusedMonitoring: boolean;
  tradingStats: {
    totalProfit: number;
    successfulTrades: number;
    failedTrades: number;
    averageProfit: number;
    largestGain: number;
    largestLoss: number;
    lastTradeProfit: number;
  };
  trades: Trade[];
  portfolio: TradeableCrypto[];
  updateInterval: number;
  isPaused: boolean;
  
  // Actions
  toggleFocusedMonitoring: () => void;
  togglePause: () => void;
  fetchCryptos: () => Promise<void>;
  buyManual: (crypto: Cryptocurrency, amount: number, exchange: 'bitvavo' | 'binance') => Trade;
  sellManual: (crypto: Cryptocurrency, amount: number, exchange: 'bitvavo' | 'binance') => void;
  toggleAutoTrading: () => void;
  toggleLiveTrading: () => void;
  updatePriceForCrypto: (cryptoId: string, newPrice: number) => void;
  setUpdateInterval: (interval: number) => void;
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
  name: string;
  symbol: string;
  balance: number;
  averageBuyPrice: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPercentage: number;
  purchaseTimestamp: number;      // First purchase timestamp (for backward compatibility)
  purchaseHistory: PurchaseEvent[]; // Track all purchases
  highestPrice: number;           // Track the highest price seen
  highestPriceTimestamp?: number; // When the highest price was reached
  sellTimestamp?: number;         // When the position was sold (if applicable)
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
