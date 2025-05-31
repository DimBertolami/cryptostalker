import React from 'react';
import useCryptoStore from '../store/useCryptoStore';
import useExchangeStore from '../store/useExchangeStore';

const FetchSettings: React.FC = () => {
  const { fetchSource, setFetchSource, fetchCryptos, setShowAllCryptos } = useCryptoStore();
  const { exchanges } = useExchangeStore();

  // Get active exchanges
  const activeExchanges = Object.entries(exchanges)
    .filter(([_, config]) => config.connected)
    .map(([name, _]) => name);

  const handleSourceChange = (source: string) => {
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
        
        {/* Public API Sources */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-neutral-400 mb-2">Public APIs:</h3>
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
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="fetchSource"
                value="alpaca"
                checked={fetchSource === 'alpaca'}
                onChange={() => handleSourceChange('alpaca')}
                className="form-radio text-primary"
              />
              <span className="text-white">Alpaca</span>
            </label>
          </div>
        </div>
        
        {/* Connected Exchanges */}
        {activeExchanges.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-neutral-400 mb-2">Connected Exchanges:</h3>
            <div className="flex flex-wrap gap-4">
              {activeExchanges.map((exchange) => (
                <label key={exchange} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="fetchSource"
                    value={`exchange:${exchange}`}
                    checked={fetchSource === `exchange:${exchange}`}
                    onChange={() => handleSourceChange(`exchange:${exchange}`)}
                    className="form-radio text-primary"
                  />
                  <span className="text-white capitalize">{exchange}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FetchSettings;
