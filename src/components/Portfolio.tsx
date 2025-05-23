import { useEffect, useState, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Chart,
  ChartOptions,
  ChartData,
  Point
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import Annotation from 'chartjs-plugin-annotation';

// Register the annotation plugin
ChartJS.register(Annotation);
import { fetchTradingData, fetchPriceHistory } from '../services/tradingService';
import { ChartWithErrorBoundary } from './ChartWithErrorBoundary';
import { TradeableCrypto } from '../types';

// Extend the Point type to include our custom properties
interface CustomPoint extends Point {
  isBuy?: boolean;
}

interface PriceHistoryPoint {
  timestamp: number;
  price: number;
  isBuy: boolean;
}

interface PriceHistoryResponse {
  history: PriceHistoryPoint[];
  buyInfo: {
    timestamp: number;
    price: number;
    amount: string;
  };
}

// Register the required components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      type: 'time' as const,
      time: {
        unit: 'day' as const
      }
    },
    y: {
      beginAtZero: false
    }
  }
};

const Portfolio = () => {
  // State hooks
  const [positions, setPositions] = useState<TradeableCrypto[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<TradeableCrypto | null>(null);
  const [chartData, setChartData] = useState<ChartData<'line', (number | Point | null)[], unknown> | null>(null);
  const [chartOptions, setChartOptions] = useState<ChartOptions<'line'>>({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day'
        },
        title: {
          display: true,
          text: 'Time'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Price (USD)'
        }
      }
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const chartRef = useRef<Chart | null>(null);

  // Load portfolio data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchTradingData();
        setPositions(data);
        if (data.length > 0) {
          setSelectedPosition(data[0]);
        }
      } catch (err) {
        setError('Failed to load portfolio data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load chart data when selected position changes
  useEffect(() => {
    const loadChartData = async () => {
      if (!selectedPosition) return;
      
      try {
        setLoading(true);
        const response = await fetchPriceHistory(selectedPosition.symbol) as unknown as PriceHistoryResponse;
        const { history, buyInfo } = response;
        
        // Find the buy point
        const buyPoint = history.find(h => h.isBuy);
        
        setChartData({
          labels: history.map(h => new Date(h.timestamp)),
          datasets: [
            // Main price line
            {
              label: selectedPosition.symbol,
              data: history.map(h => h.price),
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              tension: 0.1,
              fill: true,
              pointRadius: (ctx) => {
                // Make buy point more visible
                return history[ctx.dataIndex]?.isBuy ? 6 : 3;
              },
              pointBackgroundColor: (ctx) => {
                // Color buy point differently
                return history[ctx.dataIndex]?.isBuy ? 'rgb(255, 99, 132)' : 'rgb(75, 192, 192)';
              },
              pointHoverRadius: (ctx) => {
                return history[ctx.dataIndex]?.isBuy ? 8 : 5;
              }
            },
            // Buy point annotation line (vertical)
            {
              label: 'Buy Point',
              data: history.map(h => h.isBuy ? h.price : null),
              borderColor: 'rgba(255, 99, 132, 0.5)',
              borderWidth: 1,
              borderDash: [5, 5],
              pointRadius: 0,
              borderDashOffset: 2,
              fill: false,
              showLine: true,
              pointHoverRadius: 0
            }
          ]
        });
        
        // Create annotation for the buy point
        const annotations = buyPoint ? [{
          type: 'line',
          yMin: 0,
          yMax: buyPoint.price,
          xMin: buyPoint.timestamp,
          xMax: buyPoint.timestamp,
          borderColor: 'rgb(255, 99, 132)',
          borderWidth: 1,
          borderDash: [5, 5] as [number, number],
          label: {
            content: `Buy: ${buyInfo.amount} @ $${buyInfo.price}`,
            enabled: true,
            position: 'top' as const
          }
        }] : [];

        // Update chart options with annotations and tooltips
        const newOptions: ChartOptions<'line'> = {
          ...chartOptions,
          plugins: {
            ...chartOptions.plugins,
            tooltip: {
              callbacks: {
                label: function(context) {
                  const data = context.raw as CustomPoint;
                  let label = context.dataset.label || '';
                  if (data?.isBuy) {
                    label += ' (Buy)';
                  }
                  if (label) {
                    label += ': ';
                  }
                  if (context.parsed.y !== null) {
                    label += new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6
                    }).format(context.parsed.y);
                  }
                  return label;
                }
              }
            },
            annotation: {
              annotations: annotations as any[]
            }
          }
        };
        setChartOptions(newOptions);
      } catch (err) {
        setError('Failed to load chart data');
        console.error('Error loading chart data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadChartData();
  }, [selectedPosition]);
  
  // Cleanup chart on unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);
  
  // Loading and error states
  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Portfolio</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Positions List */}
        <div className="space-y-2">
          {positions.map(position => (
            <div
              key={position.id}
              onClick={() => setSelectedPosition(position)}
              className={`p-3 rounded cursor-pointer ${
                selectedPosition?.id === position.id
                  ? 'bg-blue-100'
                  : 'hover:bg-gray-100'
              }`}
            >
              <div className="flex justify-between">
                <span className="font-medium">{position.symbol}</span>
                <span>${(position.currentPrice * position.balance).toFixed(2)}</span>
              </div>
              <div className="text-sm text-gray-600">
                {position.balance} {position.symbol} @ ${position.averageBuyPrice?.toFixed(2) || '0.00'}
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="md:col-span-2 bg-white p-4 rounded shadow">
          {selectedPosition && chartData ? (
            <div className="h-96">
              <h2 className="text-xl font-semibold mb-2">
                {selectedPosition.name} ({selectedPosition.symbol})
              </h2>
              <ChartWithErrorBoundary 
                data={chartData}
                options={chartOptions}
              />
            </div>
          ) : (
            <div>Select a position to view chart</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Portfolio;