import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Terminal, ArrowRight, RefreshCw } from 'lucide-react';
import JupiterTerminal from './JupiterTerminal';
import JupiterTradeWidget from './JupiterTradeWidget';
import './JupiterWidget.css';

const JupiterWidget: React.FC = () => {
  const { connected } = useWallet();
  const [activeTab, setActiveTab] = useState<'terminal' | 'trade'>('terminal');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };


  return (
    <div className="jupiter-widget-container">
      {!connected ? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <Terminal className="w-12 h-12 text-primary mb-4" />
          <h2 className="text-xl font-semibold mb-2">Connect your wallet to trade</h2>
          <p className="text-neutral-400 mb-6">Connect your Solana wallet to start trading on Jupiter</p>
          <WalletMultiButton className="bg-primary hover:bg-primary-dark text-white font-medium py-2 px-6 rounded-lg" />
        </div>
      ) : (
        <div className="w-full">
          {/* Tabs */}
          <div className="flex border-b border-neutral-700 mb-6">
            <button
              className={`flex items-center py-3 px-6 font-medium ${activeTab === 'terminal' ? 'text-primary border-b-2 border-primary' : 'text-neutral-400 hover:text-white'}`}
              onClick={() => setActiveTab('terminal')}
            >
              <Terminal className="w-5 h-5 mr-2" />
              Terminal
            </button>
            <button
              className={`flex items-center py-3 px-6 font-medium ${activeTab === 'trade' ? 'text-primary border-b-2 border-primary' : 'text-neutral-400 hover:text-white'}`}
              onClick={() => setActiveTab('trade')}
            >
              <ArrowRight className="w-5 h-5 mr-2" />
              Trade
            </button>
            <div className="flex-1 flex justify-end">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 text-neutral-400 hover:text-white transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          
          {/* Tab Content */}
          <div className="mt-4">
            {activeTab === 'terminal' ? (
              <JupiterTerminal />
            ) : (
              <JupiterTradeWidget />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JupiterWidget;