import React from 'react';
import useCryptoStore from '../store/useCryptoStore';

const FetchSettings: React.FC = () => {
  const { fetchSource, setFetchSource, fetchCryptos, setShowAllCryptos } = useCryptoStore();

  const handleSourceChange = (source: 'coinmarketcap' | 'coingecko') => {
    setFetchSource(source);
    setShowAllCryptos(true);
    fetchCryptos(true);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-white mb-4">Fetch Settings</h2>
      <div className="bg-background border border-neutral-700 rounded-lg p-4">
        <label className="block text-sm font-medium text-neutral-400 mb-2">
          Select source for new cryptocurrencies:
        </label>
        <div className="flex space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="fetchSource"
              value="coinmarketcap"
              checked={fetchSource === 'coinmarketcap'}
              onChange={() => handleSourceChange('coinmarketcap')}
              className="form-radio text-primary"
            />
            <span className="text-white">CoinMarketCap</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="fetchSource"
              value="coingecko"
              checked={fetchSource === 'coingecko'}
              onChange={() => handleSourceChange('coingecko')}
              className="form-radio text-primary"
            />
            <span className="text-white">CoinGecko</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default FetchSettings;
