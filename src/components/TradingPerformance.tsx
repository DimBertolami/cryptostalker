import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { fetchTradingPerformance } from './predictionApi';
import { TradingPerformance as TradingPerformanceType } from '../types/prediction';

interface TradingPerformanceProps {
  performanceData?: TradingPerformanceType;
  symbol: string;
}

const TradingPerformance: React.FC<TradingPerformanceProps> = ({ symbol }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [performance, setPerformance] = useState<TradingPerformanceType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('equity');

  useEffect(() => {
    const loadPerformanceData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await fetchTradingPerformance(symbol);
        setPerformance(data);
      } catch (err) {
        console.error('Error loading performance data:', err);
        setError('Failed to load trading performance data');
        toast.error('Failed to load trading performance');
      } finally {
        setIsLoading(false);
      }
    };

    if (symbol) {
      loadPerformanceData();
    }
  }, [symbol]);

  const renderTooltip = (props: any) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background-lighter p-3 border border-neutral-700 rounded shadow-lg">
          <p className="text-sm font-medium">{data.date}</p>
          <p className="text-sm">Equity: ${data.equity.toFixed(2)}</p>
          {data.pnl && <p className="text-sm">PnL: ${data.pnl.toFixed(2)}</p>}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="bg-background-lighter border border-neutral-700 rounded-lg p-6 h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-2">Loading performance data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-background-lighter border border-neutral-700 rounded-lg p-6 h-96 flex items-center justify-center">
        <div className="text-center text-red-500">
          <p>{error}</p>
          <button 
            className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!performance || !performance.equity_curve || performance.equity_curve.length === 0) {
    return (
      <div className="bg-background-lighter border border-neutral-700 rounded-lg p-6 h-96 flex items-center justify-center">
        <p>No trading performance data available for {symbol}</p>
      </div>
    );
  }

  // Format data for charts
  const equityData = performance.equity_curve.map((item) => ({
    timestamp: new Date(item.timestamp).getTime(),
    date: new Date(item.timestamp).toLocaleString(),
    equity: item.equity,
    pnl: item.pnl
  }));

  const tradesData = performance.trades || [];
  const winRate = performance.metrics?.win_rate || 0;
  const totalTrades = performance.metrics?.total_trades || 0;
  const profitFactor = performance.metrics?.profit_factor || 0;
  const sharpeRatio = performance.metrics?.sharpe_ratio || 0;
  const maxDrawdown = performance.metrics?.max_drawdown || 0;

  // Prepare data for pie chart
  const pieData = [
    { name: 'Winning Trades', value: performance.metrics?.winning_trades || 0 },
    { name: 'Losing Trades', value: performance.metrics?.losing_trades || 0 }
  ];
  const COLORS = ['#4ade80', '#f87171'];

  return (
    <div className="bg-background-lighter border border-neutral-700 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">{symbol} Trading Performance</h3>
        <div className="flex space-x-2">
          <button
            className={`px-3 py-1 text-sm rounded ${activeTab === 'equity' ? 'bg-primary text-white' : 'bg-background text-gray-400 hover:bg-background-lighter'}`}
            onClick={() => setActiveTab('equity')}
          >
            Equity Curve
          </button>
          <button
            className={`px-3 py-1 text-sm rounded ${activeTab === 'trades' ? 'bg-primary text-white' : 'bg-background text-gray-400 hover:bg-background-lighter'}`}
            onClick={() => setActiveTab('trades')}
          >
            Trades
          </button>
          <button
            className={`px-3 py-1 text-sm rounded ${activeTab === 'metrics' ? 'bg-primary text-white' : 'bg-background text-gray-400 hover:bg-background-lighter'}`}
            onClick={() => setActiveTab('metrics')}
          >
            Metrics
          </button>
        </div>
      </div>
      
      <div className="h-96">
        {activeTab === 'equity' && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={equityData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="timestamp" 
                type="number"
                domain={['auto', 'auto']}
                scale="time"
                tickFormatter={(timestamp: number) => new Date(timestamp).toLocaleDateString()}
              />
              <YAxis 
                tickFormatter={(value: number) => `$${value.toFixed(2)}`}
              />
              <Tooltip content={renderTooltip} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="equity" 
                stroke="#3b82f6" 
                dot={false}
                name="Equity"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        
        {activeTab === 'trades' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
            <div>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={tradesData.map((trade: any, index: number) => ({
                    id: index + 1,
                    pnl: trade.pnl,
                    type: trade.type
                  }))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="id" />
                  <YAxis tickFormatter={(value) => `$${value.toFixed(0)}`} />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="pnl" 
                    name="Profit/Loss" 
                    fill={(data: any) => data.pnl >= 0 ? '#4ade80' : '#f87171'}
                    shape={(props: any) => {
                      const { x, y, width, height, pnl } = props;
                      return (
                        <rect
                          x={x}
                          y={pnl >= 0 ? y : y + height}
                          width={width}
                          height={Math.abs(height)}
                          fill={pnl >= 0 ? '#4ade80' : '#f87171'}
                          stroke={pnl >= 0 ? '#22c55e' : '#ef4444'}
                        />
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }: { name: string, percent: number }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {activeTab === 'metrics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full p-4">
            <div className="bg-background p-4 rounded-lg border border-neutral-700">
              <h4 className="text-sm text-gray-400 mb-1">Win Rate</h4>
              <p className="text-2xl font-semibold">{(winRate * 100).toFixed(1)}%</p>
              <p className="text-sm text-gray-400 mt-2">Total Trades: {totalTrades}</p>
            </div>
            
            <div className="bg-background p-4 rounded-lg border border-neutral-700">
              <h4 className="text-sm text-gray-400 mb-1">Profit Factor</h4>
              <p className="text-2xl font-semibold">{profitFactor.toFixed(2)}</p>
              <p className="text-sm text-gray-400 mt-2">Gross Profit / Gross Loss</p>
            </div>
            
            <div className="bg-background p-4 rounded-lg border border-neutral-700">
              <h4 className="text-sm text-gray-400 mb-1">Sharpe Ratio</h4>
              <p className="text-2xl font-semibold">{sharpeRatio.toFixed(2)}</p>
              <p className="text-sm text-gray-400 mt-2">Risk-adjusted Return</p>
            </div>
            
            <div className="bg-background p-4 rounded-lg border border-neutral-700">
              <h4 className="text-sm text-gray-400 mb-1">Max Drawdown</h4>
              <p className="text-2xl font-semibold text-red-500">{(maxDrawdown * 100).toFixed(1)}%</p>
              <p className="text-sm text-gray-400 mt-2">Largest Peak-to-Trough Decline</p>
            </div>
            
            <div className="bg-background p-4 rounded-lg border border-neutral-700">
              <h4 className="text-sm text-gray-400 mb-1">Average Trade</h4>
              <p className="text-2xl font-semibold">${performance.metrics?.average_trade.toFixed(2) || '0.00'}</p>
              <p className="text-sm text-gray-400 mt-2">Mean Profit/Loss per Trade</p>
            </div>
            
            <div className="bg-background p-4 rounded-lg border border-neutral-700">
              <h4 className="text-sm text-gray-400 mb-1">Total Return</h4>
              <p className="text-2xl font-semibold">{(performance.metrics?.total_return * 100).toFixed(1) || '0.0'}%</p>
              <p className="text-sm text-gray-400 mt-2">Overall Performance</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradingPerformance;
