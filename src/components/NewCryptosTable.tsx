import React, { useState } from 'react';
import { ArrowUp, ArrowDown, AlertCircle, Clock, TrendingUp, Zap } from 'lucide-react';
import useCryptoStore from '../store/useCryptoStore';
import useExchangeStore from '../store/useExchangeStore';
import { Cryptocurrency } from '../types';
import clsx from 'clsx';

const NewCryptosTable: React.FC = () => {
  const { newCryptos, highValueCryptos, loading, buyManual, isLiveTrading } = useCryptoStore();
  const { exchanges } = useExchangeStore();
  
  const [selectedCrypto, setSelectedCrypto] = useState<Cryptocurrency | null>(null);
  const [buyAmount, setBuyAmount] = useState<number>(1);
  const [selectedExchange, setSelectedExchange] = useState<'bitvavo' | 'binance'>('bitvavo');
  
  // Check if any exchange is connected
  const isExchangeConnected = exchanges.bitvavo.connected || exchanges.binance.connected;
  
  // Handle buy action
  const handleBuy = () => {
    if (selectedCrypto) {
      buyManual(selectedCrypto, buyAmount, selectedExchange);
      setSelectedCrypto(null);
    }
  };
  
  return (
    <div className="p-4">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">New Cryptocurrencies &lt; 24h</h2>
        <div className="flex items-center space-x-2 text-sm">
          <div className="flex items-center text-neutral-400">
            <Clock className="h-4 w-4 mr-1" />
            <span>Age &lt; 24h</span>
          </div>
          <div className="flex items-center text-amber-400">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span>High Value &gt; $1.5M</span>
          </div>
        </div>
      </div>
      
      {selectedCrypto && (
        <div className="mb-6 bg-background p-4 rounded-lg border border-neutral-700 animate-slide-down">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex items-center">
              <img src={selectedCrypto.image} alt={selectedCrypto.name} className="w-10 h-10 mr-3 rounded-full" />
              <div>
                <h3 className="font-medium text-white">{selectedCrypto.name}</h3>
                <p className="text-sm text-neutral-400">{selectedCrypto.symbol.toUpperCase()}</p>
              </div>
              <div className="ml-4 px-3 py-1 bg-background-lighter rounded-full">
                <span className="text-sm font-medium">${selectedCrypto.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 items-center">
              <div>
                <label htmlFor="amount" className="block text-xs text-neutral-400 mb-1">Amount</label>
                <input
                  id="amount"
                  type="number"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(Math.max(0.01, Number(e.target.value)))}
                  className="w-24 px-3 py-1.5 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              
              <div>
                <label htmlFor="exchange" className="block text-xs text-neutral-400 mb-1">Exchange</label>
                <select
                  id="exchange"
                  value={selectedExchange}
                  onChange={(e) => setSelectedExchange(e.target.value as 'bitvavo' | 'binance')}
                  className="w-32 px-3 py-1.5 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="bitvavo" disabled={!exchanges.bitvavo.connected}>Bitvavo {!exchanges.bitvavo.connected && '(Not Connected)'}</option>
                  <option value="binance" disabled={!exchanges.binance.connected}>Binance {!exchanges.binance.connected && '(Not Connected)'}</option>
                </select>
              </div>
              
              <div className="flex gap-2 self-end">
                <button
                  onClick={() => setSelectedCrypto(null)}
                  className="px-4 py-1.5 border border-neutral-600 rounded-md text-white hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBuy}
                  disabled={!isExchangeConnected}
                  className={clsx(
                    "px-4 py-1.5 rounded-md font-medium transition-colors",
                    isExchangeConnected
                      ? "bg-primary hover:bg-primary-dark text-white"
                      : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                  )}
                >
                  Buy {isLiveTrading ? 'Live' : 'Paper'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-neutral-700">
              <th className="text-left py-3 px-4 text-sm font-medium text-neutral-400">Name</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-neutral-400">Price</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-neutral-400">24h %</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-neutral-400">Market Cap</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-neutral-400">Volume</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-neutral-400">Age</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-neutral-400">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-neutral-400">
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-3 text-primary" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading cryptocurrencies...
                  </div>
                </td>
              </tr>
            ) : newCryptos.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-neutral-400">
                  No new cryptocurrencies found.
                </td>
              </tr>
            ) : (
              newCryptos.map((crypto) => {
                const isHighValue = highValueCryptos.some(c => c.id === crypto.id);
                
                return (
                  <tr 
                    key={crypto.id} 
                    className={clsx(
                      "border-b border-neutral-700 hover:bg-background/50 transition-colors cursor-pointer",
                      isHighValue && "bg-amber-900/10"
                    )}
                    onClick={() => setSelectedCrypto(crypto)}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <img src={crypto.image} alt={crypto.name} className="w-6 h-6 mr-3 rounded-full" />
                        <div>
                          <p className="font-medium text-white">{crypto.name}</p>
                          <p className="text-xs text-neutral-400">{crypto.symbol.toUpperCase()}</p>
                        </div>
                        {isHighValue && (
                          <span className="ml-2">
                            <AlertCircle className="h-4 w-4 text-amber-400" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono">
                      ${crypto.current_price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 6
                      })}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className={clsx(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs",
                        crypto.price_change_percentage_24h > 0
                          ? "text-green-300 bg-green-900/20"
                          : "text-red-300 bg-red-900/20"
                      )}>
                        {crypto.price_change_percentage_24h > 0 ? (
                          <ArrowUp className="h-3 w-3 mr-1" />
                        ) : (
                          <ArrowDown className="h-3 w-3 mr-1" />
                        )}
                        {Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      ${crypto.market_cap.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      ${crypto.total_volume.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center">
                        <Clock className="h-3 w-3 mr-1 text-neutral-400" />
                        <span className="text-sm">{crypto.age_hours}h</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCrypto(crypto);
                        }}
                        className="inline-flex items-center justify-center px-3 py-1 bg-background hover:bg-neutral-700 rounded-md text-white text-sm transition-colors"
                      >
                        <Zap className="h-3 w-3 mr-1 text-primary" />
                        Trade
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NewCryptosTable;