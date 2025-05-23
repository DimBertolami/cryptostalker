import React, { useState } from 'react';
import { Wallet, Percent, Activity, TrendingUp, TrendingDown } from 'lucide-react';
import useCryptoStore from '../store/useCryptoStore';
import clsx from 'clsx';

type TradeStrategy = 'linear' | 'volatile';

const TradeSettings: React.FC = () => {
  const { 
    tradeSettings,
    updateTradeSettings 
  } = useCryptoStore();
  
  const [activeStrategy, setActiveStrategy] = useState<TradeStrategy>('linear');
  const [selectedExchange, setSelectedExchange] = useState<string>('binance');
  
  const wallets = [
    { id: 'wallet1', name: 'Primary Wallet', balance: 1000 },
    { id: 'wallet2', name: 'Secondary Wallet', balance: 500 }
  ];
  
  const handleStrategyChange = (strategy: TradeStrategy) => {
    setActiveStrategy(strategy);
  };
  
  const handleWalletPercentageChange = (walletId: string, percentage: number) => {
    // Update wallet allocation percentage
    updateTradeSettings({
      ...tradeSettings,
      walletAllocation: {
        ...tradeSettings.walletAllocation,
        [walletId]: percentage
      }
    });
  };
  
  const handleStrategyParamChange = (param: string, value: number) => {
    // Update strategy parameters
    updateTradeSettings({
      ...tradeSettings,
      strategyParams: {
        ...tradeSettings.strategyParams,
        [activeStrategy]: {
          ...tradeSettings.strategyParams[activeStrategy],
          [param]: value
        }
      }
    });
  };
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-white mb-6">Trade Settings</h2>
      
      {/* Wallet Allocation Section */}
      <div className="mb-8">
        <h3 className="flex items-center text-lg font-medium text-white mb-4">
          <Wallet className="mr-2 h-5 w-5" /> Wallet Allocation
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-neutral-400 mb-2">Exchange</label>
          <select 
            className="w-full bg-background border border-neutral-600 rounded-md text-white p-2"
            value={selectedExchange}
            onChange={(e) => setSelectedExchange(e.target.value)}
          >
            <option value="binance">Binance</option>
            <option value="bitvavo">Bitvavo</option>
            <option value="paper">Paper Trading</option>
          </select>
        </div>
        
        <div className="space-y-4">
          {wallets.map(wallet => (
            <div key={wallet.id} className="flex items-center">
              <span className="w-32 text-white">{wallet.name}</span>
              <input
                type="range"
                min="0"
                max="100"
                value={tradeSettings.walletAllocation[wallet.id] || 0}
                onChange={(e) => handleWalletPercentageChange(wallet.id, parseInt(e.target.value))}
                className="flex-1 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="ml-4 w-12 text-right text-white">
                {tradeSettings.walletAllocation[wallet.id] || 0}%
              </span>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-sm text-neutral-400">
          <p>Total allocated: {Object.values(tradeSettings.walletAllocation).reduce((a, b) => a + b, 0)}%</p>
          {Object.values(tradeSettings.walletAllocation).reduce((a, b) => a + b, 0) > 100 && (
            <p className="text-red-500">Warning: Allocation exceeds 100%</p>
          )}
        </div>
      </div>
      
      {/* Strategy Selection */}
      <div className="mb-6">
        <h3 className="flex items-center text-lg font-medium text-white mb-4">
          <Activity className="mr-2 h-5 w-5" /> Trading Strategy
        </h3>
        
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => handleStrategyChange('linear')}
            className={clsx(
              "px-4 py-2 rounded-md font-medium transition-colors flex items-center",
              activeStrategy === 'linear' 
                ? "bg-primary text-white" 
                : "bg-neutral-700 text-neutral-300"
            )}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Linear Rise
          </button>
          
          <button
            onClick={() => handleStrategyChange('volatile')}
            className={clsx(
              "px-4 py-2 rounded-md font-medium transition-colors flex items-center",
              activeStrategy === 'volatile' 
                ? "bg-primary text-white" 
                : "bg-neutral-700 text-neutral-300"
            )}
          >
            <TrendingDown className="mr-2 h-4 w-4" />
            Volatile
          </button>
        </div>
      </div>
      
      {/* Strategy Parameters */}
      <div>
        <h3 className="flex items-center text-lg font-medium text-white mb-4">
          <Percent className="mr-2 h-5 w-5" /> Strategy Parameters
        </h3>
        
        {activeStrategy === 'linear' ? (
          <div className="space-y-4">
            <div className="flex items-center">
              <span className="w-48 text-white">Buy Threshold (%)</span>
              <input
                type="number"
                value={tradeSettings.strategyParams.linear.buyThreshold}
                onChange={(e) => handleStrategyParamChange('buyThreshold', parseFloat(e.target.value))}
                className="ml-4 px-3 py-2 bg-background border border-neutral-600 rounded-md text-white"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            
            <div className="flex items-center">
              <span className="w-48 text-white">Sell Threshold (%)</span>
              <input
                type="number"
                value={tradeSettings.strategyParams.linear.sellThreshold}
                onChange={(e) => handleStrategyParamChange('sellThreshold', parseFloat(e.target.value))}
                className="ml-4 px-3 py-2 bg-background border border-neutral-600 rounded-md text-white"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center">
              <span className="w-48 text-white">Volatility Threshold (%)</span>
              <input
                type="number"
                value={tradeSettings.strategyParams.volatile.volatilityThreshold}
                onChange={(e) => handleStrategyParamChange('volatilityThreshold', parseFloat(e.target.value))}
                className="ml-4 px-3 py-2 bg-background border border-neutral-600 rounded-md text-white"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            
            <div className="flex items-center">
              <span className="w-48 text-white">Quick Sell (%)</span>
              <input
                type="number"
                value={tradeSettings.strategyParams.volatile.quickSellThreshold}
                onChange={(e) => handleStrategyParamChange('quickSellThreshold', parseFloat(e.target.value))}
                className="ml-4 px-3 py-2 bg-background border border-neutral-600 rounded-md text-white"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            
            <div className="flex items-center">
              <span className="w-48 text-white">Quick Buy (%)</span>
              <input
                type="number"
                value={tradeSettings.strategyParams.volatile.quickBuyThreshold}
                onChange={(e) => handleStrategyParamChange('quickBuyThreshold', parseFloat(e.target.value))}
                className="ml-4 px-3 py-2 bg-background border border-neutral-600 rounded-md text-white"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Paper Trading Simulation */}
      <div className="mt-8 p-4 bg-neutral-800 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-4">Paper Trading Simulation</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-neutral-700 p-3 rounded-lg">
            <p className="text-sm text-neutral-400">Total Profit</p>
            <p className="text-xl font-bold text-green-500">+$1,245.67</p>
          </div>
          
          <div className="bg-neutral-700 p-3 rounded-lg">
            <p className="text-sm text-neutral-400">Success Rate</p>
            <p className="text-xl font-bold text-green-500">76%</p>
          </div>
          
          <div className="bg-neutral-700 p-3 rounded-lg">
            <p className="text-sm text-neutral-400">Avg. Profit</p>
            <p className="text-xl font-bold text-green-500">8.2%</p>
          </div>
          
          <div className="bg-neutral-700 p-3 rounded-lg">
            <p className="text-sm text-neutral-400">Max Drawdown</p>
            <p className="text-xl font-bold text-red-500">-15.3%</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-neutral-400">Total Trades</span>
            <span className="text-white">42</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Winning Trades</span>
            <span className="text-green-500">32</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400">Losing Trades</span>
            <span className="text-red-500">10</span>
          </div>
        </div>
        
        <button 
          className="mt-4 w-full py-2 bg-primary hover:bg-primary-dark text-white rounded-md font-medium transition-colors"
          onClick={() => console.log('Running simulation...')}
        >
          Run Simulation
        </button>
      </div>
      
      {/* Paper Trading Simulation */}
      <div className="mt-8 p-6 bg-neutral-800 rounded-lg border border-neutral-700">
        <h3 className="text-xl font-semibold text-white mb-6">Paper Trading Simulation</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Performance Metrics */}
          <div className="bg-neutral-700/50 p-4 rounded-lg">
            <p className="text-sm text-neutral-400">Total Profit</p>
            <p className="text-2xl font-bold text-green-500">+$1,245.67</p>
            <p className="text-xs text-neutral-500 mt-1">+12.4% all time</p>
          </div>
          
          <div className="bg-neutral-700/50 p-4 rounded-lg">
            <p className="text-sm text-neutral-400">Success Rate</p>
            <p className="text-2xl font-bold text-green-500">76%</p>
            <p className="text-xs text-neutral-500 mt-1">32/42 winning trades</p>
          </div>
          
          <div className="bg-neutral-700/50 p-4 rounded-lg">
            <p className="text-sm text-neutral-400">Avg. Profit</p>
            <p className="text-2xl font-bold text-green-500">8.2%</p>
            <p className="text-xs text-neutral-500 mt-1">per trade</p>
          </div>
          
          <div className="bg-neutral-700/50 p-4 rounded-lg">
            <p className="text-sm text-neutral-400">Max Drawdown</p>
            <p className="text-2xl font-bold text-red-500">-15.3%</p>
            <p className="text-xs text-neutral-500 mt-1">worst period</p>
          </div>
        </div>
        
        {/* Trade Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="text-sm font-medium text-neutral-400 mb-3">TRADE STATISTICS</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-400">Total Trades</span>
                <span className="text-white font-medium">42</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Winning Trades</span>
                <span className="text-green-500 font-medium">32 (76%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Losing Trades</span>
                <span className="text-red-500 font-medium">10 (24%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Avg. Trade Duration</span>
                <span className="text-white font-medium">2h 15m</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-neutral-400 mb-3">PERFORMANCE METRICS</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-400">Sharpe Ratio</span>
                <span className="text-white font-medium">1.85</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Win/Loss Ratio</span>
                <span className="text-green-500 font-medium">3.2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Max Consecutive Wins</span>
                <span className="text-green-500 font-medium">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Max Consecutive Losses</span>
                <span className="text-red-500 font-medium">3</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Simulation Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-neutral-700">
          <div className="text-sm text-neutral-400 mb-3 sm:mb-0">
            Last simulation: {new Date().toLocaleString()}
          </div>
          <div className="flex space-x-3">
            <button 
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-md font-medium transition-colors"
              onClick={() => console.log('View full report')}
            >
              View Full Report
            </button>
            <button 
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md font-medium transition-colors flex items-center"
              onClick={() => console.log('Run new simulation')}
            >
              <Activity className="mr-2 h-4 w-4" />
              Run New Simulation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradeSettings;
