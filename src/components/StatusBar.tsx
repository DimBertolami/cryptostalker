import React, { useState } from 'react';
import { PlayCircle, PauseCircle, Clock, RefreshCw, Wallet } from 'lucide-react';
import useCryptoStore from '../store/useCryptoStore';
import useExchangeStore from '../store/useExchangeStore';
import clsx from 'clsx';

const StatusBar: React.FC = () => {
  const { 
    isAutoTrading, 
    toggleAutoTrading, 
    updateInterval, 
    setUpdateInterval,
    isLiveTrading,
    toggleLiveTrading
  } = useCryptoStore();
  
  const { exchanges } = useExchangeStore();
  
  // Options for update interval
  const intervalOptions = [1, 2, 3, 5, 10];
  
  // State for interval dropdown visibility
  const [showIntervalDropdown, setShowIntervalDropdown] = useState(false);
  
  return (
    <div className="bg-background-lighter border border-neutral-700 rounded-lg p-4 mb-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleAutoTrading}
            className={clsx(
              "flex items-center px-4 py-2 rounded-md font-medium transition-colors",
              isAutoTrading 
                ? "bg-primary-dark hover:bg-primary-dark/90 text-white" 
                : "bg-neutral-700 hover:bg-neutral-600 text-white"
            )}
          >
            {isAutoTrading ? <PauseCircle className="mr-2 h-5 w-5" /> : <PlayCircle className="mr-2 h-5 w-5" />}
            {isAutoTrading ? "Stop Auto-Trading" : "Start Auto-Trading"}
          </button>
          
          <div className="relative">
            <button
              onClick={() => setShowIntervalDropdown(!showIntervalDropdown)}
              className="flex items-center px-3 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-md text-white transition-colors"
            >
              <Clock className="mr-2 h-4 w-4" />
              {updateInterval}s
              <RefreshCw className="ml-1 h-3 w-3" />
            </button>
            
            {showIntervalDropdown && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-background-lighter border border-neutral-700 rounded-md shadow-lg z-10 animate-slide-down">
                <div className="p-2">
                  <p className="text-xs text-neutral-400 mb-2">Update Interval</p>
                  <div className="grid grid-cols-3 gap-1">
                    {intervalOptions.map(interval => (
                      <button
                        key={interval}
                        onClick={() => {
                          setUpdateInterval(interval);
                          setShowIntervalDropdown(false);
                        }}
                        className={clsx(
                          "px-2 py-1 rounded text-sm",
                          updateInterval === interval 
                            ? "bg-primary-dark text-white" 
                            : "bg-neutral-700 text-white hover:bg-neutral-600"
                        )}
                      >
                        {interval}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className={clsx(
              "w-2 h-2 rounded-full mr-2",
              exchanges.bitvavo.connected || exchanges.binance.connected 
                ? "bg-success" 
                : "bg-neutral-500"
            )}></div>
            <span className="text-sm text-neutral-300">
              {exchanges.bitvavo.connected || exchanges.binance.connected 
                ? "Exchange Connected" 
                : "No Exchange Connected"}
            </span>
          </div>
          
          <button
            onClick={toggleLiveTrading}
            disabled={!exchanges.bitvavo.connected && !exchanges.binance.connected}
            className={clsx(
              "flex items-center px-3 py-2 rounded-md font-medium text-sm transition-colors",
              isLiveTrading 
                ? "bg-error-dark hover:bg-error text-white" 
                : "bg-secondary-dark hover:bg-secondary text-white",
              (!exchanges.bitvavo.connected && !exchanges.binance.connected) && "opacity-50 cursor-not-allowed"
            )}
          >
            <Wallet className="mr-2 h-4 w-4" />
            {isLiveTrading ? "Live Trading" : "Paper Trading"}
          </button>
        </div>
      </div>
      
      {isAutoTrading && (
        <div className="mt-4 px-4 py-3 bg-primary/10 border border-primary/30 rounded-md animate-fade-in">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse mr-2"></div>
            <p className="text-sm text-primary-light">
              Auto-trading is active. System will monitor new cryptos that exceed $1.5M in volume or market cap,
              and sell after detecting 3 consecutive price drops.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusBar;