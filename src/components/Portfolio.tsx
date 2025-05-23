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
import { ChartWithErrorBoundary } from './ChartWithErrorBoundary';
import { TradeableCrypto } from '../types';
import useCryptoStore from '../store/useCryptoStore';
import { fetchCurrentPrice } from '../services/cryptoPriceService';
import toast from 'react-hot-toast';

// Register the annotation plugin
ChartJS.register(
  Annotation,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

// Extend the Point type to include our custom properties
interface CustomPoint extends Point {
  isBuy?: boolean;
}

interface ChartDataPoint {
  timestamp: number;
  price: number;
  isBuy?: boolean;
  isSell?: boolean;
}

// Store chart data globally to persist between tab switches
const chartDataCache: Record<string, ChartDataPoint[]> = {};

const Portfolio = () => {
  // Get portfolio data and settings from store
  const { portfolio, updatePriceForCrypto, updateInterval, isPaused, isAutoTrading, sellManual } = useCryptoStore();
  
  // State hooks
  const [selectedPosition, setSelectedPosition] = useState<TradeableCrypto | null>(null);
  const [chartData, setChartData] = useState<ChartData<'line', CustomPoint[], unknown> | null>(null);
  // No local time interval state - using the store's updateInterval
  const [chartPoints, setChartPoints] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const chartRef = useRef<Chart | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Chart options
  const [chartOptions, setChartOptions] = useState<ChartOptions<'line'>>({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'minute'
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
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            const dataPoint = context.raw as CustomPoint;
            let label = context.dataset.label || '';
            
            if (dataPoint?.isBuy) {
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
      }
    }
  });

  // Select the first position from portfolio when component mounts
  useEffect(() => {
    if (portfolio.length > 0 && !selectedPosition) {
      setSelectedPosition(portfolio[0]);
    }
  }, [portfolio, selectedPosition]);

  // Setup chart data when selected position changes
  useEffect(() => {
    if (!selectedPosition) return;
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Check if we have cached data for this position
    const positionId = selectedPosition.id;
    let initialPoints: ChartDataPoint[] = [];
    
    if (chartDataCache[positionId] && chartDataCache[positionId].length > 0) {
      // Use cached data if available
      initialPoints = [...chartDataCache[positionId]];
    } else {
      // Initialize with the initial buy point and any additional buys
      const startTime = selectedPosition.purchaseTimestamp || Date.now(); // Use purchase timestamp or current time
      const purchasePrice = selectedPosition.averageBuyPrice || 100; // Ensure we have a valid price
      
      // Add the initial buy point
      initialPoints.push({
        timestamp: startTime,
        price: purchasePrice,
        isBuy: true
      });
      
      // Add additional buy points if they exist
      if (selectedPosition.additionalBuyTimestamps && selectedPosition.additionalBuyTimestamps.length > 0) {
        selectedPosition.additionalBuyTimestamps.forEach(buyEvent => {
          initialPoints.push({
            timestamp: buyEvent.timestamp,
            price: buyEvent.price,
            isBuy: true
          });
        });
      }
      
      // Sort points by timestamp to ensure correct order
      initialPoints.sort((a, b) => a.timestamp - b.timestamp);
      
      // Initialize the cache for this position
      chartDataCache[positionId] = [...initialPoints];
    }
    
    setChartPoints(initialPoints);
    
    // Create chart data
    updateChartData(initialPoints);
    
    // Setup interval for adding new price points
    timerRef.current = setInterval(async () => {
      if (!selectedPosition || isPaused) return;
      
      try {
        // Get the initial price from the position to ensure consistent price simulation
        const initialPrice = selectedPosition.averageBuyPrice;
        
        // Fetch real-time price with variations to avoid straight lines
        // Pass the initial price to ensure the price simulation is based on the purchase price
        const realTimePrice = await fetchCurrentPrice(selectedPosition.symbol, initialPrice);
        
        const positionId = selectedPosition.id;
        
        // Add new data point with the fetched price
        setChartPoints(prevPoints => {
          if (prevPoints.length === 0) return prevPoints;
          
          const newPoints = [...prevPoints];
          const lastPoint = newPoints[newPoints.length - 1];
          
          // Calculate time increment based on the update interval setting
          // This ensures points are plotted according to the selected interval
          const timeIncrement = updateInterval * 1000; // Full interval in milliseconds
          
          const newPoint = {
            timestamp: lastPoint.timestamp + timeIncrement,
            price: realTimePrice,
            isBuy: false
          };
          
          newPoints.push(newPoint);
          
          // Update the global cache to persist data between tab switches
          if (chartDataCache[positionId]) {
            chartDataCache[positionId] = [...newPoints];
          }
          
          // Update chart with new data
          updateChartData(newPoints);
          
          return newPoints;
        });
        
        // Update price in store
        updatePriceForCrypto(selectedPosition.id, realTimePrice);
      } catch (err) {
        console.error('Failed to fetch real-time price:', err);
      }
    }, updateInterval * 1000); // Convert seconds to milliseconds
    
    // Cleanup interval on unmount or when selected position changes
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [selectedPosition, updateInterval, updatePriceForCrypto]);
  
  // Function to update chart data
  const updateChartData = (points: ChartDataPoint[]) => {
    if (!selectedPosition || points.length === 0) return;
    
    // Find all buy points for annotation
    const buyPoints = points.filter(p => p.isBuy);
    
    // Find sell points for annotation
    const sellPoints = points.filter(p => p.isSell);
    
    // Calculate min/max for proper scaling
    const prices = points.map(p => p.price);
    const minPrice = Math.min(...prices) * 0.95; // 5% padding below
    const maxPrice = Math.max(...prices) * 1.05; // 5% padding above
    
    // Update chart options to ensure y-axis starts at an appropriate value, not zero
    setChartOptions(prevOptions => ({
      ...prevOptions,
      scales: {
        ...prevOptions.scales,
        y: {
          ...prevOptions.scales?.y,
          beginAtZero: false,
          min: minPrice,
          max: maxPrice
        }
      }
    }));
    
    // Create annotations for buy and sell points
    let annotations = [];
    
    // Add annotations for all buy points
    buyPoints.forEach((buyPoint, index) => {
      annotations.push({
        type: 'point',
        xValue: buyPoint.timestamp,
        yValue: buyPoint.price,
        backgroundColor: 'rgba(0, 255, 0, 1)',
        borderColor: 'rgba(0, 0, 0, 1)',
        borderWidth: 1,
        radius: 10,
        label: {
          content: 'B',
          enabled: true,
          font: {
            weight: 'bold'
          }
        }
      });
    });
    
    // Add sell point annotations if any exist
    sellPoints.forEach(sellPoint => {
      annotations.push({
        type: 'point',
        xValue: sellPoint.timestamp,
        yValue: sellPoint.price,
        backgroundColor: 'rgba(255, 0, 0, 1)',
        borderColor: 'rgba(0, 0, 0, 1)',
        borderWidth: 1,
        radius: 10,
        label: {
          content: 'S',
          enabled: true,
          font: {
            weight: 'bold'
          }
        }
      });
    });
    
    // Create segments for the chart based on price direction
    const segments = [];
    let currentSegment = [];
    let isRising = true;
    
    // Process points to create segments with consistent direction
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const prevPoint = i > 0 ? points[i-1] : null;
      
      // Determine if price is rising or falling
      if (prevPoint) {
        const newIsRising = point.price >= prevPoint.price;
        
        // If direction changed, start a new segment
        if (newIsRising !== isRising && currentSegment.length > 0) {
          segments.push({
            points: [...currentSegment],
            isRising
          });
          currentSegment = [prevPoint]; // Include the previous point for continuity
          isRising = newIsRising;
        }
      }
      
      currentSegment.push(point);
    }
    
    // Add the last segment
    if (currentSegment.length > 0) {
      segments.push({
        points: currentSegment,
        isRising
      });
    }
    
    // Update chart data with multiple datasets for different colored segments
    setChartData({
      labels: points.map(p => new Date(p.timestamp)),
      datasets: [
        // Main dataset for points only (no lines)
        {
          label: selectedPosition.symbol,
          data: points.map(p => ({
            x: p.timestamp,
            y: p.price,
            isBuy: p.isBuy,
            isSell: p.isSell
          })),
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          pointRadius: (ctx) => {
            // Make buy/sell points more visible
            if (points[ctx.dataIndex]?.isBuy) return 8;
            if (points[ctx.dataIndex]?.isSell) return 8;
            return 4;
          },
          pointBackgroundColor: (ctx) => {
            // Color points based on type
            if (points[ctx.dataIndex]?.isBuy) return 'rgb(0, 255, 0)'; // Buy point - green
            if (points[ctx.dataIndex]?.isSell) return 'rgb(255, 0, 0)'; // Sell point - red
            return 'rgb(75, 192, 192)'; // Normal point - teal
          },
          pointHoverRadius: (ctx) => {
            if (points[ctx.dataIndex]?.isBuy || points[ctx.dataIndex]?.isSell) return 10;
            return 6;
          },
          pointHitRadius: 10,
          showLine: false // Don't show lines for this dataset
        },
        
        // Create a separate dataset for each segment with appropriate color
        ...segments.map((segment) => ({
          label: selectedPosition.symbol, // Use the same label for all segments to avoid multiple legend items
          data: segment.points.map(p => ({
            x: p.timestamp,
            y: p.price
          })),
          borderColor: segment.isRising ? 'rgb(0, 192, 0)' : 'rgb(255, 0, 0)', // Green for rising, red for falling
          backgroundColor: 'transparent', // No background fill
          tension: 0.1,
          fill: false,
          pointRadius: 0, // Hide points for line segments
          pointHoverRadius: 0,
          borderWidth: 2,
          showLine: true,
          // Hide this dataset from the legend
          hidden: false
        }))
      ]
    });
    
    // Update chart options with annotations and proper y-axis scaling
    setChartOptions(prevOptions => ({
      ...prevOptions,
      scales: {
        ...prevOptions.scales,
        y: {
          ...prevOptions.scales?.y,
          beginAtZero: false,
          min: minPrice,
          max: maxPrice
        }
      },
      plugins: {
        ...prevOptions.plugins,
        annotation: {
          annotations: annotations as any[]
        },
        // Hide duplicate legend entries
        legend: {
          labels: {
            filter: (legendItem, data) => {
              // Only show the first legend item with this label
              const index = data.datasets.findIndex(dataset => dataset.label === legendItem.text);
              return legendItem.datasetIndex === index;
            }
          }
        }
      }
    }));
  };
  
  // State for sell amount input
  const [sellAmount, setSellAmount] = useState<Record<string, number>>({});

  // Handle selling a position
  const handleSellPosition = async (position: TradeableCrypto) => {
    try {
      // Get amount to sell (default to full balance if not specified)
      const amountToSell = sellAmount[position.id] || position.balance;
      
      // Validate sell amount
      if (amountToSell <= 0 || amountToSell > position.balance) {
        toast.error(`Invalid sell amount. Must be between 0 and ${position.balance}`);
        return;
      }
      
      // Get current price
      const currentPrice = await fetchCurrentPrice(position.symbol, position.averageBuyPrice);
      
      // Execute sell
      await sellManual(position, amountToSell, 'bitvavo');
      
      // Add sell point to chart
      setChartPoints(prevPoints => {
        const newPoints = [...prevPoints];
        newPoints.push({
          timestamp: Date.now(),
          price: currentPrice,
          isSell: true
        });
        
        // Update chart with new data including sell point
        updateChartData(newPoints);
        
        // Update cache
        if (chartDataCache[position.id]) {
          chartDataCache[position.id] = [...newPoints];
        }
        
        return newPoints;
      });
      
      // Reset sell amount
      setSellAmount(prev => {
        const updated = {...prev};
        delete updated[position.id];
        return updated;
      });
      
      toast.success(`Sold ${amountToSell} ${position.symbol} at $${currentPrice.toFixed(6)}`);
    } catch (error) {
      console.error('Error selling position:', error);
      toast.error('Failed to sell position');
    }
  };
  
  // Cleanup chart on unmount
  useEffect(() => {
    // Component mount - register visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && selectedPosition) {
        // When tab becomes visible again, update the chart with cached data
        const positionId = selectedPosition.id;
        if (chartDataCache[positionId]) {
          setChartPoints(chartDataCache[positionId]);
          updateChartData(chartDataCache[positionId]);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      // Component unmount - cleanup
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [selectedPosition]);
  
  // Loading and error states
  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Portfolio</h1>
      
      {/* Using the existing update interval control from the main UI */}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Positions List */}
        <div className="space-y-2">
          {portfolio.length === 0 ? (
            <div className="text-gray-500">No coins in portfolio. Buy some coins to see them here.</div>
          ) : (
            portfolio.map(position => (
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
            ))
          )}
        </div>

        {/* Chart */}
        <div className="md:col-span-2 bg-white p-4 rounded shadow">
          {selectedPosition && chartData ? (
            <div className="h-96">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold">
                  {selectedPosition.name} ({selectedPosition.symbol})
                </h2>
                {!isAutoTrading && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      placeholder={`Amount (max: ${selectedPosition.balance})`}
                      value={sellAmount[selectedPosition.id] || ''}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setSellAmount(prev => ({
                          ...prev,
                          [selectedPosition.id]: isNaN(value) ? 0 : value
                        }));
                      }}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                      min="0"
                      max={selectedPosition.balance}
                      step="0.01"
                    />
                    <button
                      onClick={() => handleSellPosition(selectedPosition)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded"
                    >
                      Sell
                    </button>
                  </div>
                )}
              </div>
              <ChartWithErrorBoundary 
                data={chartData}
                options={chartOptions}
              />
            </div>
          ) : (
            <div>
              {portfolio.length === 0 
                ? "Buy coins to see charts" 
                : "Select a position to view chart"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
