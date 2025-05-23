import React, { useState, useEffect, useMemo } from 'react';
import useCryptoStore from '../store/useCryptoStore';
import { Cryptocurrency } from '../types';
import toast from 'react-hot-toast';
import fetchCryptos from '../store/useCryptoStore';
const NewCryptosTable: React.FC = () => {
  const { newCryptos, loading, isAutoTrading, buyManual } = useCryptoStore();
  const [sortColumn, setSortColumn] = useState<string>('age');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [purchaseAmounts, setPurchaseAmounts] = useState<{ [key: string]: string }>({});
  const [ageFilter, setAgeFilter] = useState<string>('24h');
  const [showAllCoins, setShowAllCoins] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      await fetchCryptos(showAllCoins);
    };
    loadData();
  }, [showAllCoins, fetchCryptos]);
  
  // Update the name column header to toggle showAllCoins
  const handleNameHeaderClick = () => {
    setShowAllCoins(!showAllCoins);
    // Reset other filters when showing all coins
    setAgeFilter('all');
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleAmountChange = (id: string, value: string) => {
    setPurchaseAmounts(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleBuy = async (coin: Cryptocurrency) => {
    const amount = parseFloat(purchaseAmounts[coin.id] || '1');
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
  
    try {
      // Pass the coin object as the first parameter and amount as the second
      await buyManual(coin, amount, 'bitvavo'); // or 'binance' depending on your default
      toast.success(`Successfully bought ${amount} ${coin.symbol}`);
      // Clear the input after successful purchase
      setPurchaseAmounts(prev => {
        const newAmounts = { ...prev };
        delete newAmounts[coin.id];
        return newAmounts;
      });
    } catch (error) {
      console.error('Error buying coin:', error);
      toast.error(`Failed to buy ${coin.symbol}`);
    }
  };

  const getPrice = (coin: Cryptocurrency) => {
    return coin.quote?.USD?.price || 0;
  };

  const get24hChange = (coin: Cryptocurrency) => {
    return coin.quote?.USD?.percent_change_24h || 0;
  };

  const getMarketCap = (coin: Cryptocurrency) => {
    return coin.quote?.USD?.market_cap || 0;
  };

  const getVolume = (coin: Cryptocurrency) => {
    return coin.quote?.USD?.volume_24h || 0;
  };

  const getAgeInHours = (dateAdded: string) => {
    const addedDate = new Date(dateAdded);
    const now = new Date();
    return (now.getTime() - addedDate.getTime()) / (1000 * 60 * 60);
  };

  // Filter and sort logic
  const filteredCryptos = useMemo(() => {
    if (!newCryptos) return [];
  
    return newCryptos.filter(coin => {
      if (showAllCoins) return true; // Show all coins when showAllCoins is true
      
      const ageHours = getAgeInHours(coin.date_added);
      
      // Apply age filter
      switch(ageFilter) {
        case '24h': return ageHours < 24;
        case '48h': return ageHours < 48;
        case '7d': return ageHours < 168;  // 7 days in hours
        case '30d': return ageHours < 720; // 30 days in hours
        default: return true;
      }
    });
  }, [newCryptos, ageFilter, showAllCoins]);

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="bg-gray-900 text-white p-4 rounded-lg shadow">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Name
              </th>
              <th 
                className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('price')}
              >
                Price (USD) {sortColumn === 'price' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th 
                className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('change24h')}
              >
                24h % {sortColumn === 'change24h' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th 
                className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('marketCap')}
              >
                Market Cap {sortColumn === 'marketCap' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th 
                className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('volume')}
              >
                Volume (24h) {sortColumn === 'volume' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th 
                className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider"
              >
                <div className="flex items-center">
                  <span 
                    className="cursor-pointer"
                    onClick={() => handleSort('age')}
                  >
                    Age {sortColumn === 'age' ? (sortDirection === 'asc' ? '▲' : '▼') : ''}
                  </span>
                  <select
                    className="ml-2 bg-gray-700 text-white text-xs border-0 rounded focus:ring-0"
                    value={ageFilter}
                    onChange={(e) => {
                      setAgeFilter(e.target.value);
                      setShowAllCoins(false); // Reset showAllCoins when changing age filter
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="all">All</option>
                    <option value="24h">{"< 24h"}</option>
                    <option value="48h">{"< 48h"}</option>
                    <option value="7d">{"< 7d"}</option>
                    <option value="30d">{"< 30d"}</option>
                  </select>
                </div>
              </th>
              {!isAutoTrading && (
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Action
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-gray-900 divide-y divide-gray-700">
            {filteredCryptos.map((coin) => {
              const price = getPrice(coin);
              const change24h = get24hChange(coin);
              const marketCap = getMarketCap(coin);
              const volume = getVolume(coin);
              const ageHours = getAgeInHours(coin.date_added);

              return (
                <tr key={coin.id} className="hover:bg-gray-800">
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{coin.name}</div>
                        <div className="text-sm text-gray-400">{coin.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</div>
                  </td>
                  <td className={`px-3 py-4 whitespace-nowrap text-sm ${change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-white">
                    ${(marketCap / 1000000).toFixed(2)}M
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-white">
                    ${(volume / 1000).toFixed(1)}K
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-white">
                    {ageHours.toFixed(1)}h
                  </td>
                  {!isAutoTrading && (
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          className="w-20 px-2 py-1 text-sm bg-gray-700 border border-gray-600 rounded text-white"
                          min="0.1"
                          step="0.1"
                          value={purchaseAmounts[coin.id] || ''}
                          onChange={(e) => handleAmountChange(coin.id, e.target.value)}
                          placeholder="Amount"
                        />
                        <button
                          onClick={() => handleBuy(coin)}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded"
                        >
                          Buy
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NewCryptosTable;