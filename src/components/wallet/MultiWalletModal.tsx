import React, { useState, useEffect } from 'react';
import { WalletName } from '@solana/wallet-adapter-base';
import { ConnectedWallet, useMultiWallet } from './MultiWalletProvider';
import './MultiWalletModal.css';

interface MultiWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MultiWalletModal: React.FC<MultiWalletModalProps> = ({ isOpen, onClose }) => {
  const { 
    walletAdapters, 
    connectedWallets, 
    connectWallet, 
    disconnectWallet, 
    isPrimaryWallet,
    setPrimaryWallet
  } = useMultiWallet();
  
  const [availableWallets, setAvailableWallets] = useState<any[]>([]);
  const [disconnectWarning, setDisconnectWarning] = useState<string | null>(null);

  // Get all available wallets
  useEffect(() => {
    console.log('Modal - Available wallets:', walletAdapters);
    setAvailableWallets(walletAdapters);
  }, [walletAdapters]);

  // Handle wallet connection
  const handleWalletSelect = async (walletName: WalletName) => {
    console.log(`Selecting wallet: ${walletName}`);
    
    // Check if wallet is already connected
    const isConnected = connectedWallets.some(
      wallet => wallet.adapter.name === walletName
    );
    
    if (isConnected) {
      console.log(`Wallet ${walletName} is already connected`);
      // Set it as primary if clicked again
      setPrimaryWallet(walletName);
    } else {
      // Before connecting, check if another wallet of this type is connected
      const alreadyConnectedOfType = connectedWallets.find(
        wallet => wallet.adapter.name === walletName
      );
      await connectWallet(walletName);
      // After connect, if a disconnect happened, show warning
      if (alreadyConnectedOfType) {
        setDisconnectWarning(`Only one ${walletName} wallet can be connected at a time due to wallet extension limitations. Your previous ${walletName} wallet was disconnected.`);
      }
    }
  };

  // Dismiss warning
  const dismissWarning = () => setDisconnectWarning(null);

  // Handle wallet disconnection
  const handleWalletDisconnect = async (walletName: WalletName) => {
    await disconnectWallet(walletName);
  };
  
  // Handle setting a wallet as primary
  const handleSetPrimary = (walletName: WalletName) => {
    setPrimaryWallet(walletName);
  };

  if (!isOpen) return null;

  return (
    <div className="wallet-modal-overlay" onClick={onClose}>
      <div className="wallet-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="wallet-modal-header">
          <h2>Connect Wallets</h2>
          <p className="wallet-modal-subtitle">You can connect multiple wallets simultaneously</p>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        {disconnectWarning && (
          <div className="wallet-warning-banner" style={{background:'#fffbe6',color:'#ad8b00',padding:'10px',margin:'10px 0',border:'1px solid #ffe58f',borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span>{disconnectWarning}</span>
            <button style={{marginLeft:'15px'}} onClick={dismissWarning}>Dismiss</button>
          </div>
        )}
        <div className="wallet-modal-body">
          {connectedWallets.length > 0 && (
            <div className="connected-wallets-section">
              <h3>Connected Wallets</h3>
              <ul className="connected-wallets-list">
                {connectedWallets.map((wallet) => (
                  <li 
                    key={wallet.adapter.name} 
                    className={isPrimaryWallet(wallet.adapter.name) ? 'primary-wallet' : ''}
                  >
                    {wallet.adapter.icon && (
                      <img 
                        src={wallet.adapter.icon} 
                        alt={`${wallet.adapter.name} icon`} 
                        width="24" 
                        height="24" 
                      />
                    )}
                    <span className="wallet-name">{wallet.adapter.name}</span>
                    <span className="wallet-address">
                      {wallet.publicKey?.toString().slice(0, 4)}...{wallet.publicKey?.toString().slice(-4)}
                    </span>
                    <div className="wallet-actions">
                      {!isPrimaryWallet(wallet.adapter.name) && (
                        <button 
                          className="set-primary-button"
                          onClick={() => handleSetPrimary(wallet.adapter.name)}
                        >
                          Set Primary
                        </button>
                      )}
                      <button 
                        className="disconnect-button"
                        onClick={() => handleWalletDisconnect(wallet.adapter.name)}
                      >
                        Disconnect
                      </button>
                    </div>
                    {isPrimaryWallet(wallet.adapter.name) && (
                      <span className="primary-badge">Primary</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="available-wallets-section">
            <h3>Available Wallets</h3>
            <p className="wallet-instruction">
              Select a wallet to connect:
            </p>
            
            <ul className="wallet-list">
              {availableWallets.map((wallet) => {
                const isConnected = connectedWallets.some(
                  connectedWallet => connectedWallet.adapter.name === wallet.name
                );
                
                return (
                  <li 
                    key={wallet.name} 
                    onClick={() => !isConnected && handleWalletSelect(wallet.name as WalletName)}
                    className={`
                      ${isConnected ? 'wallet-connected' : 'wallet-available'} 
                      ${wallet.name.toLowerCase().includes('phantom') ? 'highlighted-wallet' : ''}
                    `}
                  >
                    {wallet.icon && (
                      <img 
                        src={wallet.icon} 
                        alt={`${wallet.name} icon`} 
                        width="32" 
                        height="32" 
                      />
                    )}
                    <span className="wallet-name">{wallet.name}</span>
                    {isConnected && (
                      <span className="connected-badge">Connected</span>
                    )}
                    {wallet.name.toLowerCase().includes('phantom') && !isConnected && (
                      <span className="recommended-badge">Recommended</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiWalletModal;
