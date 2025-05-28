import React, { useState, useEffect, useRef, useCallback } from 'react';
import './PaperTradingDashboard.css';
import { getStatus, PaperTradingStatus } from './paperTradingApi';

// Helper for formatting currency
function formatCurrency(value: number, currency: string = 'USD'): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Helper for formatting date
function formatDate(date: string | number | Date): string {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString();
}


interface PaperTradingDashboardProps {
  selectedPeriod?: string;
  autoExecuteEnabled?: boolean;
  onAutoExecuteChange?: (enabled: boolean) => void;
}



const DEFAULT_STATUS: PaperTradingStatus = {
  is_running: false,
  mode: 'paper',
  balance: 10000,
  holdings: {},
  base_currency: 'USDT',
  portfolio_value: 10000,
  performance: {
    total_trades: 0,
    win_rate: 0,
    profit_loss: 0,
    return_pct: 0,
    sharpe_ratio: 0,
    max_drawdown: 0
  },
  trade_history: [],
  last_prices: {},
  last_updated: new Date().toISOString(),
  api_keys_configured: false,
  auto_execute_suggested_trades: false,
  min_confidence_threshold: 0.75,
  suggested_trade_refresh_interval: 60
};

const PaperTradingDashboard = ({ 
  selectedPeriod = '1m',
  autoExecuteEnabled: propAutoExecuteEnabled,
  onAutoExecuteChange
}: PaperTradingDashboardProps): JSX.Element => {
  const [status, setStatus] = useState<PaperTradingStatus>(DEFAULT_STATUS);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [configVisible, setConfigVisible] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [apiSecret, setApiSecret] = useState<string>('');
  const [showTradeVisualization, setShowTradeVisualization] = useState<boolean>(false);
  
  // Reference for trade history table scrolling
  const tradeHistoryTableRef = useRef<HTMLDivElement>(null);
  
  // State to track highlighted trade from 3D visualization
  const [highlightedTradeId, setHighlightedTradeId] = useState<number | null>(null);
  
  // Auto-execution settings
  const [autoExecuteEnabled, setAutoExecuteEnabled] = useState<boolean>(propAutoExecuteEnabled ?? false);
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.75);
  // Using the main dashboard's interval instead of a separate setting

  // Calculate refresh interval based on selected period
  const getRefreshIntervalFromPeriod = (period: string): number => {
    const value = parseInt(period.replace(/[^0-9]/g, '')) || 5;
    const unit = period.replace(/[0-9]/g, '');
    
    // Convert to milliseconds
    switch(unit.toLowerCase()) {
      case 'm':
        return value * 60 * 1000; // minutes
      case 'h':
        return value * 60 * 60 * 1000; // hours
      case 'd':
        return value * 24 * 60 * 60 * 1000; // days
      case 'w':
        return value * 7 * 24 * 60 * 60 * 1000; // weeks
      default:
        return 5 * 60 * 1000; // default to 5 minutes
    }
  };
  
  // Get refresh interval in seconds from the selected period
  const getRefreshIntervalInSeconds = (period: string): number => {
    const value = parseInt(period.replace(/[^0-9]/g, '')) || 5;
    const unit = period.replace(/[0-9]/g, '');
    
    switch(unit.toLowerCase()) {
      case 'm':
        return value * 60; // minutes to seconds
      case 'h':
        return value * 60 * 60; // hours to seconds
      case 'd':
        return value * 24 * 60 * 60; // days to seconds
      case 'w':
        return value * 7 * 24 * 60 * 60; // weeks to seconds
      default:
        return 5 * 60; // default to 5 minutes in seconds
    }
  };
  
  // Helper function to get ordinal suffix (1st, 2nd, 3rd, etc.)
  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return num + "st";
    if (j === 2 && k !== 12) return num + "nd";
    if (j === 3 && k !== 13) return num + "rd";
    return num + "th";
  };
  
  // Helper function to safely get keys from an object that might be undefined
  const safeObjectKeys = <T extends Record<string, unknown>>(obj: T | undefined | null): string[] => {
    if (!obj) return [];
    return Object.keys(obj);
  };
  
  // Helper function to safely get entries from an object that might be undefined
  const safeObjectEntries = <T extends Record<string, number>>(obj: T | undefined | null): [string, number][] => {
    if (!obj) return [];
    return Object.entries(obj) as [string, number][];
  };

  // Fetch trading status
  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send command to the trading API
  const sendCommand = async (command: string, params: Record<string, string | number | boolean> = {}) => {
    console.log(`Sending command: ${command} with params:`, params);
    try {
      setIsLoading(true);
      setError(null);
      
      // Convert all parameters to strings for consistency
      const stringParams: Record<string, string> = {};
      Object.entries(params).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          stringParams[key] = value ? 'true' : 'false';
        } else {
          stringParams[key] = String(value);
        }
      });
      
      console.log(`Sending command with stringified params:`, stringParams);
      
      const response = await fetch('/trading/paper', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          ...stringParams
        }),
      });
      
      console.log(`Response status:`, response.status, response.statusText);
      
      if (!response.ok) {
        // Try to get more detailed error information
        let errorMessage = `Server responded with ${response.status}: ${response.statusText}`;
        try {
          const errorText = await response.text();
          console.error('Error response body:', errorText);
          if (errorText) {
            // Try to parse as JSON, but fall back to using raw text
            const isJson = errorText.startsWith('{') && errorText.endsWith('}');
            if (isJson) {
              try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.message) {
                  errorMessage = errorJson.message;
                }
              } catch {
                // JSON parsing failed, use the raw text
                errorMessage = `${errorMessage}\nDetails: ${errorText}`;
              }
            } else {
              // Not JSON, use the raw text
              errorMessage = `${errorMessage}\nDetails: ${errorText}`;
            }
          }
        } catch (e) {
          console.error('Failed to read error response:', e);
        }
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log(`Command result:`, result);
      
      if (result.status !== 'success') {
        throw new Error(result.message || `Failed to execute command: ${command}`);
      }
      
      // Refresh status after command execution
      await fetchStatus();
      
      return result;
    } catch (err) {
      console.error(`Error executing command ${command}:`, err);
      setError(`Failed to execute command: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format currency with symbol
  const formatCurrency = (value: number, currency?: string): string => {
    const currencySymbol = currency || status.base_currency || 'USDT';
    if (isNaN(value)) return `0.00 ${currencySymbol}`;
    return `${value.toFixed(2)} ${currencySymbol}`;
  };
  
  // Format percentage
  const formatPercent = (value: number): string => {
    if (isNaN(value)) return '0.00%';
    return `${(value * 100).toFixed(2)}%`;
  };
  
  // Format date
  const formatDate = (dateStr: string): string => {
    try {
      if (!dateStr) return 'N/A';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Invalid date';
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(date);
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };
  
  // Save API keys
  const saveApiKeys = async () => {
    try {
      await sendCommand('api', { key: apiKey, secret: apiSecret });
      // Update status to show keys are configured
      setStatus((prev: typeof status) => ({ ...prev, api_keys_configured: true }));
      setConfigVisible(false);
      // Clear the fields after saving
        <div className="trade-history-section" style={{ gridColumn: '1 / span 2' }}>
          <h3>
            {!status.trade_history || status.trade_history.length === 0 ? 'No Trades Yet' :
             status.trade_history.length === 1 ? '1st Trade' :
             status.trade_history.length <= 5 ? `First ${status.trade_history.length} Trades` :
             `Recent Trades (Last ${Math.min(status.trade_history.length, 10)} of ${status.trade_history.length} Trades)`}
          </h3>
          {!status.trade_history || status.trade_history.length === 0 ? (
            <div className="empty-state">No trades yet</div>
          ) : (
            <div className="trade-scroll-container" ref={tradeHistoryTableRef}>
              <table className="trade-history-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>Symbol</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Value</th>
                    <th>Balance After</th>
                  </tr>
                </thead>
                <tbody>
                  {[...(status.trade_history || [])].reverse().map((trade: any, index: number) => {
                    // Calculate the trade number (from newest to oldest)
                    const tradeNumber = (status.trade_history?.length || 0) - index;
                    const tradeOrdinal = getOrdinalSuffix(tradeNumber);
                    
                    // Calculate profit/loss for this trade if it's a SELL
                    let profitLoss = 0;
                    let profitLossPercent = 0;
                    
                    if (trade.side === 'SELL') {
                      // Find the corresponding BUY trades for this symbol
                      const buyTrades = (status.trade_history || []).filter((t: any) => 
                        t.symbol === trade.symbol && t.side === 'BUY' && new Date(t.timestamp) < new Date(trade.timestamp)
                      );
                      
                      if (buyTrades.length > 0) {
                        // Calculate weighted average purchase price
                        let totalValue = 0;
                        let totalQuantity = 0;
                        
                        buyTrades.forEach((t: any) => {
                          totalValue += t.price * t.quantity;
                          totalQuantity += t.quantity;
                        });
                        
                        const avgBuyPrice = totalValue / totalQuantity;
                        profitLoss = (trade.price - avgBuyPrice) * trade.quantity;
                        profitLossPercent = (avgBuyPrice > 0) ? ((trade.price - avgBuyPrice) / avgBuyPrice) * 100 : 0;
                      }
                    }
                    
                    const isProfitable = profitLoss > 0;
                    
                    // Calculate the trade ID that would match the 3D visualization
                    // The 3D visualization uses IDs starting from 1, with the oldest trade as ID 1
                    const visualizationTradeId = (status.trade_history?.length || 0) - index;
                    
                    // Check if this trade should be highlighted
                    const isHighlighted = highlightedTradeId === visualizationTradeId;
                    
                    return (
                      <tr 
                        key={index} 
                        className={`${trade.side === 'BUY' ? 'buy-trade' : 'sell-trade'} ${isHighlighted ? 'highlight-trade' : ''}`}
                        data-trade-number={tradeNumber}
                        data-trade-id={visualizationTradeId}
                      >
                        <td>
                          <span className="trade-ordinal">{tradeOrdinal}</span>
                          {formatDate(trade.timestamp)}
                        </td>
                        <td className={trade.side === 'BUY' ? 'buy-action' : 'sell-action'}>
                          {trade.side}
                        </td>
                        <td>{trade.symbol}</td>
                        <td>{trade.price.toFixed(2)}</td>
                        <td>{trade.quantity.toFixed(8)}</td>
                        <td>{formatCurrency(trade.value)}</td>
                        <td>
                          {formatCurrency(trade.balance_after)}
                          {trade.side === 'SELL' && profitLoss !== 0 && (
                            <span className={isProfitable ? 'profit-indicator' : 'loss-indicator'}>
                              {' '}({isProfitable ? '+' : ''}{profitLoss.toFixed(2)} / {isProfitable ? '+' : ''}{profitLossPercent.toFixed(2)}%)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <div className="dashboard-footer">
        <div className="last-updated">
          Last updated: {formatDate(status.last_updated || '')}
          <span className="refresh-interval"> (Auto-refresh: {selectedPeriod})</span>
        </div>
        <button className="refresh-button" onClick={fetchStatus}>
          Refresh
        </button>
      </div>
    </div>
  );
};