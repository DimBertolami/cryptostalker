export interface ExchangeState {
  exchanges: {
    bitvavo: {
      connected: boolean;
      apiKey: string;
      apiSecret: string;
    };
    binance: {
      connected: boolean;
      apiKey: string;
      apiSecret: string;
    };
    jupiter: {
      connected: boolean;
      apiKey: string;
      apiSecret: string;
      url?: string;
    };
  };
  
  setApiKeys: (
    exchange: string,
    apiKey: string,
    apiSecret: string
  ) => void;
}
