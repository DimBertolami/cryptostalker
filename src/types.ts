// Define types for the cryptocurrency application

export interface QuoteCurrency {
  price: number;
  volume_24h?: number;
  volume_change_24h?: number;
  percent_change_1h?: number;
  percent_change_24h?: number;
  percent_change_7d?: number;
  market_cap?: number;
  market_cap_dominance?: number;
  fully_diluted_market_cap?: number;
  last_updated?: string;
}

export interface Cryptocurrency {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume?: number; // Made optional
  age_hours: number | null;
  date_added: string;
  volume_24h?: number; // Often part of quote, made optional if used directly
  price_history?: PricePoint[]; // Typed and made optional
  consecutive_decreases?: number; // Made optional
  quote?: {
    [key: string]: QuoteCurrency; // e.g., USD, BTC, ETH
  };
}

export interface PurchaseEvent {
  amount: number;
  price: number;
  timestamp: number;
}

export interface BuyEvent {
  timestamp: number;
  price: number;
  amount: number;
}

export interface PricePoint {
  timestamp: number;
  price: number;
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
  purchaseTimestamp: number;
  purchaseHistory: PurchaseEvent[];
  highestPrice: number;
  highestPriceTimestamp: number;
  price_history: PricePoint[];
  consecutive_decreases?: number;
  additionalBuyTimestamps?: BuyEvent[];
  latestBuyTimestamp?: number;
  latestBuyPrice?: number;
  sellTimestamp?: number;
  sellPrice?: number;
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

export interface TradeSettings {
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
}

export interface CryptoState {
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
  tradingStats: TradingStats;
  focusedMonitoring: boolean;
  trades: Trade[];
  portfolio: TradeableCrypto[];
  updateInterval: number;
  isPaused: boolean;
  tradeSettings: TradeSettings;
  lastUpdated?: string; // Changed to string to match usage (e.g., ISO date string)
  
  toggleFocusedMonitoring: () => void;
  togglePause: () => void;
  setShowAllCryptos: (showAll: boolean) => void;
  fetchCryptos: (showAll?: boolean) => Promise<void>;
  setUpdateInterval: (interval: number) => void;
  toggleAutoTrading: () => void;
  toggleLiveTrading: () => void;
  updatePriceForCrypto: (cryptoId: string, newPrice: number) => void;
  buyManual: (crypto: Cryptocurrency, amount: number, exchange: 'bitvavo' | 'binance') => Promise<Trade | undefined>; // Updated return type
  sellManual: (crypto: Cryptocurrency | TradeableCrypto, amount: number, exchange: 'bitvavo' | 'binance') => Promise<Trade | undefined>; // Updated return type
  updateTradeSettings: (newSettings: TradeSettings) => void;
}
