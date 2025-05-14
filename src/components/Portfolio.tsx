import React from 'react';
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Wallet } from 'lucide-react';
import useCryptoStore from '../store/useCryptoStore';
import clsx from 'clsx';

const Portfolio: React.FC = () => {
  const { portfolio, sellManual } = useCryptoStore();
  
  // Calculate total portfolio value
  const totalValue = portfolio.reduce((total, position) => {
    return total + (position.balance * position.currentPrice);
  }, 0);
  
  // Calculate total profit/loss
  const totalProfitLoss = portfolio.reduce((total, position) => {
    return total + position.profitLoss;
  }, 0);
  
  // Handle sell action for a position
  const handleSell = (position: any) => {
    // Find the full crypto object from the store
    const cryptoToSell = {
      id: position.id,
      name: position.name,
      symbol: position.symbol,
      current_price: position.currentPrice
    };
    
    sellManual(cryptoToSell as any, position.balance, 'bitvavo');
  };
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-white mb-4">Portfolio</h2>
      
      {/* Portfolio Summary */}
      {portfolio.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-background rounded-lg p-4 border border-neutral-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-400">Total Value</p>
                <p className="text-2xl font-semibold text-white mt-1">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </div>
          
          <div className="bg-background rounded-lg p-4 border border-neutral-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-400">Total P/L</p>
                <p className={clsx(
                  "text-2xl font-semibold mt-1",
                  totalProfitLoss >= 0 ? "text-success" : "text-error"
                )}>
                  {totalProfitLoss >= 0 ? '+' : ''}{totalProfitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              {totalProfitLoss >= 0 ? (
                <TrendingUp className="h-5 w-5 text-success" />
              ) : (
                <TrendingDown className="h-5 w-5 text-error" />
              )}
            </div>
          </div>
          
          <div className="bg-background rounded-lg p-4 border border-neutral-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-400">Assets</p>
                <p className="text-2xl font-semibold text-white mt-1">{portfolio.length}</p>
              </div>
              <Wallet className="h-5 w-5 text-primary" />
            </div>
          </div>
          
          <div className="bg-background rounded-lg p-4 border border-neutral-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-neutral-400">Trading Mode</p>
                <p className="text-xl font-semibold mt-1 flex items-center">
                  <span className={clsx(
                    "px-2 py-0.5 rounded text-sm",
                    useCryptoStore.getState().isLiveTrading
                      ? "bg-error/20 text-error-light"
                      : "bg-secondary/20 text-secondary-light"
                  )}>
                    {useCryptoStore.getState().isLiveTrading ? 'Live Trading' : 'Paper Trading'}
                  </span>
                </p>
              </div>
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>
      )}
      
      {portfolio.length === 0 ? (
        <div className="bg-background rounded-lg p-8 text-center border border-neutral-700">
          <Wallet className="h-12 w-12 text-neutral-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">Your portfolio is empty</h3>
          <p className="text-neutral-400">
            Buy some cryptocurrencies to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-neutral-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-400">Asset</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-neutral-400">Balance</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-neutral-400">Avg. Buy Price</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-neutral-400">Current Price</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-neutral-400">Profit/Loss</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-neutral-400">Total Value</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-neutral-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((position) => (
                <tr key={position.id} className="border-b border-neutral-700 hover:bg-background/50 transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center">
                      <div>
                        <p className="font-medium text-white">{position.name}</p>
                        <p className="text-xs text-neutral-400">{position.symbol.toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right font-mono">
                    {position.balance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 8
                    })}
                  </td>
                  <td className="py-4 px-4 text-right font-mono">
                    ${position.averageBuyPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6
                    })}
                  </td>
                  <td className="py-4 px-4 text-right font-mono">
                    ${position.currentPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6
                    })}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex flex-col items-end">
                      <div className={clsx(
                        "inline-flex items-center",
                        position.profitLoss >= 0 ? "text-success" : "text-error"
                      )}>
                        {position.profitLoss >= 0 ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        <span className="font-mono">
                          {position.profitLoss >= 0 ? '+' : ''}${Math.abs(position.profitLoss).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </span>
                      </div>
                      <div className={clsx(
                        "text-xs",
                        position.profitLossPercentage >= 0 ? "text-success" : "text-error"
                      )}>
                        {position.profitLossPercentage >= 0 ? '+' : ''}{position.profitLossPercentage.toFixed(2)}%
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right font-mono">
                    ${(position.balance * position.currentPrice).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <button
                      onClick={() => handleSell(position)}
                      className="inline-flex items-center justify-center px-3 py-1 bg-error hover:bg-error-dark rounded-md text-white text-sm transition-colors"
                    >
                      Sell All
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Portfolio;