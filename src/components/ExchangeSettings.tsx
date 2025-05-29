import React, { useState, useEffect } from 'react';
import { Check, X, Edit2, Trash2, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import supabase from '../utils/supabase';

interface ExchangeConfig {
  id: string;
  user_id: string;
  exchange_id_name: string;
  nickname: string;
  api_key_encrypted: string;
  secret_key_encrypted: string;
  password_encrypted?: string;
  created_at?: string;
  updated_at?: string;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

const initialFormState = {
  exchange_id_name: '',
  nickname: '',
  api_key: '',
  secret_key: '',
  password: '',
};

const ExchangeSettings: React.FC = () => {
  // Supabase CRUD state
  const [exchangeConfigs, setExchangeConfigs] = useState<ExchangeConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add'|'edit'|null>(null);
  const [formState, setFormState] = useState<any>(initialFormState);
  const [editId, setEditId] = useState<string|null>(null);
  const [removeId, setRemoveId] = useState<string|null>(null);
  const [jupiterUrl, setJupiterUrl] = useState('');
  const [notification, setNotification] = useState<Notification | null>(null);
  const user_id = window.localStorage.getItem('user_id') || '';

  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Fetch configs
  useEffect(() => {
    const fetchConfigs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('exchange_configurations')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });
      if (!error && data) setExchangeConfigs(data);
      setLoading(false);
    };
    if(user_id) fetchConfigs();
  }, [user_id, modalOpen, removeId]);

  // Handlers
  const openAddModal = () => {
    setFormState(initialFormState);
    setModalMode('add');
    setModalOpen(true);
  };
  const openEditModal = (config: ExchangeConfig) => {
    setFormState({
      exchange_id_name: config.exchange_id_name,
      nickname: config.nickname || '',
      api_key: '',
      secret_key: '',
      password: '',
    });
    setEditId(config.id);
    setModalMode('edit');
    setModalOpen(true);
  };
  const handleRemove = async (id: string) => {
    setRemoveId(id);
    try {
      const result = await supabase.from('exchange_configurations').delete().eq('id', id);
      if (result.error) {
        console.error('Error removing exchange:', result.error);
        setNotification({ type: 'error', message: `Failed to remove exchange: ${result.error.message}` });
      } else {
        setExchangeConfigs(configs => configs.filter(cfg => cfg.id !== id));
        setNotification({ type: 'success', message: 'Exchange removed successfully' });
      }
    } catch (err: any) {
      console.error('Exception removing exchange:', err);
      setNotification({ type: 'error', message: `An error occurred: ${err.message || 'Unknown error'}` });
    } finally {
      setRemoveId(null);
    }
  };
  // Generate a UUID v4 for user_id if needed
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  
  const handleModalSave = async () => {
    // Form validation
    if (!formState.exchange_id_name) {
      setNotification({ type: 'error', message: 'Exchange name is required' });
      return;
    }
    
    if (!formState.api_key) {
      setNotification({ type: 'error', message: 'API key is required' });
      return;
    }
    
    if (!formState.secret_key) {
      setNotification({ type: 'error', message: 'API secret is required' });
      return;
    }
    
    // Check if we have a valid user_id, if not generate one
    let currentUserId = user_id;
    if (!currentUserId || currentUserId.trim() === '') {
      currentUserId = generateUUID();
      window.localStorage.setItem('user_id', currentUserId);
    }
    
    setLoading(true);
    try {
      // TODO: Encrypt api_key, secret_key, password via backend API
      const payload = {
        user_id: currentUserId,
        exchange_id_name: formState.exchange_id_name,
        nickname: formState.nickname,
        api_key_encrypted: formState.api_key, // Replace with encrypted
        secret_key_encrypted: formState.secret_key, // Replace with encrypted
        password_encrypted: formState.password, // Replace with encrypted
      };
      
      if (modalMode === 'add') {
        const result = await supabase.from('exchange_configurations').insert([payload]);
        if (result.error) {
          console.error('Error saving exchange config:', result.error);
          setNotification({ type: 'error', message: `Failed to add exchange: ${result.error.message}` });
        } else {
          setNotification({ type: 'success', message: 'Exchange added successfully' });
          setModalOpen(false);
          setEditId(null);
        }
      } else if (modalMode === 'edit' && editId) {
        const result = await supabase.from('exchange_configurations').update(payload).eq('id', editId);
        if (result.error) {
          console.error('Error updating exchange config:', result.error);
          setNotification({ type: 'error', message: `Failed to update exchange: ${result.error.message}` });
        } else {
          setNotification({ type: 'success', message: 'Exchange updated successfully' });
          setModalOpen(false);
          setEditId(null);
        }
      }
    } catch (err: any) {
      console.error('Exception saving exchange config:', err);
      setNotification({ type: 'error', message: `An error occurred: ${err.message || 'Unknown error'}` });
    } finally {
      setLoading(false);
    }
  };

  // Jupiter connect handler
  const handleJupiterConnect = async () => {
    // Validate Jupiter URL
    if (!jupiterUrl.trim()) {
      setNotification({ type: 'error', message: 'Please enter a valid Jupiter swap URL' });
      return;
    }
    
    // Check if we have a valid user_id, if not generate one
    let currentUserId = user_id;
    if (!currentUserId || currentUserId.trim() === '') {
      currentUserId = generateUUID();
      window.localStorage.setItem('user_id', currentUserId);
    }
    
    try {
      // Create payload for Jupiter connection
      // This follows the Jupiter Trigger API integration pattern
      const payload = {
        id: 'jupiter',
        user_id: currentUserId,
        exchange_id_name: 'jupiter',
        nickname: 'Jupiter',
        api_key_encrypted: jupiterUrl, // Store the Jupiter URL in the API key field
        secret_key_encrypted: '',
      };
      
      // Save to Supabase
      const result = await supabase.from('exchange_configurations').insert([payload]);
      if (result.error) {
        console.error('Error connecting Jupiter:', result.error);
        setNotification({ type: 'error', message: `Failed to connect Jupiter: ${result.error.message}` });
      } else {
        // Update local state if successful
        setExchangeConfigs(configs => [
          ...configs,
          payload,
        ]);
        setJupiterUrl('');
        setNotification({ type: 'success', message: 'Jupiter connected successfully' });
      }
    } catch (err: any) {
      console.error('Exception connecting Jupiter:', err);
      setNotification({ type: 'error', message: `An error occurred: ${err.message || 'Unknown error'}` });
    }
  };

  return (
    <div className="p-4">
      {/* Notification Banner */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-md shadow-lg flex items-center gap-3 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {notification.type === 'success' ? (
            <CheckCircle className="text-white" size={20} />
          ) : (
            <AlertCircle className="text-white" size={20} />
          )}
          <p className="text-white flex-1">{notification.message}</p>
          <button onClick={() => setNotification(null)} className="text-white hover:text-gray-200">
            <X size={18} />
          </button>
        </div>
      )}
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-semibold text-white bg-primary px-3 py-1 rounded">Exchange Settings - NEW DASHBOARD</h2>
        <div className="ml-4 px-2 py-1 bg-background rounded-full border border-neutral-700">
          <span className="text-xs text-neutral-400">Configure Your APIs</span>
        </div>
      </div>
      <div className="bg-error p-2 mb-4 rounded text-white text-center font-bold">
        NEW DASHBOARD UI - COMPLETELY REFACTORED
      </div>
      
      <div className="flex gap-6 mb-6">
        {/* Trading Permissions */}
        <div className="bg-background border border-neutral-700 rounded-lg p-4 flex-shrink-0" style={{width: 'fit-content', minWidth: 320}}>
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

        {/* Exchange Dashboard */}
        <div className="flex-1 bg-background border border-neutral-700 rounded-lg p-4">
          <div className="flex items-center mb-4">
            <div className="text-white font-medium mr-4">Connected Exchanges</div>
            <button onClick={openAddModal} className="ml-auto flex items-center px-3 py-1 bg-primary text-white rounded hover:bg-primary-dark transition-colors">
              <Plus className="w-4 h-4 mr-1" /> Add
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-white">
              <thead>
                <tr className="border-b border-neutral-700">
                  <th className="py-2 px-2 text-left">Exchange</th>
                  <th className="py-2 px-2 text-left">Nickname</th>
                  <th className="py-2 px-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {exchangeConfigs.length === 0 && (
                  <tr><td colSpan={3} className="text-neutral-400 py-4 text-center">No exchanges connected.</td></tr>
                )}
                {exchangeConfigs.map(cfg => (
                  <tr key={cfg.id} className="border-b border-neutral-800">
                    <td className="py-2 px-2">{cfg.exchange_id_name}</td>
                    <td className="py-2 px-2">{cfg.nickname || <span className="text-neutral-500">-</span>}</td>
                    <td className="py-2 px-2">
                      <button onClick={() => openEditModal(cfg)} className="mr-2 text-primary hover:text-primary-dark">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setRemoveId(cfg.id)} className="text-error hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Jupiter Connect */}
          <div className="mt-6">
            <div className="text-white font-medium mb-2">Connect Jupiter</div>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={jupiterUrl}
                onChange={e => setJupiterUrl(e.target.value)}
                placeholder="Paste Jupiter swap URL here"
                className="flex-1 px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleJupiterConnect}
                disabled={!jupiterUrl}
                className={clsx(
                  "px-4 py-2 rounded-md font-medium transition-colors",
                  jupiterUrl ? "bg-primary hover:bg-primary-dark text-white" : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                )}
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center">
          <div className="bg-background border border-neutral-700 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-white text-lg font-semibold mb-4">{modalMode === 'add' ? 'Add Exchange' : 'Edit Exchange'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Exchange Name</label>
                <input
                  type="text"
                  value={formState.exchange_id_name}
                  onChange={e => setFormState((s: any) => ({ ...s, exchange_id_name: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="e.g. binance, bitvavo, coingecko, alpaca, jupiter"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Nickname (optional)</label>
                <input
                  type="text"
                  value={formState.nickname}
                  onChange={e => setFormState((s: any) => ({ ...s, nickname: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Give this connection a nickname"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">API Key</label>
                <input
                  type="text"
                  value={formState.api_key}
                  onChange={e => setFormState((s: any) => ({ ...s, api_key: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="API Key (will be encrypted)"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">API Secret</label>
                <input
                  type="password"
                  value={formState.secret_key}
                  onChange={e => setFormState((s: any) => ({ ...s, secret_key: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="API Secret (will be encrypted)"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Password (optional)</label>
                <input
                  type="password"
                  value={formState.password}
                  onChange={e => setFormState((s: any) => ({ ...s, password: e.target.value }))}
                  className="w-full px-3 py-2 bg-background border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Password (will be encrypted)"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 border border-neutral-600 rounded-md text-white hover:bg-neutral-700 transition-colors">
                Cancel
              </button>
              <button onClick={handleModalSave} disabled={loading} className="px-4 py-2 rounded-md bg-primary text-white font-medium hover:bg-primary-dark transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Confirm Dialog */}
      {removeId && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-60 flex items-center justify-center">
          <div className="bg-background border border-neutral-700 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-white text-lg font-semibold mb-4">Remove Exchange</h3>
            <p className="mb-6 text-neutral-300">Are you sure you want to remove this exchange configuration?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setRemoveId(null)} className="px-4 py-2 border border-neutral-600 rounded-md text-white hover:bg-neutral-700 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleRemove(removeId)} className="px-4 py-2 rounded-md bg-error text-white font-medium hover:bg-red-700 transition-colors">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExchangeSettings;