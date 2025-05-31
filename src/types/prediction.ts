/**
 * Types for the prediction and trading components
 */

export interface ModelStatus {
  status: string;
  model_info?: {
    model_initialized: boolean;
    model_type: string;
    actor_layers?: number[];
    critic_layers?: number[];
    learning_rate?: number;
    last_training_time?: string;
    last_prediction_time?: string;
    training_status?: {
      is_training: boolean;
      progress: number;
      error?: string;
    };
  };
}

export interface PredictionResult {
  timestamp: string;
  prediction: number;
  signal: number;
  signal_text: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
}

export interface HistoricalDataPoint {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartDataPoint {
  timestamp: number;
  date: string;
  price: number;
  volume: number;
  prediction?: number;
  signal?: string;
  confidence?: number;
  signalValue?: number | null;
}

export interface TradeData {
  id: string;
  timestamp: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  price: number;
  amount: number;
  cost: number;
  fee: number;
  pnl: number;
}

export interface PerformanceMetrics {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  profit_factor: number;
  sharpe_ratio: number;
  max_drawdown: number;
  average_trade: number;
  total_return: number;
}

export interface TradingPerformance {
  symbol: string;
  equity_curve: Array<{
    timestamp: string;
    equity: number;
    pnl: number;
  }>;
  trades: TradeData[];
  metrics: PerformanceMetrics;
}

export interface TrainingParams {
  exchange_id: string;
  symbol: string;
  timeframe: string;
  limit: number;
  epochs?: number;
  actor_layers?: number[];
  critic_layers?: number[];
  learning_rate?: number;
  batch_size?: number;
}

export interface SignalExecutionParams {
  exchange_id: string;
  symbol: string;
}

export interface TradingParams {
  exchange_id: string;
  symbols: string[];
  timeframe: string;
  update_interval: number;
}

export interface ExchangeConfig {
  exchange_id: string;
  api_key: string;
  api_secret: string;
  password?: string;
}
