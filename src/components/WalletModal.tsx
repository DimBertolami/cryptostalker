import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletName } from '@solana/wallet-adapter-base';
import './WalletModal.css';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
  const { wallets, select, connected, publicKey, disconnect, wallet } = useWallet();
  const [availableWallets, setAvailableWallets] = useState<any[]>([]);
  const [currentWalletName, setCurrentWalletName] = useState<string>('');

  useEffect(() => {
    console.log('Modal - Available wallets:', wallets);
    
    // Check if Phantom wallet is in the list
    const hasPhantom = wallets.some(wallet => 
      wallet.adapter.name.toLowerCase().includes('phantom')
    );
    
    console.log('Has Phantom wallet:', hasPhantom);
    
    // Create a copy of wallets for modification
    let walletsList = [...wallets];
    
    // If Phantom is missing, add a placeholder for it (this ensures UI display)
    if (!hasPhantom) {
      console.log('Adding Phantom wallet placeholder');
      walletsList.unshift({
        adapter: {
          name: 'Phantom',
          icon: 'https://www.phantom.app/img/logo.png',
          url: 'https://phantom.app/',
          readyState: 1
        }
      } as any);
    }
    
    // Sort wallets to ensure Phantom is at the top
    const sortedWallets = walletsList.sort((a, b) => {
      // Phantom first
      if (a.adapter.name.toLowerCase().includes('phantom')) return -1;
      if (b.adapter.name.toLowerCase().includes('phantom')) return 1;
      return 0;
    });
    
    console.log('Sorted wallets:', sortedWallets.map(w => w.adapter.name));
    setAvailableWallets(sortedWallets);
    
    // When connected, get the current wallet name
    if (connected && publicKey && wallet) {
      setCurrentWalletName(wallet.adapter.name);
    }
  }, [wallets, connected, publicKey, wallet]);

  const handleWalletSelect = (walletName: WalletName) => {
    console.log(`Selecting wallet: ${walletName}`);
    
    // If a wallet is already connected and it's different from the selected one,
    // disconnect first then connect to the new one
    if (connected && currentWalletName !== walletName) {
      disconnect();
    }
    
    select(walletName);
    onClose();
  };

  const handleDisconnect = () => {
    disconnect();
    setCurrentWalletName('');
  };

  if (!isOpen) return null;

  return (
    <div className="wallet-modal-overlay" onClick={onClose}>
      <div className="wallet-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="wallet-modal-header">
          <h2>Connect Wallet</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="wallet-modal-body">
          {connected && publicKey && (
            <div className="connected-info">
              <p>Connected to {currentWalletName}:</p>
              <p className="wallet-address">{publicKey.toString().slice(0, 10)}...{publicKey.toString().slice(-10)}</p>
              <button className="disconnect-button" onClick={handleDisconnect}>Disconnect</button>
            </div>
          )}
          
          <p className="wallet-instruction">
            {connected ? 'Switch to a different wallet:' : 'Select a wallet to connect:'}
          </p>
          
          <ul className="wallet-list">
            {availableWallets.map((wallet) => {
              // Add debug log to check available wallets
              console.log(`Available wallet: ${wallet.adapter.name}`);
              
              return (
                <li 
                  key={wallet.adapter.name} 
                  onClick={() => handleWalletSelect(wallet.adapter.name as WalletName)}
                  className={`${
                    wallet.adapter.name.toLowerCase().includes('backpack') ? 'highlighted-wallet' : ''
                  } ${
                    wallet.adapter.name === currentWalletName ? 'connected-wallet' : ''
                  }`}
                >
                  {wallet.adapter.icon && (
                    <img 
                      src={wallet.adapter.icon} 
                      alt={`${wallet.adapter.name} icon`} 
                      width="32" 
                      height="32" 
                    />
                  )}
                  <span className="wallet-name">{wallet.adapter.name}</span>
                  {wallet.adapter.name === currentWalletName && (
                    <span className="connected-badge">Connected</span>
                  )}
                  {wallet.adapter.name.toLowerCase().includes('backpack') && (
                    <span className="new-badge">New!</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WalletModal;