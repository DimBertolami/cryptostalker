import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import jupiterApi, { JupiterOrder } from '../services/jupiterService';
import { toast } from 'react-hot-toast';

export type { JupiterOrder };

interface UseJupiterTradingProps {
  onOrderUpdate?: (orders: JupiterOrder[]) => void;
}

export const useJupiterTrading = ({ onOrderUpdate }: UseJupiterTradingProps = {}) => {
  const { publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState<JupiterOrder[]>([]);
  const [error, setError] = useState<Error | null>(null);

  // Fetch all orders for the connected wallet
  const fetchOrders = useCallback(async () => {
    if (!publicKey) return [];
    
    setIsLoading(true);
    setError(null);
    
    try {
      const walletAddress = publicKey.toString();
      const orders = await jupiterApi.getOrders(walletAddress);
      setOrders(orders);
      onOrderUpdate?.(orders);
      return orders;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch orders');
      setError(error);
      toast.error(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, onOrderUpdate]);

  // Execute a swap
  const executeSwap = useCallback(async (
    inputMint: string,
    outputMint: string,
    amount: string,
    slippageBps = 50 // 0.5% default slippage
  ): Promise<JupiterOrder> => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const walletAddress = publicKey.toString();
      const order = await jupiterApi.executeSwap({
        walletAddress,
        inputMint,
        outputMint,
        inAmount: amount,
        slippageBps,
      });
      
      // Refresh orders after successful swap
      await fetchOrders();
      toast.success('Swap executed successfully!');
      return order;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to execute swap');
      setError(error);
      toast.error(`Swap failed: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, fetchOrders]);

  // Cancel an order
  const cancelOrder = useCallback(async (orderId: string) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await jupiterApi.cancelOrder(orderId);
      
      // Refresh orders after cancellation
      await fetchOrders();
      toast.success('Order cancelled successfully');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to cancel order');
      setError(error);
      toast.error(`Failed to cancel order: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, fetchOrders]);

  // Get a quote for a potential swap
  const getQuote = useCallback(async (
    inputMint: string,
    outputMint: string,
    amount: string,
    slippageBps = 50
  ) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const quote = await jupiterApi.getQuote({
        inputMint,
        outputMint,
        amount,
        slippageBps,
      });
      return quote;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to get quote');
      setError(error);
      toast.error(`Failed to get quote: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  return {
    // State
    orders,
    isLoading,
    error,
    
    // Actions
    fetchOrders,
    executeSwap,
    cancelOrder,
    getQuote,
    
    // Derived state
    hasOrders: orders.length > 0,
    openOrders: orders.filter(order => order.status === 'open'),
    filledOrders: orders.filter(order => order.status === 'filled'),
  };
};

export default useJupiterTrading;
