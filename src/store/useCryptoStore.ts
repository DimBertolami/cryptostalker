import { create } from 'zustand';
import { CryptoState, Trade, TradeableCrypto, Cryptocurrency, PurchaseEvent } from '../types';
import toast from 'react-hot-toast';

async function fetchNewCoinsFromCoinMarketCap(): Promise<Cryptocurrency[]> {
    try {
        const response = await fetch('/api/new-cryptos');
        if (!response.ok) throw new Error('Failed to fetch from CoinMarketCap');
        const data = await response.json();
        return data.map((c: any) => ({
            id: c.id,
            symbol: c.symbol,
            name: c.name,
            platform: c.platform?.name || 'unknown',
            current_price: c.current_price || 0,
            price_change_percentage_24h: c.price_change_percentage_24h || 0,
            market_cap: c.market_cap || 0,
            volume_24h: c.volume_24h || 0,
            date_added: c.date_added || new Date().toISOString()
        }));
    } catch (error) {
        console.error('Error fetching from CoinMarketCap:', error);
        return [];
    }
}

async function fetchNewCoinsFromCoinGecko(): Promise<Cryptocurrency[]> {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1');
        if (!response.ok) throw new Error('Failed to fetch from CoinGecko');
        const data = await response.json();
        return data.map((c: any) => ({
            id: c.id,
            symbol: c.symbol,
            name: c.name,
            platform: c.platform?.name || 'unknown',
            current_price: c.current_price || 0,
            price_change_percentage_24h: c.price_change_percentage_24h_in_currency || 0,
            market_cap: c.market_cap || 0,
            volume_24h: c.total_volume || 0,
            date_added: c.last_updated || new Date().toISOString()
        }));
    } catch (error) {
        console.error('Error fetching from CoinGecko:', error);
        return [];
    }
}

const useCryptoStore = create<CryptoState & { fetchSource: string; setFetchSource: (source: string) => void }>((set, get) => ({
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
  fetchSource: 'alpaca',
  setFetchSource: (source) => set({ fetchSource: source }),
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
  
  fetchCryptos: async () => {  
    try {
        set({ loading: true });
        
        const fetchSource = get().fetchSource;
        let allCryptos: Cryptocurrency[] = [];
        
        if (fetchSource === 'coingecko') {
            allCryptos = await fetchNewCoinsFromCoinGecko();
        } else if (fetchSource === 'coinmarketcap') {
            allCryptos = await fetchNewCoinsFromCoinMarketCap();
        }
        
        // Filter out any undefined prices
        allCryptos = allCryptos.filter(c => c.current_price !== undefined);
        
        // Save to Supabase
        if (allCryptos.length > 0) {
            try {
                const response = await fetch('/api/cryptocurrencies', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}` 
                    },
                    body: JSON.stringify(allCryptos)
                });
                
                if (!response.ok) {
                    console.error('Failed to save cryptos:', await response.json());
                }
            } catch (e) {
                console.error('Error saving cryptos:', e);
            }
        }
        
        set({ newCryptos: allCryptos, loading: false });
    } catch (error) {
        set({ 
            error: error instanceof Error ? error.message : String(error), 
            loading: false 
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
      
    }
},

buyManual: async (crypto: Cryptocurrency, amount: number, exchange: 'bitvavo' | 'binance'): Promise<Trade | undefined> => {
    const { isLiveTrading, isAutoTrading } = get();
    const tradeType = isLiveTrading ? 'Live' : 'Paper';

    const price = crypto.current_price ?? 0;
    if (price === 0 && amount > 0) { // Prevent division by zero or trading at zero price if amount is positive
        toast.error(`Cannot ${tradeType} buy ${crypto.symbol} at price $0.`);
        return undefined;
    }
    const buyTimestamp = Date.now();

    // Use CCXT generic endpoints for live trading with any exchange
    if (isLiveTrading) {
        try {
            if (!crypto.symbol) {
                toast.error('Crypto symbol is missing for trade.');
                return undefined;
            }

            let result: any;
            let actualAmount = amount;
            let actualPrice = price;
            let actualTimestamp = buyTimestamp;
            let tradeId = `trade-${buyTimestamp}-${Math.random().toString(36).substring(2, 9)}`;

            // Try to use CCXT endpoints first (for any exchange)
            try {
                // Import the CCXT service dynamically to avoid circular dependencies
                const { createOrder } = await import('../services/ccxtService');

                // Format the symbol correctly for CCXT (BTC/USDT format)
                const ccxtSymbol = `${crypto.symbol.toUpperCase()}/USDT`;

                // Create a market buy order using CCXT
                const orderResponse = await createOrder(
                    exchange,
                    ccxtSymbol,
                    'market',
                    'buy',
                    amount,
                    undefined // No price needed for market orders
                );

                result = orderResponse.order;
                actualAmount = result.amount || amount;
                actualPrice = result.price || price;
                actualTimestamp = result.timestamp || buyTimestamp;
                tradeId = result.id || `trade-${actualTimestamp}-${Math.random().toString(36).substring(2, 9)}`;

                console.log(`CCXT ${exchange} buy order successful:`, result);
            } catch (ccxtError: unknown) {
                const errorMessage = ccxtError instanceof Error ? ccxtError.message : 'Unknown error';
                console.error(`CCXT order failed, falling back to Bitvavo API:`, ccxtError);

                // Fall back to Bitvavo-specific endpoint if CCXT fails and exchange is bitvavo
                if (exchange === 'bitvavo') {
                    const marketSymbol = `${crypto.symbol.toUpperCase()}-EUR`;
                    const orderPayload = {
                        market: marketSymbol,
                        side: 'buy',
                        order_type: 'market',
                        payload: { amountQuote: (amount * price).toString() } // Bitvavo market buy is by quote currency amount
                    };

                    const response = await fetch('/api/bitvavo/order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(orderPayload),
                    });

                    result = await response.json();

                    if (!response.ok) {
                        console.error('Bitvavo API error:', result);
                        toast.error(`Bitvavo buy order failed: ${result.error || 'Server error'}`);
                        return undefined;
                    }

                    actualAmount = result.filledAmount ? parseFloat(result.filledAmount) : amount;
                    actualPrice = result.price ? parseFloat(result.price) : price;
                    actualTimestamp = result.createdTimestamp || buyTimestamp;
                    tradeId = result.orderId || `trade-${actualTimestamp}-${Math.random().toString(36).substring(2, 9)}`;
                } else {
                    // If not Bitvavo and CCXT failed, we can't proceed
                    toast.error(`${exchange} buy order failed: ${errorMessage || 'API error'}`);
                    return undefined;
                }
            }

            // Create trade record
            const newTrade: Trade = {
                id: tradeId, 
                cryptoId: crypto.id, 
                cryptoName: crypto.name, 
                type: 'buy',
                amount: actualAmount, 
                price: actualPrice, 
                timestamp: actualTimestamp,
                exchange,
                isAuto: isAutoTrading,
                isSimulated: false
            };

            set(state => ({ trades: [newTrade, ...state.trades] }));

            // Update portfolio with new position or add to existing position
            const existingPosition = get().portfolio.find(p => p.id === crypto.id);
            const purchaseEvent: PurchaseEvent = { 
                amount: actualAmount, 
                price: actualPrice, 
                timestamp: actualTimestamp 
            };
            
            if (existingPosition) {
                // Update existing position
                const updatedPortfolio = get().portfolio.map(p => {
                    if (p.id === crypto.id) {
                        const newBalance = p.balance + actualAmount;
                        const newAverageBuyPrice = newBalance > 0 ? 
                            ((p.balance * p.averageBuyPrice) + (actualAmount * actualPrice)) / newBalance : 0;
                        const currentMarketPrice = p.currentPrice || actualPrice;
                        const newProfitLoss = (currentMarketPrice - newAverageBuyPrice) * newBalance;
                        const newProfitLossPercentage = newAverageBuyPrice === 0 ? 0 : 
                            ((currentMarketPrice / newAverageBuyPrice) - 1) * 100;
                        const purchaseHistory = p.purchaseHistory ? 
                            [...p.purchaseHistory, purchaseEvent] : [purchaseEvent];
                        const additionalBuyTimestamps = p.additionalBuyTimestamps ? 
                            [...p.additionalBuyTimestamps] : [];
                        additionalBuyTimestamps.push({ 
                            timestamp: actualTimestamp, 
                            price: actualPrice, 
                            amount: actualAmount 
                        });
                        return {
                            ...p, 
                            balance: newBalance, 
                            averageBuyPrice: newAverageBuyPrice, 
                            profitLoss: newProfitLoss,
                            profitLossPercentage: newProfitLossPercentage, 
                            purchaseHistory, 
                            additionalBuyTimestamps,
                            latestBuyTimestamp: actualTimestamp, 
                            latestBuyPrice: actualPrice
                        };
                    }
                    return p;
                });
                set({ portfolio: updatedPortfolio });
            } else {
                // Create new position
                const newPosition: TradeableCrypto = {
                    id: crypto.id, 
                    name: crypto.name, 
                    symbol: crypto.symbol, 
                    balance: actualAmount,
                    averageBuyPrice: actualPrice, 
                    currentPrice: actualPrice, 
                    profitLoss: 0, 
                    profitLossPercentage: 0,
                    purchaseTimestamp: actualTimestamp, 
                    purchaseHistory: [purchaseEvent],
                    highestPrice: actualPrice, 
                    highestPriceTimestamp: actualTimestamp,
                    price_history: [{ timestamp: actualTimestamp, price: actualPrice }],
                    additionalBuyTimestamps: [{ 
                        timestamp: actualTimestamp, 
                        price: actualPrice, 
                        amount: actualAmount 
                    }],
                    latestBuyTimestamp: actualTimestamp, 
                    latestBuyPrice: actualPrice
                };
                set(state => ({ portfolio: [newPosition, ...state.portfolio] }));
            }

            toast.success(`Live ${exchange} buy: ${actualAmount.toFixed(6)} ${crypto.symbol.toUpperCase()} at $${actualPrice.toLocaleString()}`);
            return newTrade;

        } catch (error) {
            console.error('Failed to execute buy order (catch block):', error);
            toast.error(`Network error sending ${exchange} buy order.`);
            return undefined;
        }
    } else {
        // Paper trading or other exchange logic
        const tradeId = `trade-${buyTimestamp}-${Math.random().toString(36).substring(2, 9)}`;
        const newTrade: Trade = {
            id: tradeId, 
            cryptoId: crypto.id, 
            cryptoName: crypto.name, 
            type: 'buy', 
            amount, 
            price,
            timestamp: buyTimestamp, 
            exchange, 
            isAuto: isAutoTrading, 
            isSimulated: !isLiveTrading
        };

        set(state => ({ trades: [newTrade, ...state.trades] }));
        const currentPortfolio = get().portfolio; // Get latest portfolio state
        const existingPosition = currentPortfolio.find(p => p.id === crypto.id);
        const purchaseEvent: PurchaseEvent = { amount, price, timestamp: buyTimestamp };

        if (existingPosition) {
            const updatedPortfolio = currentPortfolio.map(p => {
                if (p.id === crypto.id) {
                    const newBalance = p.balance + amount;
                    const newAverageBuyPrice = newBalance > 0 ? 
                        ((p.balance * p.averageBuyPrice) + (amount * price)) / newBalance : 0;
                    const currentMarketPrice = p.currentPrice || price;
                    const newProfitLoss = (currentMarketPrice - newAverageBuyPrice) * newBalance;
                    const newProfitLossPercentage = newAverageBuyPrice === 0 ? 0 : 
                        ((currentMarketPrice / newAverageBuyPrice) - 1) * 100;
                    const purchaseHistory = p.purchaseHistory ? 
                        [...p.purchaseHistory, purchaseEvent] : [purchaseEvent];
                    const additionalBuyTimestamps = p.additionalBuyTimestamps ? 
                        [...p.additionalBuyTimestamps] : [];
                    additionalBuyTimestamps.push({ 
                        timestamp: buyTimestamp, 
                        price: price, 
                        amount: amount 
                    });
                    return {
                        ...p, 
                        balance: newBalance, 
                        averageBuyPrice: newAverageBuyPrice, 
                        profitLoss: newProfitLoss,
                        profitLossPercentage: newProfitLossPercentage, 
                        purchaseHistory, 
                        additionalBuyTimestamps,
                        latestBuyTimestamp: buyTimestamp, 
                        latestBuyPrice: price
                    };
                }
                return p;
            });
            set({ portfolio: updatedPortfolio });
        } else {
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
                highestPriceTimestamp: buyTimestamp,
                price_history: [{ timestamp: buyTimestamp, price: price }],
                additionalBuyTimestamps: [{ 
                    timestamp: buyTimestamp, 
                    price: price, 
                    amount: amount 
                }],
                latestBuyTimestamp: buyTimestamp, 
                latestBuyPrice: price
            };
            set(state => ({ portfolio: [newPosition, ...state.portfolio] }));
        }

        toast.success(`${tradeType} buy: ${amount} ${crypto.symbol.toUpperCase()} at $${price.toLocaleString()}`);
        return newTrade;
    }
},

sellManual: async (crypto: Cryptocurrency | TradeableCrypto, amount: number, exchange: 'bitvavo' | 'binance'): Promise<Trade | undefined> => {
  const { isLiveTrading, isAutoTrading } = get();
  const tradeType = isLiveTrading ? 'Live' : 'Paper';
  let price = 0;

  try {
    const { fetchCurrentPrice } = await import('../services/cryptoPriceService');
    const symbol = crypto.symbol;
    const fetchedPrice = await fetchCurrentPrice(symbol);
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

  // Check portfolio balance before attempting to sell
  const currentPortfolio = get().portfolio;
  const position = currentPortfolio.find(p => p.id === crypto.id);
  if (!position || position.balance < amount) {
    toast.error(`Insufficient balance to sell ${amount} ${crypto.symbol.toUpperCase()}`);
    return Promise.resolve(undefined);
  }

  if (isLiveTrading) {
    try {
      if (!crypto.symbol) {
        toast.error('Crypto symbol is missing for trade.');
        return Promise.resolve(undefined);
      }

      let result: any;
      let actualAmountSold = amount;
      let actualSellPrice = price;
      let actualTimestamp = sellTimestamp;
      let tradeId = `trade-${sellTimestamp}-${Math.random().toString(36).substring(2, 9)}`;

      // Try to use CCXT endpoints first (for any exchange)
      try {
        // Import the CCXT service dynamically to avoid circular dependencies
        const { createOrder } = await import('../services/ccxtService');

        // Format the symbol correctly for CCXT (BTC/USDT format)
        const ccxtSymbol = `${crypto.symbol.toUpperCase()}/USDT`;

        // Create a market sell order using CCXT
        const orderResponse = await createOrder(
          exchange,
          ccxtSymbol,
          'market',
          'sell',
          amount,
          undefined // No price needed for market orders
        );

        result = orderResponse.order;
        actualAmountSold = result.amount || amount;
        actualSellPrice = result.price || price;
        actualTimestamp = result.timestamp || sellTimestamp;
        tradeId = result.id || `trade-${actualTimestamp}-${Math.random().toString(36).substring(2, 9)}`;

        console.log(`CCXT ${exchange} sell order successful:`, result);
      } catch (ccxtError: unknown) {
        const errorMessage = ccxtError instanceof Error ? ccxtError.message : 'Unknown error';
        console.error(`CCXT order failed, falling back to Bitvavo API:`, ccxtError);

        // Fall back to Bitvavo-specific endpoint if CCXT fails and exchange is bitvavo
        if (exchange === 'bitvavo') {
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

          result = await response.json();

          if (!response.ok) {
            console.error('Bitvavo API error:', result);
            toast.error(`Bitvavo sell order failed: ${result.error || 'Server error'}`);
            return Promise.resolve(undefined);
          }

          actualAmountSold = result.filledAmount ? parseFloat(result.filledAmount) : amount;
          actualSellPrice = result.price ? parseFloat(result.price) : price;
          actualTimestamp = result.createdTimestamp || sellTimestamp;
          tradeId = result.orderId || `trade-${actualTimestamp}-${Math.random().toString(36).substring(2, 9)}`;
        } else {
          // If not Bitvavo and CCXT failed, we can't proceed
          toast.error(`${exchange} sell order failed: ${errorMessage || 'API error'}`);
          return Promise.resolve(undefined);
        }
      }

      // Create trade record
      const newTrade: Trade = {
        id: tradeId,
        cryptoId: crypto.id,
        cryptoName: crypto.name,
        type: 'sell',
        amount: actualAmountSold,
        price: actualSellPrice,
        timestamp: actualTimestamp,
        exchange,
        isAuto: isAutoTrading,
        isSimulated: false
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
        positionToUpdate.balance -= actualAmountSold;
        set({ portfolio: portfolioAfterTrade });
      }

      toast.success(`Live ${exchange} sell: ${actualAmountSold.toFixed(6)} ${crypto.symbol.toUpperCase()} at $${actualSellPrice.toLocaleString()}`);
      return Promise.resolve(newTrade);

    } catch (error) {
      console.error(`Failed to execute ${exchange} sell order (catch block):`, error);
      toast.error(`Network error sending ${exchange} sell order.`);
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
      id: tradeId,
      cryptoId: crypto.id,
      cryptoName: crypto.name,
      type: 'sell',
      amount,
      price,
      timestamp: sellTimestamp,
      exchange,
      isAuto: isAutoTrading,
      isSimulated: !isLiveTrading
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
      position.balance -= amount;
      set({ portfolio: currentPortfolio });
    }

    toast.success(`${tradeType} sell: ${amount} ${crypto.symbol.toUpperCase()} at $${price.toLocaleString()}`);
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
