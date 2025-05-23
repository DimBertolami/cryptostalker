// Define types for the cryptocurrency application

export interface Cryptocurrency {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
  age_hours: number | null;
  date_added: string;
  volume_24h: number;
  price_history: any[];
  consecutive_decreases: number;
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
  
  toggleFocusedMonitoring: () => void;
  togglePause: () => void;
  setShowAllCryptos: (showAll: boolean) => void;
  fetchCryptos: (showAll?: boolean) => Promise<void>;
  setUpdateInterval: (interval: number) => void;
  toggleAutoTrading: () => void;
  toggleLiveTrading: () => void;
  updatePriceForCrypto: (cryptoId: string, newPrice: number) => void;
  buyManual: (crypto: Cryptocurrency, amount: number, exchange: 'bitvavo' | 'binance') => Trade | undefined;
  sellManual: (crypto: Cryptocurrency | TradeableCrypto, amount: number, exchange: 'bitvavo' | 'binance') => Trade | undefined;
  updateTradeSettings: (newSettings: TradeSettings) => void;
}
