import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Loader2, ArrowRight, RefreshCw, X } from 'lucide-react';
import useJupiterTrading from '../hooks/useJupiterTrading';

// Common tokens for the UI
const COMMON_TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
};

const JupiterTradeWidget: React.FC = () => {
  const { publicKey, connected } = useWallet();
  const [inputToken, setInputToken] = useState<string>(COMMON_TOKENS.SOL);
  const [outputToken, setOutputToken] = useState<string>(COMMON_TOKENS.USDC);
  const [inputAmount, setInputAmount] = useState<string>('');
  const [slippage, setSlippage] = useState<number>(0.5); // 0.5% default slippage
  
  const {
    executeSwap,
    cancelOrder,
    fetchOrders,
    getQuote,
    openOrders,
    filledOrders,
    isLoading,
    error,
  } = useJupiterTrading();
  
  const [quote, setQuote] = useState<{
    inAmount: string;
    outAmount: string;
    priceImpactPct: number;
    slippageBps: number;
  } | null>(null);
  
  const [activeTab, setActiveTab] = useState<'swap' | 'orders'>('swap');

  // Fetch quote when input changes
  useEffect(() => {
    const fetchQuote = async () => {
      if (!inputAmount || parseFloat(inputAmount) <= 0 || !publicKey) {
        setQuote(null);
        return;
      }
      
      try {
        const slippageBps = Math.round(slippage * 100);
        const quote = await getQuote(
          inputToken,
          outputToken,
          inputAmount,
          slippageBps
        );
        setQuote(quote);
      } catch (err) {
        console.error('Error fetching quote:', err);
        setQuote(null);
      }
    };
    
    const timeoutId = setTimeout(fetchQuote, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [inputToken, outputToken, inputAmount, slippage, publicKey, getQuote]);
  
  // Fetch orders on mount and when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchOrders();
    }
  }, [connected, publicKey, fetchOrders]);

  const handleSwap = async () => {
    if (!publicKey || !inputAmount || parseFloat(inputAmount) <= 0) return;
    
    try {
      const slippageBps = Math.round(slippage * 100);
      await executeSwap(inputToken, outputToken, inputAmount, slippageBps);
      
      // Reset form
      setInputAmount('');
      setQuote(null);
      
      // Refresh orders
      await fetchOrders();
    } catch (err) {
      console.error('Swap failed:', err);
    }
  };
  
  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    
    try {
      await cancelOrder(orderId);
      await fetchOrders();
    } catch (err) {
      console.error('Failed to cancel order:', err);
    }
  };
  
  const formatTokenAmount = (amount: string, decimals: number = 6) => {
    return parseFloat(amount) / Math.pow(10, decimals);
  };
  


  return (
    <div className="bg-background border border-neutral-700 rounded-lg p-6 w-full max-w-2xl">
      <div className="flex border-b border-neutral-700 mb-6">
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'swap' ? 'text-primary border-b-2 border-primary' : 'text-neutral-400'}`}
          onClick={() => setActiveTab('swap')}
        >
          Swap
        </button>
        <button
          className={`py-2 px-4 font-medium ${activeTab === 'orders' ? 'text-primary border-b-2 border-primary' : 'text-neutral-400'}`}
          onClick={() => setActiveTab('orders')}
        >
          My Orders ({openOrders.length})
        </button>
      </div>
      
      {activeTab === 'swap' ? (
        <div className="space-y-4">
          {/* Input Token */}
          <div className="bg-neutral-800 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <label className="text-sm text-neutral-400">From</label>
              <span className="text-sm text-neutral-400">Balance: -</span>
            </div>
            <div className="flex items-center">
              <input
                type="number"
                value={inputAmount}
                onChange={(e) => setInputAmount(e.target.value)}
                placeholder="0.0"
                className="bg-transparent text-2xl w-full text-white outline-none"
              />
              <select
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                className="bg-neutral-700 text-white rounded px-3 py-1 text-sm"
              >
                <option value={COMMON_TOKENS.SOL}>SOL</option>
                <option value={COMMON_TOKENS.USDC}>USDC</option>
                <option value={COMMON_TOKENS.USDT}>USDT</option>
                <option value={COMMON_TOKENS.BONK}>BONK</option>
              </select>
            </div>
          </div>
          
          {/* Swap Direction Toggle */}
          <div className="flex justify-center -my-2">
            <button 
              className="bg-neutral-700 p-2 rounded-full hover:bg-neutral-600 transition-colors"
              onClick={() => {
                setInputToken(outputToken);
                setOutputToken(inputToken);
              }}
            >
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
          </div>
          
          {/* Output Token */}
          <div className="bg-neutral-800 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <label className="text-sm text-neutral-400">To (estimated)</label>
              <span className="text-sm text-neutral-400">Balance: -</span>
            </div>
            <div className="flex items-center">
              <div className="text-2xl text-white w-full">
                {quote ? formatTokenAmount(quote.outAmount).toFixed(6) : '0.0'}
              </div>
              <select
                value={outputToken}
                onChange={(e) => setOutputToken(e.target.value)}
                className="bg-neutral-700 text-white rounded px-3 py-1 text-sm"
              >
                <option value={COMMON_TOKENS.USDC}>USDC</option>
                <option value={COMMON_TOKENS.SOL}>SOL</option>
                <option value={COMMON_TOKENS.USDT}>USDT</option>
                <option value={COMMON_TOKENS.BONK}>BONK</option>
              </select>
            </div>
            {quote && (
              <div className="mt-2 text-sm text-neutral-400">
                Price Impact: {quote.priceImpactPct ? `${quote.priceImpactPct.toFixed(2)}%` : 'N/A'}
              </div>
            )}
          </div>
          
          {/* Slippage Settings */}
          <div className="bg-neutral-800 p-4 rounded-lg">
            <label className="block text-sm text-neutral-400 mb-2">Slippage Tolerance</label>
            <div className="flex space-x-2">
              {[0.1, 0.5, 1.0].map((value) => (
                <button
                  key={value}
                  className={`px-3 py-1 rounded text-sm ${slippage === value ? 'bg-primary text-white' : 'bg-neutral-700 text-neutral-300'}`}
                  onClick={() => setSlippage(value)}
                >
                  {value}%
                </button>
              ))}
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  value={slippage}
                  onChange={(e) => setSlippage(parseFloat(e.target.value) || 0.5)}
                  className="w-full bg-neutral-700 text-white text-sm rounded px-3 py-1 text-right"
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 text-sm">%</span>
              </div>
            </div>
          </div>
          
          {/* Swap Button */}
          <button
            onClick={handleSwap}
            disabled={!connected || !inputAmount || parseFloat(inputAmount) <= 0 || isLoading}
            className={`w-full py-3 rounded-lg font-medium text-white ${!connected || !inputAmount || parseFloat(inputAmount) <= 0 || isLoading ? 'bg-neutral-700 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark'}`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                Processing...
              </div>
            ) : !connected ? (
              'Connect Wallet to Swap'
            ) : (
              'Swap Now'
            )}
          </button>
          
          {error && (
            <div className="text-red-500 text-sm mt-2">
              {error.message}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Open Orders</h3>
            <button
              onClick={fetchOrders}
              disabled={isLoading}
              className="text-primary hover:text-primary-dark flex items-center text-sm"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          {isLoading && openOrders.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
          ) : openOrders.length === 0 ? (
            <div className="text-center py-8 text-neutral-400">
              No open orders found
            </div>
          ) : (
            <div className="space-y-2">
              {openOrders.map((order) => (
                <div key={order.id} className="bg-neutral-800 p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">
                        {formatTokenAmount(order.inAmount)} → {formatTokenAmount(order.outAmount)}
                      </div>
                      <div className="text-sm text-neutral-400">
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="text-red-500 hover:text-red-400 p-1"
                      disabled={isLoading}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <h3 className="text-lg font-medium mt-8 mb-4">Order History</h3>
          {filledOrders.length === 0 ? (
            <div className="text-center py-8 text-neutral-400">
              No order history available
            </div>
          ) : (
            <div className="space-y-2">
              {filledOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="bg-neutral-800 p-4 rounded-lg">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-medium">
                        {formatTokenAmount(order.inAmount)} → {formatTokenAmount(order.outAmount)}
                      </div>
                      <div className="text-sm text-neutral-400">
                        {new Date(order.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className={`text-sm font-medium ${order.status === 'filled' ? 'text-green-500' : 'text-yellow-500'}`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JupiterTradeWidget;
