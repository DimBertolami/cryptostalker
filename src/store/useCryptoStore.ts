import { create } from 'zustand';
import { CryptoState, Cryptocurrency, Trade, TradeableCrypto } from '../types';
import { fetchNewCryptocurrencies } from '../services/apiService';
import toast from 'react-hot-toast';

const useCryptoStore = create<CryptoState>((set, get) => ({
  cryptos: [],
  newCryptos: [],
  highValueCryptos: [],
  loading: false,
  error: null,
  updateInterval: 2, // in seconds
  isAutoTrading: false,
  monitoredCrypto: null,
  trades: [],
  portfolio: [],
  isLiveTrading: false,

  fetchCryptos: async () => {
    try {
      set({ loading: true, error: null });
      const data = await fetchNewCryptocurrencies();
      
      // Filter for new cryptos (< 24h old)
      const newCryptos = data.filter(crypto => crypto.age_hours !== undefined && crypto.age_hours < 24);
      
      // Filter for high value trades (> $1.5M)
      const highValueCryptos = newCryptos.filter(
        crypto => crypto.market_cap > 1500000 || crypto.total_volume > 1500000
      );
      
      // Update all existing high value cryptos with new price data
      const updatedHighValueCryptos = [...get().highValueCryptos];
      highValueCryptos.forEach(newCrypto => {
        const existingIndex = updatedHighValueCryptos.findIndex(c => c.id === newCrypto.id);
        if (existingIndex >= 0) {
          // Update price history
          const priceHistory = [...(updatedHighValueCryptos[existingIndex].price_history || []), newCrypto.current_price];
          
          // Count consecutive decreases
          let consecutiveDecreases = 0;
          if (priceHistory.length >= 2) {
            for (let i = priceHistory.length - 1; i > 0; i--) {
              if (priceHistory[i] < priceHistory[i-1]) {
                consecutiveDecreases++;
              } else {
                break;
              }
            }
          }
          
          updatedHighValueCryptos[existingIndex] = {
            ...newCrypto,
            price_history: priceHistory,
            consecutive_decreases: consecutiveDecreases
          };
        } else {
          // Add new high value crypto
          updatedHighValueCryptos.push({
            ...newCrypto,
            price_history: [newCrypto.current_price],
            consecutive_decreases: 0
          });
        }
      });
      
      set({
        cryptos: data,
        newCryptos,
        highValueCryptos: updatedHighValueCryptos,
        loading: false
      });
      
      // Check for auto-trading conditions
      const { isAutoTrading, monitoredCrypto } = get();
      if (isAutoTrading) {
        if (!monitoredCrypto) {
          // Find a crypto that meets our threshold but hasn't been monitored yet
          const candidateCrypto = updatedHighValueCryptos.find(
            c => !get().trades.some(t => t.cryptoId === c.id)
          );
          
          if (candidateCrypto) {
            set({ monitoredCrypto: candidateCrypto });
            // Auto-buy the crypto
            get().buyManual(candidateCrypto, 1, 'bitvavo');
          }
        } else {
          // Check if we should sell
          const updatedMonitoredCrypto = updatedHighValueCryptos.find(c => c.id === monitoredCrypto.id);
          if (updatedMonitoredCrypto?.consecutive_decreases && updatedMonitoredCrypto.consecutive_decreases >= 3) {
            // Sell after 3 consecutive decreases
            get().sellManual(updatedMonitoredCrypto, 1, 'bitvavo');
            set({ monitoredCrypto: null });
            toast.success(`Auto-sold ${updatedMonitoredCrypto.name} after detecting 3 consecutive price drops`);
          }
        }
      }
      
    } catch (error) {
      console.error("Error fetching cryptocurrencies:", error);
      set({ error: "Failed to fetch cryptocurrency data", loading: false });
    }
  },

  toggleAutoTrading: () => {
    set((state) => ({ 
      isAutoTrading: !state.isAutoTrading,
      monitoredCrypto: !state.isAutoTrading ? null : state.monitoredCrypto 
    }));
    
    const { isAutoTrading } = get();
    if (isAutoTrading) {
      toast.success("Auto-trading activated! Monitoring for high-value opportunities.");
    } else {
      toast.success("Auto-trading deactivated. Manual trading still available.");
    }
  },

  setMonitoredCrypto: (crypto) => {
    set({ monitoredCrypto: crypto });
  },

  setUpdateInterval: (interval) => {
    set({ updateInterval: interval });
  },

  toggleLiveTrading: () => {
    const { exchanges } = window.exchangeStore?.getState() || { exchanges: { bitvavo: { connected: false }, binance: { connected: false } } };
    
    if (!exchanges.bitvavo.connected && !exchanges.binance.connected) {
      toast.error("Please connect at least one exchange before enabling live trading");
      return;
    }
    
    set((state) => ({ isLiveTrading: !state.isLiveTrading }));
    
    const { isLiveTrading } = get();
    if (isLiveTrading) {
      toast.success("Live trading activated! All trades will be executed on connected exchanges.");
    } else {
      toast.success("Switched to paper trading mode. No real assets will be traded.");
    }
  },

  buyManual: (crypto, amount, exchange) => {
    const { isLiveTrading } = get();
    const tradeType = isLiveTrading ? 'Live' : 'Paper';
    const price = crypto.current_price;
    const total = price * amount;
    
    // Generate unique ID
    const tradeId = `trade-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create the trade record
    const newTrade: Trade = {
      id: tradeId,
      cryptoId: crypto.id,
      cryptoName: crypto.name,
      type: 'buy',
      amount,
      price,
      timestamp: Date.now(),
      exchange,
      isAuto: get().isAutoTrading,
      isSimulated: !isLiveTrading
    };
    
    // Update trades list
    set(state => ({ trades: [newTrade, ...state.trades] }));
    
    // Update portfolio
    const { portfolio } = get();
    const existingPosition = portfolio.find(p => p.id === crypto.id);
    
    if (existingPosition) {
      // Update existing position
      const updatedPortfolio = portfolio.map(p => {
        if (p.id === crypto.id) {
          const newBalance = p.balance + amount;
          const newAverageBuyPrice = ((p.balance * p.averageBuyPrice) + (amount * price)) / newBalance;
          const newProfitLoss = (p.currentPrice - newAverageBuyPrice) * newBalance;
          const newProfitLossPercentage = ((p.currentPrice / newAverageBuyPrice) - 1) * 100;
          
          return {
            ...p,
            balance: newBalance,
            averageBuyPrice: newAverageBuyPrice,
            profitLoss: newProfitLoss,
            profitLossPercentage: newProfitLossPercentage
          };
        }
        return p;
      });
      
      set({ portfolio: updatedPortfolio });
    } else {
      // Add new position
      const newPosition: TradeableCrypto = {
        id: crypto.id,
        name: crypto.name,
        symbol: crypto.symbol,
        balance: amount,
        averageBuyPrice: price,
        currentPrice: price,
        profitLoss: 0,
        profitLossPercentage: 0
      };
      
      set(state => ({ portfolio: [newPosition, ...state.portfolio] }));
    }
    
    toast.success(`${tradeType} buy: ${amount} ${crypto.symbol.toUpperCase()} at $${price.toLocaleString()}`);
    return newTrade;
  },

  sellManual: (crypto, amount, exchange) => {
    const { portfolio, isLiveTrading } = get();
    const position = portfolio.find(p => p.id === crypto.id);
    
    if (!position || position.balance < amount) {
      toast.error(`Insufficient balance to sell ${amount} ${crypto.symbol.toUpperCase()}`);
      return;
    }
    
    const tradeType = isLiveTrading ? 'Live' : 'Paper';
    const price = crypto.current_price;
    const total = price * amount;
    
    // Generate unique ID
    const tradeId = `trade-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create the trade record
    const newTrade: Trade = {
      id: tradeId,
      cryptoId: crypto.id,
      cryptoName: crypto.name,
      type: 'sell',
      amount,
      price,
      timestamp: Date.now(),
      exchange,
      isAuto: get().isAutoTrading,
      isSimulated: !isLiveTrading
    };
    
    // Update trades list
    set(state => ({ trades: [newTrade, ...state.trades] }));
    
    // Update portfolio
    if (position.balance === amount) {
      // Remove position if selling everything
      set(state => ({
        portfolio: state.portfolio.filter(p => p.id !== crypto.id)
      }));
    } else {
      // Update position
      const updatedPortfolio = portfolio.map(p => {
        if (p.id === crypto.id) {
          return {
            ...p,
            balance: p.balance - amount,
            profitLoss: (p.currentPrice - p.averageBuyPrice) * (p.balance - amount),
            // Profit loss percentage doesn't change on sell
          };
        }
        return p;
      });
      
      set({ portfolio: updatedPortfolio });
    }
    
    toast.success(`${tradeType} sell: ${amount} ${crypto.symbol.toUpperCase()} at $${price.toLocaleString()}`);
    return newTrade;
  }
}));

// Make it available on window for other stores to access
declare global {
  interface Window {
    cryptoStore: typeof useCryptoStore;
  }
}

window.cryptoStore = useCryptoStore;

export default useCryptoStore;