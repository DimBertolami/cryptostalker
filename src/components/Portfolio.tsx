import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Wallet } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions
} from 'chart.js';
import useCryptoStore from '../store/useCryptoStore';
import clsx from 'clsx';
import annotationPlugin from 'chartjs-plugin-annotation';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
);

const Portfolio: React.FC = () => {
  const { portfolio, sellManual, updateInterval } = useCryptoStore();
  const [priceHistory, setPriceHistory] = useState<Map<string, { 
    prices: number[], 
    timestamps: string[],
    basePrice: number,
    normalizedPrices: number[]
  }>>(new Map());
  
  // Update price history when portfolio changes
  useEffect(() => {
    portfolio.forEach(position => {
      setPriceHistory(prev => {
        const now = new Date().toLocaleTimeString();
        const history = prev.get(position.id) || { 
          prices: [], 
          timestamps: [], 
          basePrice: position.averageBuyPrice,
          normalizedPrices: []
        };
        
        // Ensure we have all purchase points if this is new
        if (history.prices.length === 0) {
          // Add all purchases from history if available
          if (position.purchaseHistory && position.purchaseHistory.length > 0) {
            position.purchaseHistory.forEach((purchase: any) => {
              const purchaseTime = new Date(purchase.timestamp).toLocaleTimeString();
              if (!history.timestamps.includes(purchaseTime)) {
                history.timestamps.push(purchaseTime);
                history.prices.push(purchase.price);
                history.normalizedPrices.push(0); // Buy point is at y=0
              }
            });
          }
          // Fall back to original purchase timestamp
          else if (position.purchaseTimestamp) {
            const purchaseTime = new Date(position.purchaseTimestamp).toLocaleTimeString();
            history.timestamps.push(purchaseTime);
            history.prices.push(position.averageBuyPrice);
            history.normalizedPrices.push(0); // Buy point is at y=0
          }
        }
        
        // Check if we need to add any new purchase points from history
        if (position.purchaseHistory) {
          position.purchaseHistory.forEach((purchase: any) => {
            const purchaseTime = new Date(purchase.timestamp).toLocaleTimeString();
            if (!history.timestamps.includes(purchaseTime)) {
              // Find the right position to insert chronologically
              const now = new Date().getTime();
              const purchaseDate = new Date(purchase.timestamp).getTime();
              const timeGap = now - purchaseDate;
              
              // If the purchase was within the last minute, add it to the chart
              if (timeGap < 60000) {
                history.timestamps.push(purchaseTime);
                history.prices.push(purchase.price);
                
                // Calculate normalized price
                const normalizedPrice = ((purchase.price - history.basePrice) / history.basePrice) * 100;
                history.normalizedPrices.push(normalizedPrice);
              }
            }
          });
        }
        
        // Track highest price
        if (position.currentPrice > position.highestPrice) {
          position.highestPrice = position.currentPrice;
          position.highestPriceTimestamp = Date.now();
        }
        
        // Add current price point
        const prices = [...history.prices, position.currentPrice];
        const timestamps = [...history.timestamps, now];
        
        // Calculate normalized prices relative to purchase price
        // This makes the buy point always at y=0 and other prices relative to it
        const normalizedPrices = prices.map(price => 
          ((price - history.basePrice) / history.basePrice) * 100
        );
        
        // Keep history bounded but ensure the buy point is always included
        let newPrices = prices;
        let newTimestamps = timestamps;
        let newNormalizedPrices = normalizedPrices;
        
        const maxPoints = 50;
        
        if (prices.length > maxPoints) {
          // Always keep purchase timestamps (could be multiple) and add newer points
          const purchaseIndices: number[] = [];
          
          // Find indices of all purchase timestamps
          if (position.purchaseHistory && position.purchaseHistory.length > 0) {
            position.purchaseHistory.forEach((purchase: any) => {
              const purchaseTime = new Date(purchase.timestamp).toLocaleTimeString();
              const index = history.timestamps.findIndex(t => t === purchaseTime);
              if (index >= 0) {
                purchaseIndices.push(index);
              }
            });
          } else if (position.purchaseTimestamp) {
            const purchaseIndex = history.timestamps.findIndex(
              t => new Date(position.purchaseTimestamp).toLocaleTimeString() === t
            );
            if (purchaseIndex >= 0) {
              purchaseIndices.push(purchaseIndex);
            }
          }
          
          // Use the first purchase index if available
          const purchaseIndex = purchaseIndices.length > 0 ? purchaseIndices[0] : -1;
          
          if (purchaseIndex >= 0) {
            // Keep purchase point and the most recent points
            newPrices = [
              prices[purchaseIndex], 
              ...prices.slice(-(maxPoints - 1))
            ];
            
            newTimestamps = [
              timestamps[purchaseIndex],
              ...timestamps.slice(-(maxPoints - 1))
            ];
            
            newNormalizedPrices = [
              normalizedPrices[purchaseIndex],
              ...normalizedPrices.slice(-(maxPoints - 1))
            ];
          } else {
            // If we can't find the purchase point, just keep the most recent points
            newPrices = prices.slice(-maxPoints);
            newTimestamps = timestamps.slice(-maxPoints);
            newNormalizedPrices = normalizedPrices.slice(-maxPoints);
          }
        }
        
        const newHistory = new Map(prev);
        newHistory.set(position.id, { 
          prices: newPrices, 
          timestamps: newTimestamps,
          basePrice: history.basePrice,
          normalizedPrices: newNormalizedPrices
        });
        return newHistory;
      });
    });
  }, [portfolio]);
  
  // Calculate total portfolio value
  const totalValue = portfolio.reduce((total, position) => {
    return total + (position.balance * position.currentPrice);
  }, 0);
  
  // Calculate total profit/loss
  const totalProfitLoss = portfolio.reduce((total, position) => {
    return total + position.profitLoss;
  }, 0);
  
  // Create chart annotations for buy/sell points
  const createChartAnnotationsForPosition = (position: any, history: any) => {
    let annotations: any = {};
    
    // Add buy annotations for all purchases in history if available
    if (position.purchaseHistory && position.purchaseHistory.length > 0) {
      position.purchaseHistory.forEach((purchase: any, index: number) => {
        const purchaseTime = new Date(purchase.timestamp).toLocaleTimeString();
        annotations[`buyLine${index}`] = {
          type: 'line',
          xMin: purchaseTime,
          xMax: purchaseTime,
          yMin: 0,
          yMax: 'max',
          borderColor: 'rgba(0, 255, 0, 0.7)',
          borderWidth: 2,
          label: {
            display: true,
            content: 'B',
            position: 'start',
            backgroundColor: 'rgba(0, 155, 0, 0.9)',
            color: 'white',
            font: {
              weight: 'bold'
            }
          }
        };
      });
    }
    // Fall back to original purchase timestamp if no purchase history
    else if (position.purchaseTimestamp) {
      const purchaseTime = new Date(position.purchaseTimestamp).toLocaleTimeString();
      annotations.buyLine = {
        type: 'line',
        xMin: purchaseTime,
        xMax: purchaseTime,
        yMin: 0,
        yMax: 'max',
        borderColor: 'rgba(0, 255, 0, 0.7)',
        borderWidth: 2,
        label: {
          display: true,
          content: 'B',
          position: 'start',
          backgroundColor: 'rgba(0, 155, 0, 0.9)',
          color: 'white',
          font: {
            weight: 'bold'
          }
        }
      };
    }
    
    // Add sell annotation if the position has been sold
    if (position.sellTimestamp) {
      const sellTime = new Date(position.sellTimestamp).toLocaleTimeString();
      annotations.sellLine = {
        type: 'line',
        xMin: sellTime,
        xMax: sellTime,
        yMin: 'min',
        yMax: 'max',
        borderColor: 'rgba(255, 0, 0, 0.7)',
        borderWidth: 2,
        label: {
          display: true,
          content: 'S',
          position: 'start',
          backgroundColor: 'rgba(155, 0, 0, 0.9)',
          color: 'white',
          font: {
            weight: 'bold'
          }
        }
      };
    }
    
    // Add highest price marker if it exists and is different from purchase
    if (position.highestPriceTimestamp && position.highestPriceTimestamp !== position.purchaseTimestamp) {
      const highestTime = new Date(position.highestPriceTimestamp).toLocaleTimeString();
      const normalizedHighestPrice = ((position.highestPrice - history.basePrice) / history.basePrice) * 100;
      
      annotations.highestPoint = {
        type: 'point',
        xValue: highestTime,
        yValue: normalizedHighestPrice,
        backgroundColor: 'rgba(255, 215, 0, 0.7)',
        borderColor: 'gold',
        borderWidth: 2,
        radius: 4,
        label: {
          display: true,
          content: 'H',
          position: 'top',
          backgroundColor: 'rgba(218, 165, 32, 0.9)',
          color: 'white',
          font: {
            weight: 'bold'
          }
        }
      };
    }
    
    return annotations;
  };
  
  // Chart options
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0
    },
    scales: {
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#94a3b8'
        },
        title: {
          display: true,
          text: '% Change from Purchase',
          color: '#94a3b8'
        },
        // Auto-scale but ensure 0 is included
        beginAtZero: true
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#94a3b8',
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 5
        }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#fff',
        bodyColor: '#94a3b8',
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              // Show both the percentage and actual price
              const percentChange = context.parsed.y.toFixed(2) + '%';
              return `${label}${percentChange}`;
            }
            return label;
          },
          afterLabel: function(context) {
            const dataIndex = context.dataIndex;
            const datasetIndex = context.datasetIndex;
            
            // Get the actual price from the original prices array
            const position = portfolio[datasetIndex];
            const history = priceHistory.get(position.id);
            
            if (history && history.prices[dataIndex]) {
              return `Price: $${history.prices[dataIndex].toFixed(6)}`;
            }
            return '';
          }
        }
      },
      annotation: {
        annotations: {}
      }
    }
  };
  
  // Handle sell action for a position
  const handleSell = (position: any) => {
    const cryptoToSell = {
      id: position.id,
      name: position.name,
      symbol: position.symbol,
      current_price: position.currentPrice
    };
    
    sellManual(cryptoToSell, position.balance, 'bitvavo');
  };
  
  return (
    <div>
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-background rounded-lg p-4 border border-neutral-700">
          <div className="flex items-center mb-2">
            <Wallet className="h-5 w-5 text-neutral-400 mr-2" />
            <h3 className="text-sm font-medium text-neutral-400">Portfolio Value</h3>
          </div>
          <p className="text-2xl font-semibold text-white">
            ${totalValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </p>
        </div>
        
        <div className="bg-background rounded-lg p-4 border border-neutral-700">
          <div className="flex items-center mb-2">
            <BarChart3 className="h-5 w-5 text-neutral-400 mr-2" />
            <h3 className="text-sm font-medium text-neutral-400">Portfolio Performance</h3>
          </div>
          <div className="flex items-center">
            {totalProfitLoss >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500 mr-2" />
            )}
            <p className={clsx(
              "text-2xl font-semibold",
              totalProfitLoss >= 0 ? "text-green-500" : "text-red-500"
            )}>
              ${Math.abs(totalProfitLoss).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </p>
          </div>
        </div>
        
        <div className="bg-background rounded-lg p-4 border border-neutral-700">
          <div className="flex items-center mb-2">
            <DollarSign className="h-5 w-5 text-neutral-400 mr-2" />
            <h3 className="text-sm font-medium text-neutral-400">Assets</h3>
          </div>
          <p className="text-2xl font-semibold text-white">{portfolio.length}</p>
        </div>
        
        <div className="bg-background rounded-lg p-4 border border-neutral-700">
          <div className="flex items-center mb-2">
            <BarChart3 className="h-5 w-5 text-neutral-400 mr-2" />
            <h3 className="text-sm font-medium text-neutral-400">Update Interval</h3>
          </div>
          <p className="text-2xl font-semibold text-white">{updateInterval}s</p>
        </div>
      </div>
      
      {portfolio.length > 0 && (
        <div className="mb-6 grid grid-cols-1 gap-4">
          {portfolio.map((position, index) => {
            const history = priceHistory.get(position.id);
            if (!history) return null;
            
            // Create chart data using normalized prices (relative to purchase price)
            const chartData = {
              labels: history.timestamps,
              datasets: [
                {
                  label: `${position.name} (${position.symbol.toUpperCase()})`,
                  data: history.normalizedPrices,
                  borderColor: position.profitLoss >= 0 ? '#10b981' : '#ef4444',
                  backgroundColor: position.profitLoss >= 0 ? 
                    'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  borderWidth: 2,
                  pointRadius: 0,
                  pointHoverRadius: 4,
                  fill: true,
                  tension: 0.4
                }
              ]
            };
            
            // Create custom chart options with appropriate Y-axis scale and annotations
            const positionChartOptions = {
              ...chartOptions,
              scales: {
                ...chartOptions.scales,
                y: {
                  ...chartOptions.scales.y,
                  // Ensure proper scaling that always includes 0
                  suggestedMin: Math.min(-1, ...history.normalizedPrices), // At least -1%
                  suggestedMax: Math.max(1, ...history.normalizedPrices)   // At least +1%
                }
              },
              plugins: {
                ...chartOptions.plugins,
                annotation: {
                  annotations: createChartAnnotationsForPosition(position, history)
                }
              }
            };
            
            return (
              <div key={position.id} className="bg-background rounded-lg p-4 border border-neutral-700">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-medium text-white">{position.name}</h3>
                    <p className="text-sm text-neutral-400">Updated every {updateInterval}s</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-medium text-white">
                      ${position.currentPrice.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6
                      })}
                    </p>
                    <p className={clsx(
                      "text-sm",
                      position.profitLossPercentage >= 0 ? "text-green-400" : "text-red-400"
                    )}>
                      {position.profitLossPercentage >= 0 ? "+" : ""}
                      {position.profitLossPercentage.toFixed(2)}%
                    </p>
                  </div>
                </div>
                <div className="h-[200px]">
                  <Line options={positionChartOptions} data={chartData} />
                </div>
                <div className="mt-4 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-neutral-400">Amount: {position.balance} {position.symbol.toUpperCase()}</p>
                    <p className="text-sm text-neutral-400">Avg Buy: ${position.averageBuyPrice.toFixed(6)}</p>
                  </div>
                  <button
                    onClick={() => handleSell(position)}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Sell All
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {portfolio.length === 0 ? (
        <div className="bg-background rounded-lg p-8 text-center border border-neutral-700">
          <Wallet className="h-12 w-12 text-neutral-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">Your portfolio is empty</h3>
          <p className="text-neutral-400">Buy some cryptocurrencies to get started</p>
        </div>
      ) : (
        <div className="bg-background rounded-lg p-4 border border-neutral-700">
          <h3 className="text-lg font-medium text-white mb-4">Assets</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Asset</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Balance</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Avg. Buy Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Current Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Profit/Loss</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Total Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-700">
                {portfolio.map((position) => {
                  const totalValue = position.balance * position.currentPrice;
                  
                  return (
                    <tr key={position.id}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <div className="h-8 w-8 rounded-full bg-background-lighter flex items-center justify-center">
                              <span className="text-xs text-white">{position.symbol.slice(0, 3)}</span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-white">{position.name}</p>
                            <p className="text-xs text-neutral-400">{position.symbol.toUpperCase()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-white">{position.balance}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                        ${position.averageBuyPrice.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                        ${position.currentPrice.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm">
                          <p className={clsx(
                            position.profitLoss >= 0 ? "text-green-400" : "text-red-400"
                          )}>
                            {position.profitLoss >= 0 ? "+" : ""}
                            ${Math.abs(position.profitLoss).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </p>
                          <p className={clsx(
                            "text-xs",
                            position.profitLossPercentage >= 0 ? "text-green-400" : "text-red-400"
                          )}>
                            {position.profitLossPercentage >= 0 ? "+" : ""}
                            {position.profitLossPercentage.toFixed(2)}%
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                        ${totalValue.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => handleSell(position)}
                          className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1 px-3 rounded"
                        >
                          Sell All
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Portfolio;
