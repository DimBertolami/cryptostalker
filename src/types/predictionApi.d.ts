/**
 * Type declarations for the predictionApi module
 */

import { 
  ModelStatus, 
  PredictionResult, 
  HistoricalDataPoint, 
  TrainingParams, 
  SignalExecutionParams,
  TradingParams,
  TradingPerformance,
  ExchangeConfig
} from './prediction';

declare module './predictionApi' {
  export function fetchPredictionStatus(): Promise<ModelStatus>;
  
  export function fetchExchanges(): Promise<string[]>;
  
  export function fetchHistoricalData(
    exchange: string, 
    symbol: string, 
    timeframe: string
  ): Promise<HistoricalDataPoint[]>;
  
  export function trainModel(params: TrainingParams): Promise<any>;
  
  export function fetchPrediction(
    exchange: string, 
    symbol: string, 
    timeframe: string
  ): Promise<PredictionResult>;
  
  export function executePredictionSignal(params: SignalExecutionParams): Promise<any>;
  
  export function startTrading(params: TradingParams): Promise<any>;
  
  export function stopTrading(): Promise<any>;
  
  export function fetchTradingPerformance(symbol: string): Promise<TradingPerformance>;
  
  export function configureExchange(params: ExchangeConfig): Promise<any>;
  
  export function removeExchange(exchangeId: string): Promise<any>;
  
  export function getAccountBalance(exchangeId: string): Promise<any>;
  
  export function getOpenOrders(params: { 
    exchange_id: string; 
    symbol?: string;
  }): Promise<any>;
}
