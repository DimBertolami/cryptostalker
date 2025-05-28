import React, { useState, useEffect } from 'react';
import { 
  fetchExchangeBalance, 
  createOrder, 
  fetchOpenOrders, 
  cancelOrder,
  Balance,
  Order
} from '../services/ccxtService';
import useExchangeStore from '../store/useExchangeStore';

const TradingPanel: React.FC = () => {
  const { exchanges } = useExchangeStore();
  const [selectedExchange, setSelectedExchange] = useState<string>('');
  const [balance, setBalance] = useState<Balance | null>(null);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Order form state
  const [symbol, setSymbol] = useState<string>('BTC/USDT');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  
  // Get available exchanges from the store
  const availableExchanges = Object.entries(exchanges)
    .filter(([_, config]) => config.connected)
    .map(([id, _]) => id);
  
  // Load balance when exchange is selected
  useEffect(() => {
    if (selectedExchange) {
      loadBalance();
      loadOpenOrders();
    }
  }, [selectedExchange]);
  
  const loadBalance = async () => {
    if (!selectedExchange) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetchExchangeBalance(selectedExchange);
      setBalance(response.balance);
    } catch (err: any) {
      setError(`Failed to load balance: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadOpenOrders = async () => {
    if (!selectedExchange) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetchOpenOrders(selectedExchange);
      setOpenOrders(response.open_orders);
    } catch (err: any) {
      setError(`Failed to load open orders: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedExchange || !symbol || !amount) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (orderType === 'limit' && !price) {
      setError('Price is required for limit orders');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      const response = await createOrder(
        selectedExchange,
        symbol,
        orderType,
        side,
        parseFloat(amount),
        price ? parseFloat(price) : undefined
      );
      
      setSuccessMessage(`Order created successfully! Order ID: ${response.order.id}`);
      
      // Reset form
      setAmount('');
      setPrice('');
      
      // Refresh data
      loadBalance();
      loadOpenOrders();
    } catch (err: any) {
      setError(`Failed to create order: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCancelOrder = async (orderId: string, orderSymbol: string) => {
    if (!selectedExchange) return;
    
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      await cancelOrder(selectedExchange, orderId, orderSymbol);
      setSuccessMessage(`Order ${orderId} cancelled successfully`);
      
      // Refresh open orders
      loadOpenOrders();
      loadBalance();
    } catch (err: any) {
      setError(`Failed to cancel order: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-white mb-4">Trading Panel</h2>
      
      {/* Exchange Selection */}
      <div className="mb-6">
        <label className="block text-sm text-neutral-400 mb-1">Select Exchange</label>
        <select
          value={selectedExchange}
          onChange={(e) => setSelectedExchange(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">-- Select Exchange --</option>
          {availableExchanges.map((exchange) => (
            <option key={exchange} value={exchange}>
              {exchange.charAt(0).toUpperCase() + exchange.slice(1)}
            </option>
          ))}
        </select>
        {availableExchanges.length === 0 && (
          <p className="mt-2 text-sm text-error">
            No exchanges connected. Please add API keys in Exchange Settings.
          </p>
        )}
      </div>
      
      {/* Error and Success Messages */}
      {error && (
        <div className="mb-4 p-3 bg-error/20 border border-error rounded-md text-error">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 p-3 bg-success/20 border border-success rounded-md text-success-light">
          {successMessage}
        </div>
      )}
      
      {selectedExchange && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Balance Section */}
          <div className="bg-background border border-neutral-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-white">Account Balance</h3>
              <button
                onClick={loadBalance}
                disabled={isLoading}
                className="px-3 py-1 text-xs bg-primary hover:bg-primary-dark text-white rounded-md transition-colors"
              >
                Refresh
              </button>
            </div>
            
            {isLoading && !balance ? (
              <p className="text-sm text-neutral-400">Loading balance...</p>
            ) : balance ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {Object.entries(balance.total)
                  .filter(([_, amount]) => amount > 0)
                  .sort(([_, a], [__, b]) => b - a) // Sort by amount descending
                  .map(([currency, amount]) => (
                    <div key={currency} className="flex justify-between items-center border-b border-neutral-700 pb-2">
                      <div>
                        <span className="text-white font-medium">{currency}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-white">{amount.toFixed(8)}</p>
                        <p className="text-xs text-neutral-400">
                          Available: {balance.free[currency]?.toFixed(8) || 0}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No balance data available</p>
            )}
          </div>
          
          {/* Order Form */}
          <div className="bg-background border border-neutral-700 rounded-lg p-4">
            <h3 className="font-medium text-white mb-4">Create Order</h3>
            
            <form onSubmit={handleSubmitOrder}>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Symbol</label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    placeholder="BTC/USDT"
                    className="w-full px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Type</label>
                    <select
                      value={orderType}
                      onChange={(e) => setOrderType(e.target.value as 'market' | 'limit')}
                      className="w-full px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="market">Market</option>
                      <option value="limit">Limit</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Side</label>
                    <select
                      value={side}
                      onChange={(e) => setSide(e.target.value as 'buy' | 'sell')}
                      className="w-full px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-neutral-400 mb-1">Amount</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount to trade"
                    step="any"
                    min="0"
                    className="w-full px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                
                {orderType === 'limit' && (
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">Price</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Limit price"
                      step="any"
                      min="0"
                      className="w-full px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                      required={orderType === 'limit'}
                    />
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-4 py-2 rounded-md font-medium transition-colors ${
                    side === 'buy'
                      ? 'bg-success hover:bg-success-dark text-white'
                      : 'bg-error hover:bg-error-dark text-white'
                  }`}
                >
                  {isLoading ? 'Processing...' : side === 'buy' ? 'Buy' : 'Sell'}
                </button>
              </div>
            </form>
          </div>
          
          {/* Open Orders */}
          <div className="bg-background border border-neutral-700 rounded-lg p-4 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-white">Open Orders</h3>
              <button
                onClick={loadOpenOrders}
                disabled={isLoading}
                className="px-3 py-1 text-xs bg-primary hover:bg-primary-dark text-white rounded-md transition-colors"
              >
                Refresh
              </button>
            </div>
            
            {isLoading && openOrders.length === 0 ? (
              <p className="text-sm text-neutral-400">Loading orders...</p>
            ) : openOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-neutral-400">
                      <th className="pb-2">Symbol</th>
                      <th className="pb-2">Type</th>
                      <th className="pb-2">Side</th>
                      <th className="pb-2">Price</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openOrders.map((order) => (
                      <tr key={order.id} className="border-t border-neutral-700">
                        <td className="py-2 text-white">{order.symbol}</td>
                        <td className="py-2 text-white">{order.type}</td>
                        <td className={`py-2 ${order.side === 'buy' ? 'text-success' : 'text-error'}`}>
                          {order.side}
                        </td>
                        <td className="py-2 text-white">{order.price?.toFixed(8) || 'Market'}</td>
                        <td className="py-2 text-white">{order.amount?.toFixed(8)}</td>
                        <td className="py-2 text-white">{order.status}</td>
                        <td className="py-2 text-neutral-400">
                          {new Date(order.timestamp).toLocaleString()}
                        </td>
                        <td className="py-2">
                          <button
                            onClick={() => handleCancelOrder(order.id, order.symbol)}
                            disabled={isLoading}
                            className="px-2 py-1 text-xs bg-error hover:bg-error-dark text-white rounded-md transition-colors"
                          >
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No open orders</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingPanel;
