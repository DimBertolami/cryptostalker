import { create } from 'zustand';
import { toast } from 'react-toastify';
import { fetchNewCryptocurrencies } from '../api/crypto';
import { Cryptocurrency, Trade, TradeableCrypto, TradeSettings, TradingStats } from '../types';
import type { FetchSource } from '../types';

const toastSuccess = (message: string) => toast.success(message);
const toastError = (message: string) => toast.error(message);

interface Store {
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
  tradeSettings: TradeSettings;
  tradingStats: TradingStats;
  lastUpdated: string;

  // Actions
  setFetchSource: (source: FetchSource) => void;
  addConnectedExchange: (exchange: string) => void;
  setShowAllCryptos: (show: boolean) => void;
  updateTradeSettings: (settings: Partial<TradeSettings>) => void;
  updateTradingStats: (stats: Partial<TradingStats>) => void;
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
  fetchCryptos: () => Promise<void>;
  buyManual: (crypto: Cryptocurrency, amount: number, exchange: 'bitvavo' | 'binance') => Promise<Trade | undefined>;
  sellManual: (crypto: Cryptocurrency | TradeableCrypto, amount: number, exchange: 'bitvavo' | 'binance') => Promise<Trade | undefined>;
}

const initialState = {
  cryptos: [] as Cryptocurrency[],
  newCryptos: [] as Cryptocurrency[],
  highValueCryptos: [] as Cryptocurrency[],
  showAllCryptos: false,
  loading: false,
  error: null as string | null,
  autoRefresh: true,
  isLiveTrading: false,
  isAutoTrading: false,
  monitoredCrypto: null as Cryptocurrency | null,
  fetchSource: 'binance' as FetchSource,
  connectedExchanges: [] as string[],
  focusedMonitoring: false,
  trades: [] as Trade[],
  portfolio: [] as TradeableCrypto[],
  updateInterval: 60000,
  isPaused: false,
  tradeSettings: {
    walletAllocation: {},
    strategyParams: {
      linear: {
        buyThreshold: 0.02,
        sellThreshold: 0.03
      },
      volatile: {
        volatilityThreshold: 0.05,
        quickSellThreshold: 0.04,
        quickBuyThreshold: 0.03
      }
    }
  } as TradeSettings,
  tradingStats: {
    totalProfit: 0,
    successfulTrades: 0,
    failedTrades: 0,
    averageProfit: 0,
    largestGain: 0,
    largestLoss: 0,
    lastTradeProfit: 0
  } as TradingStats,
  lastUpdated: new Date().toISOString()
} as const;

// Helper function to create a new cryptocurrency
const createCryptocurrency = (data: Partial<Cryptocurrency>): Cryptocurrency => ({
  id: data.id || '',
  name: data.name || '',
  symbol: data.symbol || '',
  current_price: data.current_price ?? 0,
  price_change_percentage_24h: data.price_change_percentage_24h ?? 0,
  market_cap: data.market_cap ?? 0,
  total_volume: data.total_volume ?? 0,
  age_hours: data.age_hours ?? null,
  date_added: data.date_added || new Date().toISOString(),
  volume_24h: data.volume_24h ?? 0,
  price_history: [],
  consecutive_decreases: 0
});

const useCryptoStore = create<Store>((set, get) => ({
  ...initialState,

  setFetchSource: (source: FetchSource) => set({ fetchSource: source }),

  addConnectedExchange: (exchange: string) => set((state) => ({
    connectedExchanges: [...new Set([...state.connectedExchanges, exchange.toLowerCase()])]
  })),

  setShowAllCryptos: (show: boolean) => set({ showAllCryptos: show }),

  updateTradeSettings: (settings: Partial<TradeSettings>) => set((state) => ({
    tradeSettings: { ...state.tradeSettings, ...settings }
  })),

  updateTradingStats: (stats: Partial<TradingStats>) => set((state) => ({
    tradingStats: { ...state.tradingStats, ...stats }
  })),

  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

  toggleAutoRefresh: () => set((state) => ({ autoRefresh: !state.autoRefresh })),

  setUpdateInterval: (interval: number) => set({ updateInterval: interval }),

  setError: (error: string | null) => set({ error }),

  setLoading: (loading: boolean) => set({ loading }),

  setMonitoredCrypto: (crypto: Cryptocurrency | null) => set({ monitoredCrypto: crypto }),

  setFocusedMonitoring: (focused: boolean) => set({ focusedMonitoring: focused }),

  toggleFocusedMonitoring: () => set((state) => ({ focusedMonitoring: !state.focusedMonitoring })),

  toggleAutoTrading: () => set((state) => ({ isAutoTrading: !state.isAutoTrading })),

  toggleLiveTrading: () => set((state) => ({ isLiveTrading: !state.isLiveTrading })),

  updatePriceForCrypto: (cryptoId: string, newPrice: number) => set((state) => ({
    portfolio: state.portfolio.map(c =>
      c.id === cryptoId
        ? { ...c, currentPrice: newPrice }
        : c
    )
  })),

  addToPortfolio: (crypto: Cryptocurrency, amount: number, price: number) => {
    const newTrade: Trade = {
      id: `trade-${Date.now()}`,
      cryptoId: crypto.id,
      cryptoName: crypto.name,
      type: 'buy',
      amount,
      price,
      timestamp: Date.now(),
      exchange: get().fetchSource === 'binance' ? 'binance' : 'bitvavo',
      isAuto: false,
      isSimulated: true
    };

    set((state) => {
      const existingCrypto = state.portfolio.find(c => c.id === crypto.id);
      if (existingCrypto) {
        const updatedPortfolio = state.portfolio.map(c => {
          if (c.id === crypto.id) {
            const totalAmount = c.balance + amount;
            const totalCost = (c.balance * c.averageBuyPrice) + (amount * price);
            return {
              ...c,
              balance: totalAmount,
              averageBuyPrice: totalCost / totalAmount,
              highestPrice: Math.max(c.highestPrice || 0, price),
              highestPriceTimestamp: price > (c.highestPrice || 0) ? Date.now() : c.highestPriceTimestamp || Date.now(),
              profitLoss: ((c.currentPrice || price) - (totalCost / totalAmount)) * totalAmount,
              profitLossPercentage: ((c.currentPrice || price) / (totalCost / totalAmount) - 1) * 100,
              price_history: [...(c.price_history || []), { timestamp: Date.now(), price }]
            };
          }
          return c;
        });
        return {
          portfolio: updatedPortfolio,
          trades: [...state.trades, newTrade]
        };
      }

      const newPortfolioCrypto: TradeableCrypto = {
        id: crypto.id,
        name: crypto.name,
        symbol: crypto.symbol,
        currentPrice: crypto.current_price,
        balance: amount,
        averageBuyPrice: price,
        purchaseTimestamp: Date.now(),
        highestPrice: price,
        highestPriceTimestamp: Date.now(),
        profitLoss: 0,
        profitLossPercentage: 0,
        price_history: [{ timestamp: Date.now(), price }],
        purchaseHistory: [{ amount, price, timestamp: Date.now() }]
      };

      return {
        portfolio: [...state.portfolio, newPortfolioCrypto],
        trades: [...state.trades, newTrade]
      };
    });

    toastSuccess(`Added ${amount} ${crypto.symbol} to portfolio`);
  },

  removeFromPortfolio: (cryptoId: string) => set((state) => ({
    portfolio: state.portfolio.filter(c => c.id !== cryptoId)
  })),

  fetchCryptos: async () => {
    set({ loading: true, error: null });
    try {
      const { cryptos } = await fetchNewCryptocurrencies(get().fetchSource);
      set({
        cryptos: cryptos as Cryptocurrency[],
        loading: false,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch cryptocurrencies',
        loading: false
      });
      toastError('Failed to fetch cryptocurrencies');
    }
  },

  buyManual: async (crypto: Cryptocurrency, amount: number, exchange: 'bitvavo' | 'binance') => {
    try {
      // Implement exchange-specific buy logic here
      const trade: Trade = {
        id: `trade-${Date.now()}`,
        cryptoId: crypto.id,
        cryptoName: crypto.name,
        type: 'buy',
        amount,
        price: crypto.current_price,
        timestamp: Date.now(),
        exchange,
        isAuto: false,
        isSimulated: true
      };
      
      set((state) => ({
        trades: [...state.trades, trade]
      }));

      toastSuccess(`Successfully bought ${amount} ${crypto.symbol}`);
      return trade;
    } catch (error) {
      toastError(`Failed to buy ${crypto.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return undefined;
    }
  },

  sellManual: async (crypto: Cryptocurrency | TradeableCrypto, amount: number, exchange: 'bitvavo' | 'binance') => {
    try {
      // Implement exchange-specific sell logic here
      const trade: Trade = {
        id: `trade-${Date.now()}`,
        cryptoId: crypto.id,
        type: 'sell',
        amount,
        price: 'current_price' in crypto ? crypto.current_price : crypto.currentPrice,
        timestamp: Date.now(),
        exchange,
        cryptoName: crypto.symbol,
        isAuto: false,
        isSimulated: true
      };
      
      set((state) => ({
        trades: [...state.trades, trade]
      }));

      toastSuccess(`Successfully sold ${amount} ${crypto.symbol}`);
      return trade;
    } catch (error) {
      toastError(`Failed to sell ${crypto.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return undefined;
    }
  }
}));

export default useCryptoStore;

// Make it available on window for other stores to access
declare global {
  interface Window {
    cryptoStore: typeof useCryptoStore;
  }
}

window.cryptoStore = useCryptoStore;
