import { create } from 'zustand';
import type { ExchangeState } from './exchangeTypes';
import toast from 'react-hot-toast';

const useExchangeStore = create<ExchangeState>((set: (state: ExchangeState | ((state: ExchangeState) => ExchangeState)) => void) => ({
  exchanges: {
    bitvavo: {
      connected: false,
      apiKey: '',
      apiSecret: '',
    },
    binance: {
      connected: false,
      apiKey: '',
      apiSecret: '',
    },
    jupiter: {
      connected: false,
      apiKey: '',
      apiSecret: '',
      url: '',
    },
  },
  
  setApiKeys: (exchange: string, apiKey: string, apiSecret: string) => {
    if (!apiKey || !apiSecret) {
      toast.error('API key and secret are required');
      return;
    }
    
    set((state: ExchangeState) => ({
      ...state,
      exchanges: {
        ...state.exchanges,
        [exchange]: {
          connected: true,
          apiKey,
          apiSecret,
        },
      },
    }));
    
    toast.success(`${exchange.charAt(0).toUpperCase() + exchange.slice(1)} API connected successfully`);
  },
}));

// Make it available on window for other stores to access
declare global {
  interface Window {
    exchangeStore: typeof useExchangeStore;
  }
}

window.exchangeStore = useExchangeStore;

export default useExchangeStore;