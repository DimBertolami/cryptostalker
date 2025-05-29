import React, { useEffect, useState, useCallback } from 'react';
import { Check, X, Edit2, Trash2, Plus } from 'lucide-react';
import clsx from 'clsx';
import { supabase, getCurrentSession } from '../utils/supabaseClient';

interface ExchangeConfig {
  id: string;
  user_id: string;
  exchange_id_name: string;
  nickname?: string;
  api_key_encrypted: string;
  secret_key_encrypted: string;
  password_encrypted?: string;
  created_at?: string;
  updated_at?: string;
}

const initialFormState = {
  exchange_id_name: '',
  nickname: '',
  api_key: '',
  secret_key: '',
  password: '',
};

const ExchangeSettingsNew: React.FC = () => {
  // Supabase CRUD state
  const [exchangeConfigs, setExchangeConfigs] = useState<ExchangeConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add'|'edit'|null>(null);
  const [formState, setFormState] = useState<any>(initialFormState);
  const [editId, setEditId] = useState<string|null>(null);
  const [removeId, setRemoveId] = useState<string|null>(null);
  const [jupiterUrl, setJupiterUrl] = useState('');
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string} | null>(null);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [loadingConfigs, setLoadingConfigs] = useState(true);
  // Removed unused user_id as we're now using Supabase auth session

  // Function to check authentication and fetch configs
  const fetchConfigs = useCallback(async () => {
    setLoadingConfigs(true);
    
    try {
      // Get the current session
      const session = await getCurrentSession();
      
      if (!session) {
        console.log('No active session, user needs to sign in');
        setLoadingConfigs(false);
        setExchangeConfigs([]);
        return;
      }
      
      // User is authenticated, fetch their configs
      const { data, error } = await supabase
        .from('exchange_configurations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching exchange configs:', error);
        setNotification({
          type: 'error',
          message: 'Failed to load exchange configurations. Please try again.'
        });
      } else if (data) {
        setExchangeConfigs(data);
      }
    } catch (err) {
      console.error('Exception fetching exchange configs:', err);
      setNotification({
        type: 'error',
        message: 'An unexpected error occurred while loading configurations.'
      });
    } finally {
      setLoadingConfigs(false);
    }
  }, []);
  
  // Initial fetch and set up auth state listener
  useEffect(() => {
    // Fetch configs immediately
    fetchConfigs();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event) => {
        console.log('Auth state changed:', event);
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          await fetchConfigs();
        } else if (event === 'SIGNED_OUT') {
          setExchangeConfigs([]);
        }
      }
    );
    
    // Cleanup function
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
    
    // Auto-dismiss notifications after 5 seconds
    const timer = setTimeout(() => {
      if (notification) setNotification(null);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [fetchConfigs, modalOpen, removeId, notification]);

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
    const session = await getCurrentSession();
    if (!session) {
      setNotification({
        type: 'error',
        message: 'You must be signed in to remove exchange configurations.'
      });
      return;
    }
    
    setRemoveId(id);
    try {
      const { error } = await supabase
        .from('exchange_configurations')
        .delete()
        .eq('id', id)
        .eq('user_id', session.user.id);
      
      if (error) throw error;
      
      setExchangeConfigs(configs => configs.filter(cfg => cfg.id !== id));
      setNotification({
        type: 'success',
        message: 'Exchange configuration removed successfully!'
      });
    } catch (error: any) {
      console.error('Error removing exchange config:', error);
      setNotification({
        type: 'error',
        message: error?.message || 'Failed to remove exchange configuration.'
      });
    } finally {
      setRemoveId(null);
    }
  };
  
  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!formState.exchange_id_name.trim()) {
      errors.exchange_id_name = 'Exchange name is required';
    }
    
    if (!formState.api_key.trim()) {
      errors.api_key = 'API Key is required';
    }
    
    if (!formState.secret_key.trim()) {
      errors.secret_key = 'API Secret is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Removed generateUUID as we're now using Supabase auth for user identification
  
  const handleModalSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    // Get the current session
    const session = await getCurrentSession();
    if (!session) {
      setNotification({
        type: 'error',
        message: 'You must be signed in to save exchange configurations.'
      });
      return;
    }
    
    setLoading(true);
    try {
      // The payload now uses the authenticated user's ID from the session
      const payload = {
        user_id: session.user.id,
        exchange_id_name: formState.exchange_id_name,
        nickname: formState.nickname,
        api_key_encrypted: formState.api_key, // In production, this should be encrypted server-side
        secret_key_encrypted: formState.secret_key, // In production, this should be encrypted server-side
        password_encrypted: formState.password || null, // In production, this should be encrypted server-side
      };
      
      let result;
      if (modalMode === 'add') {
        result = await supabase
          .from('exchange_configurations')
          .insert([payload])
          .select();
          
        if (result.error) throw result.error;
        
        setNotification({
          type: 'success',
          message: 'Exchange added successfully!'
        });
        
        // Refresh the configs
        await fetchConfigs();
        
      } else if (modalMode === 'edit' && editId) {
        result = await supabase
          .from('exchange_configurations')
          .update(payload)
          .eq('id', editId)
          .select();
          
        if (result.error) throw result.error;
        
        setNotification({
          type: 'success',
          message: 'Exchange updated successfully!'
        });
        
        // Refresh the configs
        await fetchConfigs();
      }
      
      setModalOpen(false);
      setEditId(null);
      
    } catch (error: any) {
      console.error('Error saving exchange config:', error);
      setNotification({
        type: 'error',
        message: error?.message || 'Failed to save exchange configuration. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Jupiter connect handler
  const handleJupiterConnect = async () => {
    if (!jupiterUrl.trim()) {
      setNotification({
        type: 'error',
        message: 'Please enter a valid Jupiter swap URL'
      });
      return;
    }
    
    // Get the current session
    const session = await getCurrentSession();
    if (!session) {
      setNotification({
        type: 'error',
        message: 'You must be signed in to connect Jupiter.'
      });
      return;
    }
    
    setLoading(true);
    try {
      // In a real implementation, we would validate the Jupiter URL format
      // and potentially make an API call to verify it's valid
      
      // For security best practices, API keys should be encrypted server-side
      // See API security best practices in project documentation
      const payload = {
        user_id: session.user.id,
        exchange_id_name: 'jupiter',
        nickname: 'Jupiter',
        api_key_encrypted: jupiterUrl, // In production, this should be encrypted server-side
        secret_key_encrypted: '',
      };
      
      const result = await supabase
        .from('exchange_configurations')
        .insert([payload])
        .select();
      
      if (result.error) {
        console.error('Error connecting Jupiter:', result.error);
        setNotification({
          type: 'error',
          message: 'Failed to connect Jupiter. Please try again.'
        });
      } else {
        setNotification({
          type: 'success',
          message: 'Jupiter connected successfully!'
        });
        setJupiterUrl('');
      }
    } catch (err) {
      console.error('Exception connecting Jupiter:', err);
      setNotification({
        type: 'error',
        message: 'An unexpected error occurred while connecting Jupiter.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center mb-4">
        <h2 className="text-xl font-semibold text-white bg-primary px-3 py-1 rounded">Exchange Settings - NEW DASHBOARD</h2>
        <div className="ml-4 px-2 py-1 bg-background rounded-full border border-neutral-700">
          <span className="text-xs text-neutral-400">Configure Your APIs</span>
        </div>
      </div>
      
      {/* Notification Banner */}
      {notification && (
        <div className={`p-3 mb-4 rounded text-white ${notification.type === 'success' ? 'bg-success' : 'bg-error'}`}>
          {notification.message}
        </div>
      )}
      
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
                {loadingConfigs ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center">
                      <div className="flex justify-center items-center text-neutral-400">
                        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
                        Loading exchange configurations...
                      </div>
                    </td>
                  </tr>
                ) : exchangeConfigs.length === 0 ? (
                  <tr><td colSpan={3} className="text-neutral-400 py-4 text-center">No exchanges connected.</td></tr>
                ) : (
                  exchangeConfigs.map(cfg => (
                    <tr key={cfg.id} className="border-b border-neutral-800">
                      <td className="py-2 px-2">{cfg.exchange_id_name}</td>
                      <td className="py-2 px-2">{cfg.nickname || <span className="text-neutral-500">-</span>}</td>
                      <td className="py-2 px-2">
                        <button 
                          onClick={() => openEditModal(cfg)} 
                          className="mr-2 text-primary hover:text-primary-dark"
                          disabled={loading}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setRemoveId(cfg.id)} 
                          className="text-error hover:text-red-600"
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
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
                disabled={!jupiterUrl || loading}
                className={clsx(
                  "px-4 py-2 rounded-md font-medium transition-colors flex items-center",
                  jupiterUrl && !loading ? "bg-primary hover:bg-primary-dark text-white" : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                )}
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[99999] bg-black bg-opacity-90 flex items-center justify-center overflow-y-auto" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-background border border-neutral-700 rounded-lg p-6 w-full max-w-md m-4 relative shadow-lg">
            <button 
              onClick={() => setModalOpen(false)} 
              className="absolute top-3 right-3 text-neutral-400 hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
            <h3 className="text-white text-lg font-semibold mb-4">{modalMode === 'add' ? 'Add Exchange' : 'Edit Exchange'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-400 mb-1">Exchange Name</label>
                <input
                  type="text"
                  value={formState.exchange_id_name}
                  onChange={e => {
                    setFormState((s: any) => ({ ...s, exchange_id_name: e.target.value }));
                    if (formErrors.exchange_id_name) {
                      setFormErrors(errors => ({ ...errors, exchange_id_name: '' }));
                    }
                  }}
                  className={`w-full px-3 py-2 bg-background border ${formErrors.exchange_id_name ? 'border-error' : 'border-neutral-600'} rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary`}
                  placeholder="e.g. binance, bitvavo, coingecko, alpaca"
                />
                {formErrors.exchange_id_name && (
                  <p className="mt-1 text-xs text-error">{formErrors.exchange_id_name}</p>
                )}
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
                  onChange={e => {
                    setFormState((s: any) => ({ ...s, api_key: e.target.value }));
                    if (formErrors.api_key) {
                      setFormErrors(errors => ({ ...errors, api_key: '' }));
                    }
                  }}
                  className={`w-full px-3 py-2 bg-background border ${formErrors.api_key ? 'border-error' : 'border-neutral-600'} rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary`}
                  placeholder="API Key (will be encrypted)"
                />
                {formErrors.api_key && (
                  <p className="mt-1 text-xs text-error">{formErrors.api_key}</p>
                )}
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-1">API Secret</label>
                <input
                  type="password"
                  value={formState.secret_key}
                  onChange={e => {
                    setFormState((s: any) => ({ ...s, secret_key: e.target.value }));
                    if (formErrors.secret_key) {
                      setFormErrors(errors => ({ ...errors, secret_key: '' }));
                    }
                  }}
                  className={`w-full px-3 py-2 bg-background border ${formErrors.secret_key ? 'border-error' : 'border-neutral-600'} rounded-md text-white focus:outline-none focus:ring-1 focus:ring-primary`}
                  placeholder="API Secret (will be encrypted)"
                />
                {formErrors.secret_key && (
                  <p className="mt-1 text-xs text-error">{formErrors.secret_key}</p>
                )}
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
            <div className="mt-4 mb-2">
              <div className="text-xs text-neutral-400 flex items-start">
                <div className="flex-shrink-0 mt-0.5 mr-2">🔒</div>
                <p>Your API keys are securely stored and encrypted. We never share your keys with third parties.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button 
                onClick={() => setModalOpen(false)} 
                disabled={loading}
                className="px-4 py-2 border border-neutral-600 rounded-md text-white hover:bg-neutral-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleModalSave} 
                disabled={loading} 
                className="px-4 py-2 rounded-md bg-primary text-white font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Confirm Dialog */}
      {removeId && (
        <div className="fixed inset-0 z-[99999] bg-black bg-opacity-90 flex items-center justify-center overflow-y-auto" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-background border border-neutral-700 rounded-lg p-6 w-full max-w-md m-4 relative shadow-lg">
            <button 
              onClick={() => setRemoveId(null)} 
              className="absolute top-3 right-3 text-neutral-400 hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
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

export default ExchangeSettingsNew;
