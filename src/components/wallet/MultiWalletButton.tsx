import React, { useCallback, useMemo, useState } from 'react';
import { useMultiWallet } from './MultiWalletProvider';
import MultiWalletModal from './MultiWalletModal';
import './MultiWalletButton.css';

const MultiWalletButton: React.FC = () => {
  const { connectedWallets, primaryWallet } = useMultiWallet();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Count of connected wallets
  const connectedCount = connectedWallets.length;
  
  // Handle button click
  const handleClick = useCallback(() => {
    setIsModalOpen(true);
  }, []);
  
  // Close modal
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);
  
  // Get button content based on connection state
  const buttonContent = useMemo(() => {
    if (connectedCount === 0) {
      return 'Connect Wallet';
    } else if (connectedCount === 1) {
      // Show the connected wallet's name and a portion of the public key
      const address = primaryWallet?.publicKey?.toString();
      return (
        <>
          <span className="wallet-name-text">{primaryWallet?.adapter.name}</span>
          <span className="wallet-address-text">
            {address ? `${address.slice(0, 4)}...${address.slice(-4)}` : ''}
          </span>
        </>
      );
    } else {
      // Show number of connected wallets
      return (
        <>
          <span className="wallet-count">{connectedCount} Wallets</span>
          <span className="wallet-name-text">{primaryWallet?.adapter.name}</span>
        </>
      );
    }
  }, [connectedCount, primaryWallet]);

  return (
    <>
      <button 
        className={`multi-wallet-button ${connectedCount > 0 ? 'connected' : ''}`}
        onClick={handleClick}
      >
        {buttonContent}
      </button>
      
      <MultiWalletModal isOpen={isModalOpen} onClose={handleCloseModal} />
    </>
  );
};

export default MultiWalletButton;
