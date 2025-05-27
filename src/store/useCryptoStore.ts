import { create } from 'zustand';
import { CryptoState, Trade, TradeableCrypto, Cryptocurrency, PurchaseEvent } from '../types';

// Define a type for the API response that includes all possible fields
interface ApiCryptocurrency extends Omit<Cryptocurrency, 'price_history' | 'consecutive_decreases'> {
  price_history?: number[];
  consecutive_decreases?: number;
}

// Helper function to create a Cryptocurrency object with all required fields
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
import { fetchNewCryptocurrencies, fetchCryptoById } from '../services/apiService';
import toast from 'react-hot-toast';

const useCryptoStore = create<CryptoState>((set, get) => ({
  cryptos: [],
  newCryptos: [],
  highValueCryptos: [],
  showAllCryptos: false,
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
  tradeSettings: {
    walletAllocation: {},
    strategyParams: {
      linear: {
        buyThreshold: 5,
        sellThreshold: 10
      },
      volatile: {
        volatilityThreshold: 15,
        quickSellThreshold: 5,
        quickBuyThreshold: 3
      }
    }
  },

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
  
  setShowAllCryptos: (showAll) => set({ showAllCryptos: showAll }),
  
  fetchCryptos: async (showAll = false) => {
    const { isPaused, autoRefresh, focusedMonitoring, monitoredCrypto } = get();
    
    if (isPaused) return;
    
    // If showing all cryptos, just fetch without any filters
    if (showAll || get().showAllCryptos) {
      set({ loading: true, error: null });
      try {
        const allCryptos = await fetchNewCryptocurrencies();
        const mappedCryptos = allCryptos.map((c: any): Cryptocurrency => {
          const price = c.current_price ?? c.price ?? 0;
          const volume24h = c.volume_24h ?? 0;
          const marketCap = c.market_cap ?? 0;
          const priceChange24h = c.price_change_percentage_24h ?? 0;
          const totalVolume = c.total_volume ?? 0;
          
          return {
            id: c.id || '',
            name: c.name || '',
            symbol: c.symbol || '',
            current_price: price,
            price_change_percentage_24h: priceChange24h,
            market_cap: marketCap,
            total_volume: totalVolume,
            age_hours: c.age_hours ?? null,
            date_added: c.date_added || new Date().toISOString(),
            volume_24h: volume24h,
            price_history: [],
            consecutive_decreases: 0
          } as Cryptocurrency;
        });
        
        const processedCryptos = mappedCryptos.map((c: any): Cryptocurrency => {
          const price = c.current_price ?? c.price ?? 0;
          const volume24h = c.volume_24h ?? 0;
          const marketCap = c.market_cap ?? 0;
          const priceChange24h = c.price_change_percentage_24h ?? 0;
          const totalVolume = c.total_volume ?? 0;
          
          return {
            id: c.id || '',
            name: c.name || '',
            symbol: c.symbol || '',
            current_price: price,
            price_change_percentage_24h: priceChange24h,
            market_cap: marketCap,
            total_volume: totalVolume,
            age_hours: c.age_hours ?? null,
            date_added: c.date_added || new Date().toISOString(),
            volume_24h: volume24h,
            price_history: [],
            consecutive_decreases: 0
          };
        });
        
        // Update state with the processed data
        set({
          cryptos: processedCryptos,
          loading: false,
          error: null,
          lastUpdated: new Date().toISOString()
        });
        
        // If we're showing all cryptos, update the newCryptos as well
        if (get().showAllCryptos) {
          set({
            newCryptos: processedCryptos
          });
        }
        return;
      } catch (error) {
        console.error('Error fetching all cryptos:', error);
        set({ error: 'Failed to fetch all cryptocurrencies', loading: false });
        return;
      }
    }
    
    try {
      // If focused monitoring is on and we have a monitored crypto,
      // only fetch data for that specific crypto
      if (focusedMonitoring && monitoredCrypto && autoRefresh) {
        set({ loading: true, error: null });
        
        console.log(`🔍 Focused monitoring enabled for ${monitoredCrypto.name}...`);
        
        // Only fetch the monitored coin to reduce API calls
        const singleCoin = await fetchCryptoById(monitoredCrypto.id);
        if (!singleCoin) throw new Error(`Failed to fetch data for ${monitoredCrypto.name}`);
        
        // Update just this coin's price history
        const { highValueCryptos } = get();
        const updatedHighValueCryptos = [...highValueCryptos];
        
        const existingIndex = updatedHighValueCryptos.findIndex(c => c.id === singleCoin.id);
        if (existingIndex >= 0) {
          const existingCrypto = updatedHighValueCryptos[existingIndex];
          const priceHistory = [...(existingCrypto.price_history || [])];
          
          // Get the current price safely
          const currentPrice = singleCoin.current_price ?? 0;
          
          // Always add price to history
          priceHistory.push({ timestamp: Date.now(), price: currentPrice });
          
          // Keep only the last 100 price points
          if (priceHistory.length > 100) {
            priceHistory.shift();
          }
          
          // Calculate consecutive price decreases
          let consecutiveDecreases = 0;
          if (priceHistory.length >= 2) {
            for (let i = priceHistory.length - 1; i > 0; i--) {
              if (priceHistory[i] < priceHistory[i - 1]) {
                consecutiveDecreases++;
              } else {
                break;
              }
            }
          }
                    // Create a safe crypto object with all required fields
          const updatedCrypto: Cryptocurrency = {
            id: singleCoin.id || '',
            name: singleCoin.name || '',
            symbol: singleCoin.symbol || '',
            current_price: singleCoin.current_price ?? 0,
            price_change_percentage_24h: singleCoin.price_change_percentage_24h ?? 0,
            market_cap: singleCoin.market_cap ?? 0,
            // Use volume_24h instead of total_volume to match the Cryptocurrency interface
            volume_24h: singleCoin.volume_24h ?? 0,
            age_hours: singleCoin.age_hours ?? 0,
            date_added: singleCoin.date_added || new Date().toISOString(),
            price_history: Array.isArray(existingCrypto?.price_history) ? 
              [...existingCrypto.price_history, singleCoin.current_price ?? 0] : 
              [singleCoin.current_price ?? 0],
            consecutive_decreases: existingCrypto ? 
              ((singleCoin.current_price ?? 0) < (existingCrypto.current_price ?? 0) ? 
                ((existingCrypto as any).consecutive_decreases || 0) + 1 : 0) : 0
          } as Cryptocurrency;
          
          updatedHighValueCryptos[existingIndex] = updatedCrypto;
        } else {
          // Add new high value crypto with safe default value
          const safePrice = singleCoin.current_price ?? 0;
          const newCrypto: Cryptocurrency = {
            id: singleCoin.id || '',
            name: singleCoin.name || '',
            symbol: singleCoin.symbol || '',
            current_price: safePrice,
            price_change_percentage_24h: singleCoin.price_change_percentage_24h ?? 0,
            market_cap: singleCoin.market_cap ?? 0,
            // Use volume_24h instead of total_volume to match the Cryptocurrency interface
            volume_24h: singleCoin.volume_24h ?? 0,
            age_hours: singleCoin.age_hours ?? 0,
            date_added: singleCoin.date_added || new Date().toISOString(),
            price_history: [{ timestamp: Date.now(), price: safePrice }],
            consecutive_decreases: 0
          } as Cryptocurrency;
          
          updatedHighValueCryptos.push(newCrypto);
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
        const cryptoToCheck = updatedHighValueCryptos[existingIndex];
        const consecutiveDecreases = 'consecutive_decreases' in cryptoToCheck ? 
          (cryptoToCheck as any).consecutive_decreases as number : 0;
          
        if (existingIndex >= 0 && consecutiveDecreases >= 3) {
          const position = updatedPortfolio.find(p => p.id === singleCoin.id);
          if (position) {
            const currentPrice = singleCoin.current_price ?? 0;
            const profit = (currentPrice - position.averageBuyPrice) * position.balance;
            const profitPercent = ((currentPrice / position.averageBuyPrice) - 1) * 100;
            
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
            const singleCoinData = singleCoin as unknown as ApiCryptocurrency;
            const cryptoToSell = createCryptocurrency({
              id: singleCoinData.id,
              name: singleCoinData.name,
              symbol: singleCoinData.symbol,
              current_price: singleCoinData.current_price,
              price_change_percentage_24h: singleCoinData.price_change_percentage_24h,
              market_cap: singleCoinData.market_cap,
              total_volume: singleCoinData.total_volume ?? singleCoinData.volume_24h,
              age_hours: singleCoinData.age_hours,
              volume_24h: singleCoinData.volume_24h,
              date_added: singleCoinData.date_added
            });
            
            get().sellManual(cryptoToSell, 1, 'bitvavo');
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
        const processedCryptos = cryptocurrencies.map((crypto: any): Cryptocurrency => {
          // Calculate age in hours
          const dateAdded = crypto.date_added ? new Date(crypto.date_added) : null;
          const now = new Date();
          const ageInHours = dateAdded ? (now.getTime() - dateAdded.getTime()) / (1000 * 60 * 60) : null;
          
          return {
            id: crypto.id || '',
            name: crypto.name || '',
            symbol: crypto.symbol || '',
            current_price: crypto.current_price ?? 0,
            price_change_percentage_24h: crypto.price_change_percentage_24h ?? 0,
            market_cap: crypto.market_cap ?? 0,
            total_volume: crypto.total_volume ?? 0,
            age_hours: ageInHours,
            date_added: crypto.date_added || new Date().toISOString(),
            volume_24h: crypto.volume_24h ?? 0,
            price_history: [],
            consecutive_decreases: 0
          };
        });
        
        // Filter for new coins - any coin added in the last 24 hours
        // First ensure we have valid date_added and age_hours values
        const validatedCryptos = processedCryptos.map(crypto => {
            // If age_hours is missing, calculate it from date_added
            if ((crypto as any).age_hours === undefined && crypto.date_added) {
                try {
                    const addedDate = new Date(crypto.date_added);
                    const now = new Date();
                    const ageHours = (now.getTime() - addedDate.getTime()) / (1000 * 60 * 60);
                    return { ...crypto, age_hours: ageHours };
                } catch (e) {
                    console.error('Error calculating age for crypto:', crypto.name, e);
                    return crypto;
                }
            }
            return crypto;
        });

        // We no longer need mock data as we're using real-time CoinMarketCap data

        // Filter for new coins - any coin added in the last 24 hours
        let newCryptos = validatedCryptos.filter(crypto => {
            const age = (crypto as any).age_hours;
            return age !== undefined && age < 24;
        });

        // Log the number of new coins found
        if (newCryptos.length === 0) {
            console.log('No new coins found in the last 24 hours');
        } else {
            console.log(`Found ${newCryptos.length} new coins in the last 24 hours`);
        }

        // Filter for high value coins - any with a market cap over $1M or volume over $500K
        const highValueCryptos = newCryptos.filter(crypto => {
            const marketCap = crypto.market_cap || 0;
            const volume = crypto.volume_24h || crypto.total_volume || 0;
            return marketCap > 1000000 || volume > 500000;
        });
        
        console.log(`Found ${newCryptos.length} new coins, ${highValueCryptos.length} high value`);
        if (highValueCryptos.length > 0) {
          console.log('High value coins:');
          highValueCryptos.forEach((coin, index) => {
            console.log(`${index + 1}) ${coin.name} (${coin.symbol.toUpperCase()})`);
          });
        }
        
        // Auto-buy high value coins if auto-trading is enabled
        const { isAutoTrading } = get();
        
        if (isAutoTrading && highValueCryptos.length > 0 && !get().monitoredCrypto) {
          // Randomly select one high value coin to buy
          const randomIndex = Math.floor(Math.random() * highValueCryptos.length);
          const coinToBuy = highValueCryptos[randomIndex];
          
          // Buy the coin
          // Remove unused boughtTrade variable and directly call buyManual
        get().buyManual(coinToBuy, 1, 'bitvavo');
          
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

      // Build new price history array capped to 500 points
      const updatedHistory = Array.isArray(position.price_history)
        ? [...position.price_history, { timestamp: Date.now(), price: newPrice }]
        : [{ timestamp: Date.now(), price: newPrice }];
      if (updatedHistory.length > 500) {
        updatedHistory.shift();
      }

      // Calculate consecutive decreases (based on last two entries)
      let consecutiveDecreases = 0;
      if (updatedHistory.length >= 2) {
        const len = updatedHistory.length;
        if (updatedHistory[len - 1].price < updatedHistory[len - 2].price) {
          consecutiveDecreases = (position.consecutive_decreases || 0) + 1;
        } else {
          consecutiveDecreases = 0;
        }
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
            highestPriceTimestamp,
            price_history: updatedHistory,
            consecutive_decreases: consecutiveDecreases
          } as any;
        }
        return p;
      });
      
      set({ portfolio: updatedPortfolio });
    }
  },
  
  buyManual: async (crypto: Cryptocurrency, amount: number, exchange: 'bitvavo' | 'binance'): Promise<Trade | undefined> => {
    const { isLiveTrading, isAutoTrading } = get();
    const tradeType = isLiveTrading ? 'Live' : 'Paper';

    const price = (crypto as any).price ?? (crypto as any).current_price ?? 0;
    if (price === 0 && amount > 0) { // Prevent division by zero or trading at zero price if amount is positive
        toast.error(`Cannot ${tradeType} buy ${crypto.symbol} at price $0.`);
        return Promise.resolve(undefined);
    }
    const buyTimestamp = Date.now();

    if (isLiveTrading && exchange === 'bitvavo') {
      try {
        if (!crypto.symbol) {
            toast.error('Crypto symbol is missing for Bitvavo trade.');
            return Promise.resolve(undefined);
        }
        const marketSymbol = `${crypto.symbol.toUpperCase()}-EUR`;
        const orderPayload = {
          market: marketSymbol,
          side: 'buy',
          order_type: 'market',
          payload: { amountQuote: (amount * price).toString() } // Bitvavo market buy is by quote currency amount
        };
        
        // console.log('Attempting Bitvavo live buy with payload:', orderPayload);

        const response = await fetch('/api/bitvavo/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('Bitvavo API error:', result);
          toast.error(`Bitvavo buy order failed: ${result.error || 'Server error'}`);
          return Promise.resolve(undefined);
        }
        
        // console.log('Bitvavo live buy successful:', result);

        const actualAmount = result.filledAmount ? parseFloat(result.filledAmount) : amount; 
        const actualPrice = result.price ? parseFloat(result.price) : price; 
        const actualTimestamp = result.createdTimestamp || buyTimestamp;

        const tradeId = result.orderId || `trade-${actualTimestamp}-${Math.random().toString(36).substring(2, 9)}`;
        const newTrade: Trade = {
          id: tradeId, cryptoId: crypto.id, cryptoName: crypto.name, type: 'buy',
          amount: actualAmount, price: actualPrice, timestamp: actualTimestamp,
          exchange, isAuto: isAutoTrading, isSimulated: false
        };
        
        set(state => ({ trades: [newTrade, ...state.trades] }));
        
        const currentPortfolio = get().portfolio; // Get latest portfolio state
        const existingPosition = currentPortfolio.find(p => p.id === crypto.id);
        const purchaseEvent: PurchaseEvent = { amount: actualAmount, price: actualPrice, timestamp: actualTimestamp };

        if (existingPosition) {
          const updatedPortfolio = currentPortfolio.map(p => {
            if (p.id === crypto.id) {
              const newBalance = p.balance + actualAmount;
              const newAverageBuyPrice = newBalance > 0 ? ((p.balance * p.averageBuyPrice) + (actualAmount * actualPrice)) / newBalance : 0;
              const currentMarketPrice = p.currentPrice || actualPrice;
              const newProfitLoss = (currentMarketPrice - newAverageBuyPrice) * newBalance;
              const newProfitLossPercentage = newAverageBuyPrice === 0 ? 0 : ((currentMarketPrice / newAverageBuyPrice) - 1) * 100;
              const purchaseHistory = p.purchaseHistory ? [...p.purchaseHistory, purchaseEvent] : [purchaseEvent];
              const additionalBuyTimestamps = p.additionalBuyTimestamps ? [...p.additionalBuyTimestamps] : [];
              additionalBuyTimestamps.push({ timestamp: actualTimestamp, price: actualPrice, amount: actualAmount });
              return {
                ...p, balance: newBalance, averageBuyPrice: newAverageBuyPrice, profitLoss: newProfitLoss,
                profitLossPercentage: newProfitLossPercentage, purchaseHistory, additionalBuyTimestamps,
                latestBuyTimestamp: actualTimestamp, latestBuyPrice: actualPrice
              };
            }
            return p;
          });
          set({ portfolio: updatedPortfolio });
        } else {
          const newPosition: TradeableCrypto = {
            id: crypto.id, name: crypto.name, symbol: crypto.symbol, balance: actualAmount,
            averageBuyPrice: actualPrice, currentPrice: actualPrice, profitLoss: 0, profitLossPercentage: 0,
            purchaseTimestamp: actualTimestamp, purchaseHistory: [purchaseEvent],
            highestPrice: actualPrice, highestPriceTimestamp: actualTimestamp,
            price_history: [{ timestamp: actualTimestamp, price: actualPrice }],
            additionalBuyTimestamps: [{ timestamp: actualTimestamp, price: actualPrice, amount: actualAmount }],
            latestBuyTimestamp: actualTimestamp, latestBuyPrice: actualPrice
          };
          set(state => ({ portfolio: [newPosition, ...state.portfolio] }));
        }

        toast.success(`Live Bitvavo buy: ${actualAmount.toFixed(6)} ${crypto.symbol.toUpperCase()} at $${actualPrice.toLocaleString()}`);
        return Promise.resolve(newTrade);

      } catch (error) {
        console.error('Failed to execute Bitvavo buy order (catch block):', error);
        toast.error('Network error sending Bitvavo buy order.');
        return Promise.resolve(undefined);
      }
    } else {
      // Paper trading or other exchange logic
      const tradeId = `trade-${buyTimestamp}-${Math.random().toString(36).substring(2, 9)}`;
      const newTrade: Trade = {
        id: tradeId, cryptoId: crypto.id, cryptoName: crypto.name, type: 'buy', amount, price,
        timestamp: buyTimestamp, exchange, isAuto: isAutoTrading, isSimulated: !isLiveTrading
      };
      
      set(state => ({ trades: [newTrade, ...state.trades] }));
      const currentPortfolio = get().portfolio; // Get latest portfolio state
      const existingPosition = currentPortfolio.find(p => p.id === crypto.id);
      const purchaseEvent: PurchaseEvent = { amount, price, timestamp: buyTimestamp };

      if (existingPosition) {
        const updatedPortfolio = currentPortfolio.map(p => {
          if (p.id === crypto.id) {
            const newBalance = p.balance + amount;
            const newAverageBuyPrice = newBalance > 0 ? ((p.balance * p.averageBuyPrice) + (amount * price)) / newBalance : 0;
            const currentMarketPrice = p.currentPrice || price;
            const newProfitLoss = (currentMarketPrice - newAverageBuyPrice) * newBalance;
            const newProfitLossPercentage = newAverageBuyPrice === 0 ? 0 : ((currentMarketPrice / newAverageBuyPrice) - 1) * 100;
            const purchaseHistory = p.purchaseHistory ? [...p.purchaseHistory, purchaseEvent] : [purchaseEvent];
            const additionalBuyTimestamps = p.additionalBuyTimestamps ? [...p.additionalBuyTimestamps] : [];
            additionalBuyTimestamps.push({ timestamp: buyTimestamp, price: price, amount: amount });
            return {
              ...p, balance: newBalance, averageBuyPrice: newAverageBuyPrice, profitLoss: newProfitLoss,
              profitLossPercentage: newProfitLossPercentage, purchaseHistory, additionalBuyTimestamps,
              latestBuyTimestamp: buyTimestamp, latestBuyPrice: price
            };
          }
          return p;
        });
        set({ portfolio: updatedPortfolio });
      } else {
        const newPosition: TradeableCrypto = {
          id: crypto.id, name: crypto.name, symbol: crypto.symbol, balance: amount,
          averageBuyPrice: price, currentPrice: price, profitLoss: 0, profitLossPercentage: 0,
          purchaseTimestamp: buyTimestamp, purchaseHistory: [purchaseEvent],
          highestPrice: price, highestPriceTimestamp: buyTimestamp,
          price_history: [{ timestamp: buyTimestamp, price: price }],
          additionalBuyTimestamps: [{ timestamp: buyTimestamp, price: price, amount: amount }],
          latestBuyTimestamp: buyTimestamp, latestBuyPrice: price
        };
        set(state => ({ portfolio: [newPosition, ...state.portfolio] }));
      }

      toast.success(`${tradeType} buy: ${amount} ${crypto.symbol.toUpperCase()} at $${price.toLocaleString()}`);
      return Promise.resolve(newTrade);
    }
  },

  sellManual: async (crypto: Cryptocurrency | TradeableCrypto, amount: number, exchange: 'bitvavo' | 'binance'): Promise<Trade | undefined> => {
    const { isLiveTrading, isAutoTrading } = get();
    const tradeType = isLiveTrading ? 'Live' : 'Paper';
    let price = 0;

    try {
      const { fetchCurrentPrice } = await import('../services/cryptoPriceService');
      const symbol = crypto.symbol;
      const averageBuyPrice = 'averageBuyPrice' in crypto ? crypto.averageBuyPrice : 0;
      const fetchedPrice = await fetchCurrentPrice(symbol, averageBuyPrice);
      if (fetchedPrice && fetchedPrice > 0) {
        price = fetchedPrice;
      } else {
        throw new Error('Failed to get valid current price from API');
      }
    } catch (error) {
      console.error('Error fetching current price for sell:', error);
      if ('currentPrice' in crypto && crypto.currentPrice && crypto.currentPrice > 0) {
        price = crypto.currentPrice;
      } else if ((crypto as any).price && (crypto as any).price > 0) {
        price = (crypto as any).price;
      } else if ('averageBuyPrice' in crypto && crypto.averageBuyPrice && crypto.averageBuyPrice > 0) {
        price = crypto.averageBuyPrice * 1.05; // Fallback to 5% above avg buy price
        toast.error(`Price fetch failed. Using 5% above average buy price for ${crypto.symbol}.`);
      } else {
        toast.error(`Cannot determine a valid price to sell ${crypto.symbol}.`);
        return Promise.resolve(undefined);
      }
    }

    const sellTimestamp = Date.now();

    if (isLiveTrading && exchange === 'bitvavo') {
      try {
        if (!crypto.symbol) {
            toast.error('Crypto symbol is missing for Bitvavo trade.');
            return Promise.resolve(undefined);
        }
        const currentPortfolio = get().portfolio;
        const position = currentPortfolio.find(p => p.id === crypto.id);
        if (!position || position.balance < amount) {
          toast.error(`Insufficient balance to sell ${amount} ${crypto.symbol.toUpperCase()}`);
          return Promise.resolve(undefined);
        }

        const marketSymbol = `${crypto.symbol.toUpperCase()}-EUR`;
        const orderPayload = {
          market: marketSymbol,
          side: 'sell',
          order_type: 'market',
          payload: { amount: amount.toString() } // Bitvavo market sell is by base currency amount
        };

        const response = await fetch('/api/bitvavo/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('Bitvavo API error:', result);
          toast.error(`Bitvavo sell order failed: ${result.error || 'Server error'}`);
          return Promise.resolve(undefined);
        }

        const actualAmountSold = result.filledAmount ? parseFloat(result.filledAmount) : amount;
        const actualSellPrice = result.price ? parseFloat(result.price) : price;
        const actualTimestamp = result.createdTimestamp || sellTimestamp;

        const tradeId = result.orderId || `trade-${actualTimestamp}-${Math.random().toString(36).substring(2, 9)}`;
        const newTrade: Trade = {
          id: tradeId, cryptoId: crypto.id, cryptoName: crypto.name, type: 'sell',
          amount: actualAmountSold, price: actualSellPrice, timestamp: actualTimestamp,
          exchange, isAuto: isAutoTrading, isSimulated: false
        };

        set(state => ({ trades: [newTrade, ...state.trades] }));
        
        // Re-fetch portfolio to ensure we have the latest state before updating
        const portfolioAfterTrade = get().portfolio;
        const positionToUpdate = portfolioAfterTrade.find(p => p.id === crypto.id);

        if (!positionToUpdate) { // Should not happen if initial check passed
            console.error('Error: Position disappeared before sell update.');
            toast.error('Portfolio update error after sell.');
            return Promise.resolve(newTrade); // Return trade, but portfolio might be inconsistent
        }

        positionToUpdate.sellTimestamp = actualTimestamp;
        positionToUpdate.sellPrice = actualSellPrice;
        const profitLoss = (actualSellPrice - positionToUpdate.averageBuyPrice) * actualAmountSold;

        if (positionToUpdate.balance <= actualAmountSold) { // Using <= to handle potential float precision issues
          set(state => ({ portfolio: state.portfolio.filter(p => p.id !== crypto.id) }));
          const profitLossPercentage = positionToUpdate.averageBuyPrice === 0 ? 0 : ((actualSellPrice / positionToUpdate.averageBuyPrice) - 1) * 100;
          console.log(`Sold entire position of ${crypto.symbol}: Profit/Loss: $${profitLoss.toFixed(6)} (${profitLossPercentage.toFixed(2)}%)`);
        } else {
          const updatedPortfolio = portfolioAfterTrade.map(p => {
            if (p.id === crypto.id) {
              const newBalance = p.balance - actualAmountSold;
              // Average buy price doesn't change on sell
              const currentMarketPrice = p.currentPrice || actualSellPrice;
              const newNetProfitLoss = (currentMarketPrice - p.averageBuyPrice) * newBalance; // Profit/loss on remaining balance
              const newNetProfitLossPercentage = p.averageBuyPrice === 0 ? 0 : ((currentMarketPrice / p.averageBuyPrice) - 1) * 100;
              return {
                ...p, balance: newBalance, profitLoss: newNetProfitLoss,
                profitLossPercentage: newNetProfitLossPercentage,
              };
            }
            return p;
          });
          set({ portfolio: updatedPortfolio });
        }

        toast.success(`Live Bitvavo sell: ${actualAmountSold.toFixed(6)} ${crypto.symbol.toUpperCase()} at $${actualSellPrice.toLocaleString()}`);
        return Promise.resolve(newTrade);

      } catch (error) {
        console.error('Failed to execute Bitvavo sell order (catch block):', error);
        toast.error('Network error sending Bitvavo sell order.');
        return Promise.resolve(undefined);
      }
    } else {
      // Paper trading or other exchange logic
      const currentPortfolio = get().portfolio;
      const position = currentPortfolio.find(p => p.id === crypto.id);

      if (!position || position.balance < amount) {
        toast.error(`Insufficient balance to sell ${amount} ${crypto.symbol.toUpperCase()}`);
        return Promise.resolve(undefined); // Changed from 'return;' to match Promise return type
      }

      const tradeId = `trade-${sellTimestamp}-${Math.random().toString(36).substring(2, 9)}`;
      const newTrade: Trade = {
        id: tradeId, cryptoId: crypto.id, cryptoName: crypto.name, type: 'sell', amount, price,
        timestamp: sellTimestamp, exchange, isAuto: isAutoTrading, isSimulated: !isLiveTrading
      };

      set(state => ({ trades: [newTrade, ...state.trades] }));
      
      position.sellTimestamp = sellTimestamp;
      position.sellPrice = price;
      const profitLoss = (price - position.averageBuyPrice) * amount;
      const profitLossPercentage = position.averageBuyPrice === 0 ? 0 : ((price / position.averageBuyPrice) - 1) * 100;

      if (position.balance === amount) {
        set(state => ({ portfolio: state.portfolio.filter(p => p.id !== crypto.id) }));
        console.log(`Sold entire position of ${crypto.symbol}: Profit/Loss: $${profitLoss.toFixed(6)} (${profitLossPercentage.toFixed(2)}%)`);
      } else {
        const updatedPortfolio = currentPortfolio.map(p => {
          if (p.id === crypto.id) {
            const newBalance = p.balance - amount;
            const currentMarketPrice = p.currentPrice || price;
            const newNetProfitLoss = (currentMarketPrice - p.averageBuyPrice) * newBalance;
            const newNetProfitLossPercentage = p.averageBuyPrice === 0 ? 0 : ((currentMarketPrice / p.averageBuyPrice) - 1) * 100;
            return {
              ...p, balance: newBalance, profitLoss: newNetProfitLoss,
              profitLossPercentage: newNetProfitLossPercentage,
            };
          }
          return p;
        });
        set({ portfolio: updatedPortfolio });
      }

      toast.success(`${tradeType} sell: ${amount} ${crypto.symbol.toUpperCase()} at $${price.toFixed(6)}`);
      return Promise.resolve(newTrade);
    }
  },
  
  updateTradeSettings: (newSettings: CryptoState['tradeSettings']) => {
    set({ tradeSettings: newSettings });
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
