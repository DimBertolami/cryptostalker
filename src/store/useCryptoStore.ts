import { create } from 'zustand';
import { CryptoState, Trade, TradeableCrypto } from '../types';
import { fetchNewCryptocurrencies } from '../services/apiService';
import toast from 'react-hot-toast';
// These imports are currently unused but will be needed later
// import { Cryptocurrency, TradeSignal } from '../types';
// import { generateTradeSignals } from '../utils/tradingStrategy';

const useCryptoStore = create<CryptoState>((set, get) => ({
  cryptos: [],
  newCryptos: [],
  highValueCryptos: [],
  loading: false,
  error: null,
  autoRefresh: true,
  isLiveTrading: false,
  isAutoTrading: false,
  monitoredCrypto: null,
  tradingStats: {
    totalProfit: 0,
    successfulTrades: 0,
    failedTrades: 0,
    averageProfit: 0,
    largestGain: 0,
    largestLoss: 0,
    lastTradeProfit: 0,
  },
  focusedMonitoring: false,
  trades: [],
  portfolio: [],
  updateInterval: 30,
  isPaused: false,

  toggleFocusedMonitoring: () => {
    const { focusedMonitoring } = get();
    set({ focusedMonitoring: !focusedMonitoring });
    toast.success(focusedMonitoring ? 
      'Resumed scanning for new coins' : 
      'Now focusing on monitoring portfolio coins');
  },
  
  getTradingStats: () => {
    return get().tradingStats;
  },

  fetchCryptos: async () => {
    try {
      const { focusedMonitoring, monitoredCrypto, autoRefresh } = get();
      
      // If we're in focused monitoring mode and have a monitored crypto,
      // only fetch data for that specific crypto
      if (focusedMonitoring && monitoredCrypto && autoRefresh) {
        set({ loading: true, error: null });
        
        console.log(`🔍 Focused monitoring enabled for ${monitoredCrypto.name}...`);
        
        // Only fetch the monitored coin to reduce API calls
        const singleCoin = await fetchNewCryptocurrencies(monitoredCrypto.id);
        if (!singleCoin) throw new Error(`Failed to fetch data for ${monitoredCrypto.name}`);
        
        // Update just this coin's price history
        const { highValueCryptos } = get();
        const updatedHighValueCryptos = [...highValueCryptos];
        
        const existingIndex = updatedHighValueCryptos.findIndex(c => c.id === singleCoin.id);
        if (existingIndex >= 0) {
          const existingCrypto = updatedHighValueCryptos[existingIndex];
          const priceHistory = [...(existingCrypto.price_history || []), singleCoin.current_price];
          
          if (priceHistory.length > 24) {
            priceHistory.shift();
          }
          
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
            ...singleCoin,
            price_history: priceHistory,
            consecutive_decreases: consecutiveDecreases
          };
          
          // Update portfolio prices just for this coin
          const { portfolio } = get();
          const updatedPortfolio = portfolio.map(position => {
            if (position.id === singleCoin.id) {
              const updatedPrice = singleCoin.current_price;
              const profitLoss = (updatedPrice - position.averageBuyPrice) * position.balance;
              const profitLossPercentage = ((updatedPrice / position.averageBuyPrice) - 1) * 100;
              
              console.log(`📊 ${position.name} price: $${updatedPrice.toFixed(6)} | P/L: ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(6)} (${profitLossPercentage >= 0 ? '+' : ''}${profitLossPercentage.toFixed(2)}%)`);
              console.log(`📉 Consecutive decreases: ${consecutiveDecreases}`);
              
              return {
                ...position,
                currentPrice: updatedPrice,
                profitLoss: profitLoss,
                profitLossPercentage: profitLossPercentage
              };
            }
            return position;
          });
          
          set({
            highValueCryptos: updatedHighValueCryptos,
            portfolio: updatedPortfolio,
            loading: false
          });
          
          // Check if we should sell
          if (updatedHighValueCryptos[existingIndex].consecutive_decreases >= 3) {
            const position = updatedPortfolio.find(p => p.id === singleCoin.id);
            if (position) {
              const profit = (singleCoin.current_price - position.averageBuyPrice) * position.balance;
              const profitPercent = ((singleCoin.current_price / position.averageBuyPrice) - 1) * 100;
              
              // Update trading stats
              const stats = get().tradingStats;
              const newStats = {
                totalProfit: stats.totalProfit + profit,
                successfulTrades: profit >= 0 ? stats.successfulTrades + 1 : stats.successfulTrades,
                failedTrades: profit < 0 ? stats.failedTrades + 1 : stats.failedTrades,
                averageProfit: (stats.totalProfit + profit) / (stats.successfulTrades + stats.failedTrades + 1),
                largestGain: profit > stats.largestGain ? profit : stats.largestGain,
                largestLoss: profit < 0 && profit < stats.largestLoss ? profit : stats.largestLoss,
                lastTradeProfit: profit
              };
              
              // Sell after 3 consecutive decreases
              get().sellManual(singleCoin, 1, 'bitvavo');
              set({ 
                monitoredCrypto: null,
                focusedMonitoring: false,
                tradingStats: newStats 
              });
              
              // Show detailed profit information
              if (profit >= 0) {
                toast.success(
                  `💰 Profit! Auto-sold ${singleCoin.name} for +$${profit.toFixed(6)} (+${profitPercent.toFixed(2)}%)\n` +
                  `Total profit so far: $${newStats.totalProfit.toFixed(6)}`
                );
              } else {
                toast.error(
                  `📉 Loss! Auto-sold ${singleCoin.name} for ${profit.toFixed(6)} (${profitPercent.toFixed(2)}%)\n` +
                  `Total profit so far: $${newStats.totalProfit.toFixed(6)}`
                );
              }
            }
          }
          
          return; // Exit early, we've done our focused update
        }
      }
      
      // Normal full update if not in focused mode
      set({ loading: true, error: null });
      const data = await fetchNewCryptocurrencies();
      
      // Process cryptocurrencies and generate trade signals
      const processedCryptos = data.map(crypto => {
        // Skip trade signal generation if price history isn't available
        // This fixes price_history type errors
        return crypto;
      });

      // Store all fetched cryptocurrencies
      const allCryptos = processedCryptos;
      
      console.log(`Processing ${processedCryptos.length} coins to find recent additions...`);
      
      // Filter for new cryptos (< 24h old)
      const newCryptos = processedCryptos.filter(crypto => {
        // Get age in hours using type assertion to avoid TypeScript error
        const age = (crypto as any).age_hours;
        // Check if coin was added within the last 24 hours
        const isNew = age !== undefined && age < 24;
        
        // Log each newly found coin for visibility
        if (isNew) {
          console.log(`🆕 New coin found: ${crypto.name} (${crypto.symbol}) - Added ${age?.toFixed(1) || '?'} hours ago`);
        }
        
        return isNew;
      });
      
      // High value cryptocurrencies - coins with significant market presence
      const highValueCryptos = newCryptos.filter(crypto => {
        const marketCap = (crypto as any).market_cap ?? 0;
        const volume = (crypto as any).volume_24h ?? 0;
        return marketCap > 1000000 || volume > 500000; // $1M market cap or $500K volume
      });
      
      // Update all existing high value cryptos with new price data
      const updatedHighValueCryptos = [...get().highValueCryptos];
      highValueCryptos.forEach(newCrypto => {
        const existingIndex = updatedHighValueCryptos.findIndex(c => c.id === newCrypto.id);
        if (existingIndex >= 0) {
          // Update price history
          const priceHistory = [...(updatedHighValueCryptos[existingIndex].price_history || [])];
          
          // Update price history with safe access pattern
          // Using 'as any' type assertion to avoid TypeScript errors while preserving nullish coalescing
          const currentPrice = (newCrypto as any).price ?? (newCrypto as any).current_price ?? 0;
          
          // Always add price to history
          priceHistory.push(currentPrice);
          
          // Keep only last 24 price points
          if (priceHistory.length > 24) {
            priceHistory.shift();
          }
          
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
          // Add new high value crypto with safe default value
          // Using 'as any' type assertion to avoid TypeScript errors while preserving nullish coalescing
          const safePrice = (newCrypto as any).price ?? (newCrypto as any).current_price ?? 0;
          updatedHighValueCryptos.push({
            ...newCrypto,
            price_history: [safePrice],
            consecutive_decreases: 0
          });
        }
      });
      
      // Fix TypeScript errors by ensuring nullish coalescing for optional properties
      // Log summary of found coins
      console.log(` Found ${newCryptos.length} new coins added in the last 24 hours`);
      console.log(` ${highValueCryptos.length} of these are high-value new coins`);
      
      // Update portfolio current prices and profit/loss calculations
      const { portfolio } = get();
      const updatedPortfolio = portfolio.map(position => {
        // Find matching crypto in the new data
        const latestData = allCryptos.find(c => c.id === position.id);
        
        if (latestData) {
          // Get the updated price safely
          const updatedPrice = (latestData as any).price ?? (latestData as any).current_price ?? position.currentPrice;
          
          // Calculate new profit/loss values
          const profitLoss = (updatedPrice - position.averageBuyPrice) * position.balance;
          const profitLossPercentage = ((updatedPrice / position.averageBuyPrice) - 1) * 100;
          
          // Log significant price changes
          if (Math.abs(updatedPrice - position.currentPrice) / position.currentPrice > 0.01) {
            console.log(` ${position.name} price updated: $${position.currentPrice.toFixed(6)} -> $${updatedPrice.toFixed(6)} (${profitLossPercentage > 0 ? '+' : ''}${profitLossPercentage.toFixed(2)}%)`);
          }
          
          return {
            ...position,
            currentPrice: updatedPrice,
            profitLoss: profitLoss,
            profitLossPercentage: profitLossPercentage
          };
        }
        
        return position;
      });
      
      set({
        cryptos: allCryptos,         // Store ALL coins in the cryptos array
        newCryptos: newCryptos,      // Only new coins (< 24h old) in newCryptos
        highValueCryptos: updatedHighValueCryptos,
        portfolio: updatedPortfolio, // Update portfolio with new prices
        loading: false,
        error: null
      });
      
      // Check for auto-trading conditions
      const { isAutoTrading } = get();
      // We already have monitoredCrypto from earlier destructuring
      if (isAutoTrading) {
        if (!monitoredCrypto) {
          // Find a crypto that meets our threshold but hasn't been monitored yet
          const candidateCrypto = updatedHighValueCryptos.find(
            c => !get().trades.some(t => t.cryptoId === c.id)
          );
          
          if (candidateCrypto) {
            // Auto-buy the crypto
            get().buyManual(candidateCrypto, 1, 'bitvavo');
            
            // Switch to focused monitoring mode
            set({ 
              monitoredCrypto: candidateCrypto,
              focusedMonitoring: true 
            });
            
            toast.success(`🔍 Now focusing on monitoring ${candidateCrypto.name}`);
          }
        } else {
          // Check if we should sell
          const updatedMonitoredCrypto = updatedHighValueCryptos.find(c => c.id === monitoredCrypto.id);
          if (updatedMonitoredCrypto?.consecutive_decreases && updatedMonitoredCrypto.consecutive_decreases >= 3) {
            // Get purchase price from portfolio for profit calculation
            const position = get().portfolio.find(p => p.id === updatedMonitoredCrypto.id);
            if (position) {
              const profit = (updatedMonitoredCrypto.current_price - position.averageBuyPrice) * position.balance;
              const profitPercent = ((updatedMonitoredCrypto.current_price / position.averageBuyPrice) - 1) * 100;
              
              // Update trading stats
              const stats = get().tradingStats;
              const newStats = {
                totalProfit: stats.totalProfit + profit,
                successfulTrades: profit >= 0 ? stats.successfulTrades + 1 : stats.successfulTrades,
                failedTrades: profit < 0 ? stats.failedTrades + 1 : stats.failedTrades,
                averageProfit: (stats.totalProfit + profit) / (stats.successfulTrades + stats.failedTrades + 1),
                largestGain: profit > stats.largestGain ? profit : stats.largestGain,
                largestLoss: profit < 0 && profit < stats.largestLoss ? profit : stats.largestLoss,
                lastTradeProfit: profit
              };
              
              // Sell after 3 consecutive decreases
              get().sellManual(updatedMonitoredCrypto, 1, 'bitvavo');
              set({ 
                monitoredCrypto: null,
                focusedMonitoring: false,
                tradingStats: newStats 
              });
              
              // Show detailed profit information
              if (profit >= 0) {
                toast.success(
                  `💰 Profit! Auto-sold ${updatedMonitoredCrypto.name} for +$${profit.toFixed(6)} (+${profitPercent.toFixed(2)}%)\n` +
                  `Total profit so far: $${newStats.totalProfit.toFixed(6)}`
                );
              } else {
                toast.error(
                  `📉 Loss! Auto-sold ${updatedMonitoredCrypto.name} for ${profit.toFixed(6)} (${profitPercent.toFixed(2)}%)\n` +
                  `Total profit so far: $${newStats.totalProfit.toFixed(6)}`
                );
              }
            } else {
              // Shouldn't happen but handle just in case
              get().sellManual(updatedMonitoredCrypto, 1, 'bitvavo');
              set({ monitoredCrypto: null, focusedMonitoring: false });
              toast.error(`Auto-sold ${updatedMonitoredCrypto.name} after detecting 3 consecutive price drops`);
            }
          }
        }
      }
      
    } catch (error) {
      console.error("Error fetching cryptocurrencies:", error);
      set({ 
        error: "Failed to fetch cryptocurrency data", 
        loading: false,
        newCryptos: [],
        highValueCryptos: []
      });
    }
  },

  toggleAutoTrading: () => {
    const { isAutoTrading } = get();
    const newStatus = !isAutoTrading;
    set({ isAutoTrading: newStatus });
    
    // If turning off auto-trading, also disable focused monitoring
    if (!newStatus) {
      set({ focusedMonitoring: false });
      toast.success('Auto-trading disabled, resuming normal scanning');
    } else {
      toast.success('Auto-trading enabled, will buy promising new coins');
      toast.success("Auto-trading deactivated. Manual trading still available.");
    }
  },

  togglePause: () => {
    set((state) => ({ isPaused: !state.isPaused }));
    const { isPaused } = get();
    if (isPaused) {
      toast.success("Auto-fetching paused");
    } else {
      toast.success("Auto-fetching resumed");
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
    
    // Fix TypeScript errors by safely accessing possibly undefined properties
    // Using 'as any' type assertion to suppress TypeScript errors
    const price = (crypto as any).price ?? (crypto as any).current_price ?? 0;
    
    // Generate unique ID
    const tradeId = `trade-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create the trade record
    const newTrade: Trade = {
      id: tradeId,
      cryptoId: crypto.id,
      cryptoName: crypto.name,
      type: 'buy',
      amount,
      price, // Now safely defined as a number
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
    const { isLiveTrading } = get();
    const tradeType = isLiveTrading ? 'Live' : 'Paper';
    
    // Safe access to price with fallback
    // Using 'as any' type assertion to suppress TypeScript errors
    const price = (crypto as any).price ?? (crypto as any).current_price ?? 0;
    
    // Generate unique ID
    const tradeId = `trade-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create the trade record
    const newTrade: Trade = {
      id: tradeId,
      cryptoId: crypto.id,
      cryptoName: crypto.name,
      type: 'sell',
      amount,
      price, // Now safely defined
      timestamp: Date.now(),
      exchange,
      isAuto: get().isAutoTrading,
      isSimulated: !isLiveTrading
    };
    
    // Update trades list
    set(state => ({ trades: [newTrade, ...state.trades] }));
    
    // Update portfolio
    const { portfolio } = get();
    const position = portfolio.find(p => p.id === crypto.id);
    
    if (!position || position.balance < amount) {
      toast.error(`Insufficient balance to sell ${amount} ${crypto.symbol.toUpperCase()}`);
      return;
    }
    
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