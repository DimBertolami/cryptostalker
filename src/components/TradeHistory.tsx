import React from 'react';
import { ArrowUpRight, ArrowDownRight, Calendar, DollarSign } from 'lucide-react';
import useCryptoStore from '../store/useCryptoStore';
import clsx from 'clsx';

const TradeHistory: React.FC = () => {
  const { trades } = useCryptoStore();
  
  // Function to format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-white mb-4">Trade History</h2>
      
      {trades.length === 0 ? (
        <div className="bg-background rounded-lg p-8 text-center border border-neutral-700">
          <Calendar className="h-12 w-12 text-neutral-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-white mb-1">No trades yet</h3>
          <p className="text-neutral-400">
            Your trading history will appear here once you make your first trade.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-neutral-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-400">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-neutral-400">Cryptocurrency</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-neutral-400">Amount</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-neutral-400">Price</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-neutral-400">Total</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-neutral-400">Exchange</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-neutral-400">Mode</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-neutral-400">Time</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="border-b border-neutral-700 hover:bg-background/50 transition-colors">
                  <td className="py-4 px-4">
                    <div className={clsx(
                      "inline-flex items-center px-2 py-1 rounded text-xs font-medium",
                      trade.type === 'buy'
                        ? "text-green-300 bg-green-900/20"
                        : "text-red-300 bg-red-900/20"
                    )}>
                      {trade.type === 'buy' ? (
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                      )}
                      {trade.type === 'buy' ? 'BUY' : 'SELL'}
                      {trade.isAuto && (
                        <span className="ml-1 px-1 py-0.5 bg-primary/20 text-primary-light rounded text-[10px]">AUTO</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-medium text-white">{trade.cryptoName}</p>
                  </td>
                  <td className="py-4 px-4 text-right font-mono">
                    {trade.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6
                    })}
                  </td>
                  <td className="py-4 px-4 text-right font-mono">
                    ${trade.price.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6
                    })}
                  </td>
                  <td className="py-4 px-4 text-right font-mono">
                    ${(trade.amount * trade.price).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="capitalize">{trade.exchange}</span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className={clsx(
                      "px-2 py-0.5 rounded text-xs",
                      trade.isSimulated
                        ? "bg-secondary/20 text-secondary-light"
                        : "bg-error/20 text-error-light"
                    )}>
                      {trade.isSimulated ? 'Paper' : 'Live'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right text-sm text-neutral-300">
                    {formatTime(trade.timestamp)}
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

export default TradeHistory;