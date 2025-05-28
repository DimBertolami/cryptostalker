// Utility API for Paper Trading Dashboard
// Communicates with backend using REST endpoints for daemon control and polling JSON state

export interface PaperTradingStatus {
  is_running: boolean;
  mode: string;
  balance: number;
  holdings: Record<string, number>;
  base_currency: string;
  portfolio_value: number;
  performance: {
    total_trades: number;
    win_rate: number;
    profit_loss: number;
    return_pct: number;
    sharpe_ratio: number;
    max_drawdown: number;
  };
  trade_history: any[];
  last_prices: Record<string, number>;
  last_updated: string;
  api_keys_configured?: boolean;
  auto_execute_suggested_trades?: boolean;
  min_confidence_threshold?: number;
  suggested_trade_refresh_interval?: number;
}

const API_PREFIX = '/api/papertrading';

export async function getStatus(): Promise<PaperTradingStatus> {
  const res = await fetch(`${API_PREFIX}/status`);
  if (!res.ok) throw new Error('Failed to fetch status');
  return res.json();
}

export async function startDaemon(): Promise<void> {
  const res = await fetch(`${API_PREFIX}/start`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to start daemon');
}

export async function stopDaemon(): Promise<void> {
  const res = await fetch(`${API_PREFIX}/stop`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to stop daemon');
}

export async function restartDaemon(): Promise<void> {
  const res = await fetch(`${API_PREFIX}/restart`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to restart daemon');
}

export async function executeTrade(trade: {
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
}): Promise<void> {
  const res = await fetch(`${API_PREFIX}/trade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trade),
  });
  if (!res.ok) throw new Error('Failed to execute trade');
}

// Add more API functions as needed
