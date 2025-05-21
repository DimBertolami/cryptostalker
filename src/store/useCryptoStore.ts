import { create } from 'zustand';
import { CryptoState, Trade, TradeableCrypto, Cryptocurrency, PurchaseEvent } from '../types';
import { fetchNewCryptocurrencies } from '../services/apiService';
import toast from 'react-hot-toast';

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
  
  togglePause: () => {
    const { isPaused } = get();
    set({ isPaused: !isPaused });
    toast.success(isPaused ? 'Resumed fetching' : 'Paused fetching');
  },
  
  fetchCryptos: async () => {
    const { isPaused, autoRefresh, focusedMonitoring, monitoredCrypto } = get();
    
    if (isPaused) return;
    
    try {
      // If focused monitoring is on and we have a monitored crypto,
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
        
        const existingIndex = updatedHighValueCryptos.findIndex(c => c.id === (singleCoin as Cryptocurrency).id);
        if (existingIndex >= 0) {
          const existingCrypto = updatedHighValueCryptos[existingIndex];
          const priceHistory = [...(existingCrypto.price_history || [])];
          
          // Update price history with safe access pattern
          // Using 'as any' type assertion to avoid TypeScript errors while preserving nullish coalescing
          const currentPrice = (singleCoin as any).price ?? (singleCoin as any).current_price ?? 0;
          
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
            ...singleCoin as Cryptocurrency,
            price_history: priceHistory,
            consecutive_decreases: consecutiveDecreases
          };
        } else {
          // Add new high value crypto with safe default value
          // Using 'as any' type assertion to avoid TypeScript errors while preserving nullish coalescing
          const safePrice = (singleCoin as any).price ?? (singleCoin as any).current_price ?? 0;
          updatedHighValueCryptos.push({
            ...(singleCoin as Cryptocurrency),
            price_history: [safePrice],
            consecutive_decreases: 0
          });
        }
        
        // Also update portfolio with new prices
        const { portfolio } = get();
        const updatedPortfolio = portfolio.map(position => {
          if (position.id === (singleCoin as Cryptocurrency).id) {
            const updatedPrice = (singleCoin as any).current_price ?? position.currentPrice;
            const profitLoss = (updatedPrice - position.averageBuyPrice) * position.balance;
            const profitLossPercentage = ((updatedPrice / position.averageBuyPrice) - 1) * 100;
            
            // Track highest price
            let highestPrice = position.highestPrice;
            let highestPriceTimestamp = position.highestPriceTimestamp;
            
            if (updatedPrice > highestPrice) {
              highestPrice = updatedPrice;
              highestPriceTimestamp = Date.now();
            }
            
            console.log(`📉 Consecutive decreases: ${consecutiveDecreases}`);
            
            return {
              ...position,
              currentPrice: updatedPrice,
              profitLoss: profitLoss,
              profitLossPercentage: profitLossPercentage,
              highestPrice,
              highestPriceTimestamp
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
        if (existingIndex >= 0 && updatedHighValueCryptos[existingIndex].consecutive_decreases >= 3) {
          const position = updatedPortfolio.find(p => p.id === (singleCoin as Cryptocurrency).id);
          if (position) {
            const profit = ((singleCoin as any).current_price - position.averageBuyPrice) * position.balance;
            const profitPercent = (((singleCoin as any).current_price / position.averageBuyPrice) - 1) * 100;
            
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
            get().sellManual(singleCoin as Cryptocurrency, 1, 'bitvavo');
            set({ 
              monitoredCrypto: null,
              focusedMonitoring: false,
              tradingStats: newStats 
            });
            
            // Show detailed profit information
            if (profit >= 0) {
              toast.success(
                `💰 Profit! Auto-sold ${(singleCoin as Cryptocurrency).name} for +$${profit.toFixed(6)} (+${profitPercent.toFixed(2)}%)\n` +
                `Total profit so far: $${newStats.totalProfit.toFixed(6)}`
              );
            } else {
              toast.error(
                `📉 Loss! Auto-sold ${(singleCoin as Cryptocurrency).name} for -$${Math.abs(profit).toFixed(6)} (${profitPercent.toFixed(2)}%)\n` +
                `Total profit so far: $${newStats.totalProfit.toFixed(6)}`
              );
            }
          }
        }
        
        return;
      }
      
      // Regular fetch for all cryptos
      if (autoRefresh) {
        set({ loading: true, error: null });
        
        // Fetch new cryptocurrencies
        const cryptocurrencies = await fetchNewCryptocurrencies();
        
        if (!cryptocurrencies || cryptocurrencies.length === 0) {
          throw new Error('Failed to fetch cryptocurrencies');
        }
        
        // Process the data
        const processedCryptos = cryptocurrencies.map((crypto: Cryptocurrency) => {
          // Calculate age in hours
          const dateAdded = crypto.date_added ? new Date(crypto.date_added) : null;
          const now = new Date();
          const ageInHours = dateAdded ? (now.getTime() - dateAdded.getTime()) / (1000 * 60 * 60) : null;
          
          return {
            ...crypto,
            age_hours: ageInHours
          };
        });
        
        // Filter for new coins - any coin added in the last 24 hours
        const newCryptos = processedCryptos.filter(crypto => {
            const age = (crypto as any).age_hours;
            return age !== undefined && age < 24;
        });

        // Filter for high value coins - any with a market cap over $1M or volume over $500K
        const highValueCryptos = newCryptos.filter(crypto => {
            const marketCap = crypto.market_cap || (crypto.quote?.USD?.market_cap ?? 0);
            const volume = crypto.volume_24h || (crypto.quote?.USD?.volume_24h ?? 0);
            return marketCap > 1000000 || volume > 500000;
        });
        
        console.log(`Found ${newCryptos.length} new coins, ${highValueCryptos.length} high value`);
        
        // Auto-buy high value coins if auto-trading is enabled
        const { isAutoTrading } = get();
        
        if (isAutoTrading && highValueCryptos.length > 0 && !get().monitoredCrypto) {
          // Randomly select one high value coin to buy
          const randomIndex = Math.floor(Math.random() * highValueCryptos.length);
          const coinToBuy = highValueCryptos[randomIndex];
          
          // Buy the coin
          const boughtTrade = get().buyManual(coinToBuy, 1, 'bitvavo');
          
          // Set it as the monitored crypto
          set({
            monitoredCrypto: coinToBuy,
            focusedMonitoring: true
          });
          
          toast.success(`🔥 Auto-bought high value coin: ${coinToBuy.name} (${coinToBuy.symbol.toUpperCase()})`);
          
          // Log debug info
          const marketCap = coinToBuy.market_cap || (coinToBuy.quote?.USD?.market_cap ?? 0);
          const volume = coinToBuy.volume_24h || (coinToBuy.quote?.USD?.volume_24h ?? 0);
          console.log(`Auto-bought ${coinToBuy.name}: Market Cap $${(marketCap/1000000).toFixed(2)}M, Volume $${(volume/1000000).toFixed(2)}M`);
        }
        
        // Update the store state with the fetched and processed data
        set({
          cryptos: processedCryptos,
          newCryptos,
          highValueCryptos,
          loading: false
        });
        
        // Update portfolio with latest prices
        const { portfolio } = get();
        if (portfolio.length > 0) {
          const updatedPortfolio = portfolio.map(position => {
            const updatedCrypto = processedCryptos.find(c => c.id === position.id);
            
            if (updatedCrypto) {
              const updatedPrice = (updatedCrypto as any).current_price ?? position.currentPrice;
              const profitLoss = (updatedPrice - position.averageBuyPrice) * position.balance;
              const profitLossPercentage = ((updatedPrice / position.averageBuyPrice) - 1) * 100;
              
              // Track highest price
              let highestPrice = position.highestPrice;
              let highestPriceTimestamp = position.highestPriceTimestamp;
              
              if (updatedPrice > highestPrice) {
                highestPrice = updatedPrice;
                highestPriceTimestamp = Date.now();
              }
              
              return {
                ...position,
                currentPrice: updatedPrice,
                profitLoss: profitLoss,
                profitLossPercentage: profitLossPercentage,
                highestPrice,
                highestPriceTimestamp
              };
            }
            
            return position;
          });
          
          set({ portfolio: updatedPortfolio });
        }
      }
    } catch (error) {
      console.error('Error fetching cryptocurrencies:', error);
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      });
    }
  },
  
  setUpdateInterval: (interval) => {
    set({ updateInterval: interval });
  },
  
  toggleAutoTrading: () => {
    const { isAutoTrading } = get();
    set({ isAutoTrading: !isAutoTrading });
    toast.success(isAutoTrading ? 'Auto-trading disabled' : 'Auto-trading enabled');
  },
  
  toggleLiveTrading: () => {
    const { isLiveTrading } = get();
    set({ isLiveTrading: !isLiveTrading });
    toast.success(isLiveTrading ? 'Switched to paper trading' : 'Switched to live trading');
  },

  updatePriceForCrypto: (cryptoId: string, newPrice: number) => {
    const { portfolio } = get();
    const position = portfolio.find(p => p.id === cryptoId);
    
    if (position) {
      // Track highest price
      let highestPrice = position.highestPrice;
      let highestPriceTimestamp = position.highestPriceTimestamp;
      
      if (newPrice > highestPrice) {
        highestPrice = newPrice;
        highestPriceTimestamp = Date.now();
      }
      
      const updatedPortfolio = portfolio.map(p => {
        if (p.id === cryptoId) {
          const profitLoss = (newPrice - p.averageBuyPrice) * p.balance;
          const profitLossPercentage = ((newPrice / p.averageBuyPrice) - 1) * 100;
          
          return {
            ...p,
            currentPrice: newPrice,
            profitLoss,
            profitLossPercentage,
            highestPrice,
            highestPriceTimestamp
          };
        }
        return p;
      });
      
      set({ portfolio: updatedPortfolio });
    }
  },
  
  buyManual: (crypto: Cryptocurrency, amount: number, exchange: 'bitvavo' | 'binance') => {
    const { isLiveTrading } = get();
    const tradeType = isLiveTrading ? 'Live' : 'Paper';
    
    // Check if the exchange is connected
    const exchanges = {
      bitvavo: { apiKey: 'simulated', apiSecret: 'simulated', isConfigured: true, connected: true },
      binance: { apiKey: 'simulated', apiSecret: 'simulated', isConfigured: true, connected: true }
    };
    
    if (isLiveTrading && !exchanges[exchange].connected) {
      toast.error(`${exchange} is not connected. Please configure it in Exchange Settings.`);
      throw new Error(`${exchange} is not connected`);
    }
    
    // Safe access to price with fallback
    // Using 'as any' type assertion to suppress TypeScript errors
    const price = (crypto as any).price ?? (crypto as any).current_price ?? 0;
    const buyTimestamp = Date.now();
    
    // Create the purchase event
    const purchaseEvent: PurchaseEvent = {
      amount,
      price,
      timestamp: buyTimestamp
    };
    
    // Generate unique ID
    const tradeId = `trade-${buyTimestamp}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create the trade record
    const newTrade: Trade = {
      id: tradeId,
      cryptoId: crypto.id,
      cryptoName: crypto.name,
      type: 'buy',
      amount,
      price,
      timestamp: buyTimestamp,
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
          
          // Add to purchase history
          const purchaseHistory = [...p.purchaseHistory, purchaseEvent];
          
          return {
            ...p,
            balance: newBalance,
            averageBuyPrice: newAverageBuyPrice,
            profitLoss: newProfitLoss,
            profitLossPercentage: newProfitLossPercentage,
            purchaseHistory
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
        profitLossPercentage: 0,
        purchaseTimestamp: buyTimestamp,
        purchaseHistory: [purchaseEvent],
        highestPrice: price,
        highestPriceTimestamp: buyTimestamp
      };
      
      set(state => ({ portfolio: [newPosition, ...state.portfolio] }));
    }
    
    toast.success(`${tradeType} buy: ${amount} ${crypto.symbol.toUpperCase()} at $${price.toLocaleString()}`);
    return newTrade;
  },

  sellManual: (crypto: Cryptocurrency, amount: number, exchange: 'bitvavo' | 'binance') => {
    const { isLiveTrading } = get();
    const tradeType = isLiveTrading ? 'Live' : 'Paper';
    
    // Safe access to price with fallback
    // Using 'as any' type assertion to suppress TypeScript errors
    const price = (crypto as any).price ?? (crypto as any).current_price ?? 0;
    const sellTimestamp = Date.now();
    
    // Generate unique ID
    const tradeId = `trade-${sellTimestamp}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Create the trade record
    const newTrade: Trade = {
      id: tradeId,
      cryptoId: crypto.id,
      cryptoName: crypto.name,
      type: 'sell',
      amount,
      price, // Now safely defined
      timestamp: sellTimestamp,
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
    
    // Record sellTimestamp for chart indicators
    position.sellTimestamp = sellTimestamp;
    
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
