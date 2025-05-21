import React from 'react';
import useCryptoStore from '../store/useCryptoStore';
import { Cryptocurrency } from '../types';

const NewCryptosTable: React.FC = () => {
  const { newCryptos, loading } = useCryptoStore();
  
  // Helper function to get the price from either the direct property or the quote object
  const getPrice = (coin: Cryptocurrency) => {
    return coin.quote?.USD?.price || coin.current_price || 0;
  };
  
  // Helper function to get the 24h change from either the direct property or the quote object
  const get24hChange = (coin: Cryptocurrency) => {
    return coin.quote?.USD?.percent_change_24h || coin.price_change_percentage_24h || 0;
  };
  
  // Helper function to get the market cap from either the direct property or the quote object
  const getMarketCap = (coin: Cryptocurrency) => {
    return coin.quote?.USD?.market_cap || coin.market_cap || 0;
  };

  // Helper function to get the trading volume
  const getVolume = (coin: Cryptocurrency) => {
    return coin.quote?.USD?.volume_24h || coin.volume_24h || 0;
  };
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-white mb-4">Cryptocurrency List</h2>
      
      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Price (USD)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">24h %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Market Cap</th>
              </tr>
            </thead>
            <tbody className="bg-gray-900 divide-y divide-gray-700">
              {newCryptos.map((coin, idx) => {
                const price = getPrice(coin);
                const change24h = get24hChange(coin);
                const marketCap = getMarketCap(coin);
                const volume = getVolume(coin);
                
                // For logging: check why this coin was selected as high value
                if (marketCap < 1000000 && volume > 500000) {
                  console.log(`High value coin ${coin.name} qualified due to volume: $${(volume/1000000).toFixed(2)}M volume`);
                }
                
                return (
                  <tr key={coin.id} className="hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                            <span className="text-white">{coin.symbol?.slice(0, 3) || '---'}</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{coin.name || 'Unknown'}</div>
                          <div className="text-sm text-gray-400">{coin.symbol || '---'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      change24h >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {change24h.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {marketCap > 0 ? 
                        `$${(marketCap / 1000000).toFixed(2)}M` : 
                        volume > 0 ? 
                          `Vol: $${(volume / 1000000).toFixed(2)}M` : 
                          'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default NewCryptosTable;