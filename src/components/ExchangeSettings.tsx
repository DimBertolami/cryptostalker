import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import useExchangeStore from '../store/useExchangeStore';
import clsx from 'clsx';

const ExchangeSettings: React.FC = () => {
  const { exchanges, setApiKeys } = useExchangeStore();
  
  const [activeExchange, setActiveExchange] = useState<'bitvavo' | 'binance' | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  
  const handleSave = () => {
    if (activeExchange) {
      setApiKeys(activeExchange, apiKey, apiSecret);
      setActiveExchange(null);
      setApiKey('');
      setApiSecret('');
    }
  };
  
  return (
    <div className="p-4">
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Exchange Settings</h2>
        <div className="ml-4 px-2 py-1 bg-background rounded-full border border-neutral-700">
          <span className="text-xs text-neutral-400">Configure Your APIs</span>
        </div>
      </div>
      
      <div className="bg-background border border-neutral-700 rounded-lg overflow-hidden mb-6">
        <div className="p-4 border-b border-neutral-700">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Shield className="h-5 w-5 text-primary mr-2" />
              <p className="text-sm text-white">Your API keys are stored securely in your browser's local storage and are never sent to our servers.</p>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <p className="text-sm text-neutral-400 mb-4">Connect your exchange APIs to enable live trading. If no exchange is connected, the system will operate in paper trading mode only.</p>
          
          {/* Bitvavo */}
          <div className="mb-4 border border-neutral-700 rounded-lg overflow-hidden">
            <div 
              className="flex justify-between items-center p-4 cursor-pointer hover:bg-background-lighter transition-colors"
              onClick={() => setActiveExchange(activeExchange === 'bitvavo' ? null : 'bitvavo')}
            >
              <div className="flex items-center">
                <div className={clsx(
                  "w-2 h-2 rounded-full mr-2",
                  exchanges.bitvavo.connected ? "bg-success" : "bg-neutral-500"
                )}></div>
                <h3 className="font-medium text-white">Bitvavo</h3>
                {exchanges.bitvavo.connected && (
                  <span className="ml-2 px-2 py-0.5 bg-success/20 text-success-light text-xs rounded-full">Connected</span>
                )}
              </div>
              {activeExchange === 'bitvavo' ? (
                <ChevronUp className="h-5 w-5 text-neutral-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-neutral-400" />
              )}
            </div>
            
            {activeExchange === 'bitvavo' && (
              <div className="p-4 bg-background-lighter border-t border-neutral-700 animate-slide-down">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="bitvavo-api-key" className="block text-sm text-neutral-400 mb-1">API Key</label>
                    <input
                      id="bitvavo-api-key"
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your Bitvavo API key"
                      className="w-full px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="bitvavo-api-secret" className="block text-sm text-neutral-400 mb-1">API Secret</label>
                    <input
                      id="bitvavo-api-secret"
                      type="password"
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      placeholder="Enter your Bitvavo API secret"
                      className="w-full px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setActiveExchange(null)}
                      className="px-4 py-2 border border-neutral-600 rounded-md text-white hover:bg-neutral-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!apiKey || !apiSecret}
                      className={clsx(
                        "px-4 py-2 rounded-md font-medium transition-colors",
                        apiKey && apiSecret
                          ? "bg-primary hover:bg-primary-dark text-white"
                          : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                      )}
                    >
                      Connect
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Binance */}
          <div className="border border-neutral-700 rounded-lg overflow-hidden">
            <div 
              className="flex justify-between items-center p-4 cursor-pointer hover:bg-background-lighter transition-colors"
              onClick={() => setActiveExchange(activeExchange === 'binance' ? null : 'binance')}
            >
              <div className="flex items-center">
                <div className={clsx(
                  "w-2 h-2 rounded-full mr-2",
                  exchanges.binance.connected ? "bg-success" : "bg-neutral-500"
                )}></div>
                <h3 className="font-medium text-white">Binance</h3>
                {exchanges.binance.connected && (
                  <span className="ml-2 px-2 py-0.5 bg-success/20 text-success-light text-xs rounded-full">Connected</span>
                )}
              </div>
              {activeExchange === 'binance' ? (
                <ChevronUp className="h-5 w-5 text-neutral-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-neutral-400" />
              )}
            </div>
            
            {activeExchange === 'binance' && (
              <div className="p-4 bg-background-lighter border-t border-neutral-700 animate-slide-down">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label htmlFor="binance-api-key" className="block text-sm text-neutral-400 mb-1">API Key</label>
                    <input
                      id="binance-api-key"
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your Binance API key"
                      className="w-full px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="binance-api-secret" className="block text-sm text-neutral-400 mb-1">API Secret</label>
                    <input
                      id="binance-api-secret"
                      type="password"
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      placeholder="Enter your Binance API secret"
                      className="w-full px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setActiveExchange(null)}
                      className="px-4 py-2 border border-neutral-600 rounded-md text-white hover:bg-neutral-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={!apiKey || !apiSecret}
                      className={clsx(
                        "px-4 py-2 rounded-md font-medium transition-colors",
                        apiKey && apiSecret
                          ? "bg-primary hover:bg-primary-dark text-white"
                          : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                      )}
                    >
                      Connect
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-background border border-neutral-700 rounded-lg p-4">
        <h3 className="font-medium text-white mb-2">Trading Permissions</h3>
        <p className="text-sm text-neutral-400 mb-4">Make sure your API keys have the appropriate permissions enabled:</p>
        
        <div className="space-y-2">
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <Check className="h-4 w-4 text-success" />
            </div>
            <p className="ml-2 text-sm text-neutral-300">Read account information and balances</p>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <Check className="h-4 w-4 text-success" />
            </div>
            <p className="ml-2 text-sm text-neutral-300">Spot trading (place and cancel orders)</p>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 mt-0.5">
              <X className="h-4 w-4 text-error" />
            </div>
            <p className="ml-2 text-sm text-neutral-300">Do NOT enable withdrawals for security reasons</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExchangeSettings;