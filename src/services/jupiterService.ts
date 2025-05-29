import axios from 'axios';

const JUPITER_API_BASE = import.meta.env.VITE_JUPITER_API_BASE || 'https://jup.ag/api';

export interface JupiterOrder {
  id: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  status: 'open' | 'filled' | 'cancelled' | 'expired' | 'failed';
  createdAt: string;
  updatedAt: string;
}

export const jupiterApi = {
  /**
   * Get all open orders for the current user
   */
  async getOrders(walletAddress: string): Promise<JupiterOrder[]> {
    try {
      const response = await axios.get(`${JUPITER_API_BASE}/orders`, {
        params: { walletAddress }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Jupiter orders:', error);
      throw error;
    }
  },

  /**
   * Get a specific order by ID
   */
  async getOrder(orderId: string): Promise<JupiterOrder> {
    try {
      const response = await axios.get(`${JUPITER_API_BASE}/orders/${orderId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching Jupiter order ${orderId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new swap order
   */
  async createOrder(params: {
    walletAddress: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    slippageBps?: number;
  }): Promise<JupiterOrder> {
    try {
      const response = await axios.post(`${JUPITER_API_BASE}/orders`, {
        ...params,
        slippageBps: params.slippageBps || 50, // 0.5% default slippage
      });
      return response.data;
    } catch (error) {
      console.error('Error creating Jupiter order:', error);
      throw error;
    }
  },

  /**
   * Cancel an existing order
   */
  async cancelOrder(orderId: string): Promise<{ success: boolean }> {
    try {
      await axios.delete(`${JUPITER_API_BASE}/orders/${orderId}`);
      return { success: true };
    } catch (error) {
      console.error(`Error cancelling Jupiter order ${orderId}:`, error);
      throw error;
    }
  },

  /**
   * Get the best quote for a swap
   */
  async getQuote(params: {
    inputMint: string;
    outputMint: string;
    amount: string;
    slippageBps?: number;
  }) {
    try {
      const response = await axios.get(`${JUPITER_API_BASE}/quote`, {
        params: {
          inputMint: params.inputMint,
          outputMint: params.outputMint,
          amount: params.amount,
          slippageBps: params.slippageBps || 50,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching Jupiter quote:', error);
      throw error;
    }
  },

  /**
   * Execute a swap
   */
  async executeSwap(params: {
    walletAddress: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    slippageBps?: number;
  }) {
    try {
      // Get the best quote (commented out as it's not used in this implementation)
      // const quote = await this.getQuote({
      //   inputMint: params.inputMint,
      //   outputMint: params.outputMint,
      //   amount: params.inAmount,
      //   slippageBps: params.slippageBps,
      // });

      // Create and execute the order
      const order = await this.createOrder({
        walletAddress: params.walletAddress,
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        inAmount: params.inAmount,
        slippageBps: params.slippageBps,
      });

      return order;
    } catch (error) {
      console.error('Error executing Jupiter swap:', error);
      throw error;
    }
  },
};

export default jupiterApi;
