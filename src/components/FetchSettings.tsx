import React from 'react';
import useCryptoStore, { CryptoStore, FetchSource } from '../store/useCryptoStore';

// Type guard to check if a string is a valid FetchSource
const isFetchSource = (source: string): source is FetchSource => {
  return ['coinmarketcap', 'coingecko', 'binance', 'bitvavo', 'jupiter'].includes(source);
};

const FetchSettings: React.FC = () => {
  const { 
    fetchSource, 
    setFetchSource, 
    fetchCryptos, 
    setShowAllCryptos,
    connectedExchanges = [] 
  } = useCryptoStore(state => ({
    fetchSource: (state as CryptoStore).fetchSource,
    setFetchSource: (state as CryptoStore).setFetchSource,
    fetchCryptos: (state as CryptoStore).fetchCryptos,
    setShowAllCryptos: (state as CryptoStore).setShowAllCryptos,
    connectedExchanges: (state as CryptoStore).connectedExchanges || []
  }));

  const handleSourceChange = (source: string) => {
    if (isFetchSource(source)) {
      setFetchSource(source);
      setShowAllCryptos(true);
      fetchCryptos(true);
    }
  };

  // Define available sources
  const baseSources: { value: FetchSource; label: string }[] = [
    { value: 'coinmarketcap', label: 'CoinMarketCap' },
    { value: 'coingecko', label: 'CoinGecko' },
  ];

  // Add connected exchanges as available sources
  const exchangeSources = connectedExchanges
    .filter((exchange): exchange is FetchSource => 
      ['binance', 'bitvavo', 'jupiter'].includes(exchange.toLowerCase())
    )
    .map(exchange => ({
      value: exchange,
      label: exchange.charAt(0).toUpperCase() + exchange.slice(1).toLowerCase()
    }));

  const allSources = [...baseSources, ...exchangeSources];

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-white mb-4">Fetch Settings</h2>
      <div className="bg-background border border-neutral-700 rounded-lg p-4">
        <label className="block text-sm font-medium text-neutral-400 mb-2">
          Select source for new cryptocurrencies:
        </label>
        <div className="flex flex-wrap gap-4">
          {allSources.map(({ value, label }) => (
            <label key={value} className="flex items-center space-x-2">
              <input
                type="radio"
                name="fetchSource"
                value={value}
                checked={fetchSource === value}
                onChange={() => handleSourceChange(value)}
                className="form-radio text-primary"
              />
              <span className="text-white">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FetchSettings;
