import React, { useState } from 'react';
import { Shield, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import useExchangeStore from '../store/useExchangeStore';
import clsx from 'clsx';

interface ExchangeConfig {
  name: string;
  apiKey: string;
  apiSecret: string;
  url?: string;
}

const ExchangeSettings: React.FC = () => {
  const { exchanges, setApiKeys } = useExchangeStore();
  
  const [activeExchange, setActiveExchange] = useState<'bitvavo' | 'binance' | 'jupiter' | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [formData, setFormData] = useState<ExchangeConfig>({
    name: '',
    apiKey: '',
    apiSecret: '',
    url: ''
  });
  
  const handleSave = () => {
    if (activeExchange) {
      setApiKeys(activeExchange, formData.apiKey, formData.apiSecret);
      setActiveExchange(null);
      setFormData({ name: '', apiKey: '', apiSecret: '', url: '' });
    }
  };

  const handleNewExchange = () => {
    setShowNewForm(true);
    setShowEditForm(false);
    setShowDeleteForm(false);
  };

  const handleEdit = () => {
    setShowEditForm(true);
    setShowNewForm(false);
    setShowDeleteForm(false);
  };

  const handleDelete = () => {
    setShowDeleteForm(true);
    setShowNewForm(false);
    setShowEditForm(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSave();
    setShowNewForm(false);
    setShowEditForm(false);
  };
  
  return (
    <div className="p-4">
      <div className="space-y-6">
        <div className="flex items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Exchange Settings</h2>
          <div className="ml-4 px-2 py-1 bg-background rounded-full border border-neutral-700">
            <div className="flex items-center gap-4">
              <span className="text-xs text-neutral-400">Configure Exchanges:</span>
              <div className="flex gap-2">
                <button onClick={handleNewExchange} className="px-2 py-1 text-xs rounded bg-green-500 hover:bg-green-600 text-white">New</button>
                <button onClick={handleEdit} className="px-2 py-1 text-xs rounded bg-blue-500 hover:bg-blue-600 text-white">Edit</button>
                <button onClick={handleDelete} className="px-2 py-1 text-xs rounded bg-red-500 hover:bg-red-600 text-white">Delete</button>
              </div>
            </div>
          </div>
        </div>

        {showNewForm && (
          <form onSubmit={handleFormSubmit} className="mb-4 p-4 bg-background rounded-lg border border-neutral-700">
            <h3 className="text-lg font-medium text-white mb-4">Add New Exchange</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">API Key</label>
                <input
                  type="text"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 rounded border border-neutral-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">API Secret</label>
                <input
                  type="password"
                  value={formData.apiSecret}
                  onChange={(e) => setFormData({...formData, apiSecret: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 rounded border border-neutral-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">URL (Optional)</label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({...formData, url: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 rounded border border-neutral-600 text-white"
                />
              </div>
              <div className="mt-2 flex items-center text-sm text-neutral-400">
                <Shield className="h-5 w-5 text-primary mr-2" />
                <p>Your API keys are stored securely in your browser's local storage and are never sent to our servers.</p>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewForm(false);
                    setFormData({ name: '', apiKey: '', apiSecret: '', url: '' });
                  }}
                  className="px-4 py-2 rounded-md text-white bg-neutral-700 hover:bg-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-white bg-primary hover:bg-primary-dark"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        )}

      {showNewForm && (
        <form onSubmit={handleFormSubmit} className="mb-4 p-4 bg-background rounded-lg border border-neutral-700">
          <h3 className="text-lg font-medium text-white mb-4">Add New Exchange</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">API Key</label>
              <input
                type="text"
                value={formData.apiKey}
                onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                className="w-full px-3 py-2 bg-neutral-800 rounded border border-neutral-600 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">API Secret</label>
              <input
                type="password"
                value={formData.apiSecret}
                onChange={(e) => setFormData({...formData, apiSecret: e.target.value})}
                className="w-full px-3 py-2 bg-neutral-800 rounded border border-neutral-600 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">URL (Optional)</label>
              <input
                type="text"
                value={formData.url}
                onChange={(e) => setFormData({...formData, url: e.target.value})}
                className="w-full px-3 py-2 bg-neutral-800 rounded border border-neutral-600 text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 rounded-md text-white bg-neutral-700 hover:bg-neutral-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md text-white bg-primary hover:bg-primary-dark"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      )}
      
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
                      value={formData.apiKey}
                      onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                      placeholder="Enter your Bitvavo API key"
                      className="w-full px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="bitvavo-api-secret" className="block text-sm text-neutral-400 mb-1">API Secret</label>
                    <input
                      id="bitvavo-api-secret"
                      type="password"
                      value={formData.apiSecret}
                      onChange={(e) => setFormData({...formData, apiSecret: e.target.value})}
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
                      disabled={!formData.apiKey || !formData.apiSecret}
                      className={clsx(
                        "px-4 py-2 rounded-md font-medium transition-colors",
                        formData.apiKey && formData.apiSecret
                          ? "bg-primary hover:bg-primary-dark text-white"
                          : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                      )}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
          </div>
          
          {/* Jupiter */}
          <div className="border border-neutral-700 rounded-lg overflow-hidden">
            <div 
              className="flex justify-between items-center p-4 cursor-pointer hover:bg-background-lighter transition-colors"
              onClick={() => setActiveExchange(activeExchange === 'jupiter' ? null : 'jupiter')}
            >
              <div className="flex items-center">
                <div className={clsx(
                  "w-2 h-2 rounded-full mr-2",
                  exchanges.jupiter.connected ? "bg-success" : "bg-neutral-500"
                )}></div>
                <h3 className="font-medium text-white">Jupiter</h3>
                {exchanges.jupiter.connected && (
                  <span className="ml-2 px-2 py-0.5 bg-success/20 text-success-light text-xs rounded-full">Connected</span>
                )}
              </div>
              {activeExchange === 'jupiter' ? (
                <ChevronUp className="h-5 w-5 text-neutral-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-neutral-400" />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {showEditForm && (
        <form onSubmit={handleFormSubmit} className="mb-4 p-4 bg-background rounded-lg border border-neutral-700">
          <h3 className="text-lg font-medium text-white mb-4">Edit Exchange</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Select Exchange</label>
              <select
                value={activeExchange || ''}
                onChange={(e) => setActiveExchange(e.target.value as any)}
                className="w-full px-3 py-2 bg-neutral-800 rounded border border-neutral-600 text-white"
              >
                <option value="">Select an exchange</option>
                <option value="jupiter">Jupiter</option>
                <option value="bitvavo">Bitvavo</option>
                <option value="binance">Binance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">API Key</label>
              <input
                type="text"
                value={formData.apiKey}
                onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                className="w-full px-3 py-2 bg-neutral-800 rounded border border-neutral-600 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">API Secret</label>
              <input
                type="password"
                value={formData.apiSecret}
                onChange={(e) => setFormData({...formData, apiSecret: e.target.value})}
                className="w-full px-3 py-2 bg-neutral-800 rounded border border-neutral-600 text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowEditForm(false)}
                className="px-4 py-2 rounded-md text-white bg-neutral-700 hover:bg-neutral-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-md text-white bg-primary hover:bg-primary-dark"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      )}

      {showDeleteForm && (
        <div className="mb-4 p-4 bg-background rounded-lg border border-neutral-700">
          <h3 className="text-lg font-medium text-white mb-4">Delete Exchange</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Select Exchange</label>
              <select
                value={activeExchange || ''}
                onChange={(e) => setActiveExchange(e.target.value as any)}
                className="w-full px-3 py-2 bg-neutral-800 rounded border border-neutral-600 text-white"
              >
                <option value="">Select an exchange</option>
                <option value="jupiter">Jupiter</option>
                <option value="bitvavo">Bitvavo</option>
                <option value="binance">Binance</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteForm(false)}
                className="px-4 py-2 rounded-md text-white bg-neutral-700 hover:bg-neutral-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeExchange) {
                    setApiKeys(activeExchange, '', '');
                    setActiveExchange(null);
                    setShowDeleteForm(false);
                  }
                }}
                className="px-4 py-2 rounded-md text-white bg-red-500 hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-background border border-neutral-700 rounded-lg overflow-hidden mb-6">
        <div className="p-4 border-b border-neutral-700">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">
                Jupiter
              </label>
              <button
                onClick={() => setActiveExchange('jupiter')}
                className={clsx(
                  "w-full px-4 py-2 rounded-md font-medium transition-colors",
                  activeExchange === 'jupiter'
                    ? "bg-primary text-white"
                    : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                )}
              >
                Configure
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">
                Bitvavo
              </label>
              <button
                onClick={() => setActiveExchange('bitvavo')}
                className={clsx(
                  "w-full px-4 py-2 rounded-md font-medium transition-colors",
                  activeExchange === 'bitvavo'
                    ? "bg-primary text-white"
                    : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                )}
              >
                Configure
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">
                Binance
              </label>
              <button
                onClick={() => setActiveExchange('binance')}
                className={clsx(
                  "w-full px-4 py-2 rounded-md font-medium transition-colors",
                  activeExchange === 'binance'
                    ? "bg-primary text-white"
                    : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                )}
              >
                Configure
              </button>
            </div>
          </div>
        </div>

        {activeExchange && (
          <div className="p-4 bg-background-lighter border-t border-neutral-700 animate-slide-down">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label htmlFor={`${activeExchange}-api-key`} className="block text-sm text-neutral-400 mb-1">API Key</label>
                <input
                  id={`${activeExchange}-api-key`}
                  type="text"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                  placeholder={`Enter your ${activeExchange?.charAt(0).toUpperCase()}${activeExchange?.slice(1) || ''} API key`}
                  className="w-full px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor={`${activeExchange}-api-secret`} className="block text-sm text-neutral-400 mb-1">API Secret</label>
                <input
                  id={`${activeExchange}-api-secret`}
                  type="password"
                  value={formData.apiSecret}
                  onChange={(e) => setFormData({...formData, apiSecret: e.target.value})}
                  placeholder={`Enter your ${activeExchange?.charAt(0).toUpperCase()}${activeExchange?.slice(1) || ''} API secret`}
                  className="w-full px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {activeExchange === 'jupiter' && (
                <div>
                  <label htmlFor="jupiter-url" className="block text-sm text-neutral-400 mb-1">Swap URL</label>
                  <input
                    id="jupiter-url"
                    type="text"
                    value={formData.url || 'https://jup.ag/swap/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v-So11111111111111111111111111111111111111112?inAmount='}
                    onChange={(e) => setFormData({...formData, url: e.target.value})}
                    className="w-full px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setActiveExchange(null);
                    setFormData({ name: '', apiKey: '', apiSecret: '', url: '' });
                  }}
                  className="px-4 py-2 border border-neutral-600 rounded-md text-white hover:bg-neutral-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formData.apiKey || !formData.apiSecret}
                  className={clsx(
                    "px-4 py-2 rounded-md font-medium transition-colors",
                    formData.apiKey && formData.apiSecret
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

        {showEditForm && (
          <form onSubmit={handleFormSubmit} className="mb-4 p-4 bg-background rounded-lg border border-neutral-700">
            <h3 className="text-lg font-medium text-white mb-4">Edit Exchange Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">API Key</label>
                <input
                  type="text"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({...formData, apiKey: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 rounded border border-neutral-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">API Secret</label>
                <input
                  type="password"
                  value={formData.apiSecret}
                  onChange={(e) => setFormData({...formData, apiSecret: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 rounded border border-neutral-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">URL (Optional)</label>
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData({...formData, url: e.target.value})}
                  className="w-full px-3 py-2 bg-neutral-800 rounded border border-neutral-600 text-white"
                />
              </div>
              <div className="mt-2 flex items-center text-sm text-neutral-400">
                <Shield className="h-5 w-5 text-primary mr-2" />
                <p>Your API keys are stored securely in your browser's local storage and are never sent to our servers.</p>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setFormData({ name: '', apiKey: '', apiSecret: '', url: '' });
                  }}
                  className="px-4 py-2 rounded-md text-white bg-neutral-700 hover:bg-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-white bg-primary hover:bg-primary-dark"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        )}

        {showDeleteForm && (
          <div className="mb-4 p-4 bg-background rounded-lg border border-neutral-700">
            <h3 className="text-lg font-medium text-white mb-4">Delete Exchange</h3>
            <p className="text-sm text-neutral-400 mb-4">Are you sure you want to delete this exchange configuration?</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteForm(false)}
                className="px-4 py-2 rounded-md text-white bg-neutral-700 hover:bg-neutral-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (activeExchange) {
                    setApiKeys(activeExchange, '', '');
                    setActiveExchange(null);
                    setShowDeleteForm(false);
                  }
                }}
                className="px-4 py-2 rounded-md text-white bg-red-500 hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExchangeSettings;