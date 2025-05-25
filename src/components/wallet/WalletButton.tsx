import React from 'react';
import { UnifiedWalletButton, useUnifiedWallet } from '@jup-ag/wallet-adapter';
import { Wallet } from 'lucide-react';

const WalletButton: React.FC = () => {
  const { publicKey, disconnect, connecting } = useUnifiedWallet();

  // Custom styling to match your application's design
  const customStyles = {
    button: 'flex items-center px-4 py-2 rounded-md bg-primary hover:bg-primary-dark text-white font-medium transition-colors',
    connectedButton: 'flex items-center px-4 py-2 rounded-md bg-background-lighter hover:bg-background-light text-white font-medium transition-colors border border-neutral-700',
  };

  // If connected, show a different button with the wallet address
  if (publicKey) {
    const walletAddress = publicKey.toString();
    const shortAddress = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;

    return (
      <button 
        className={customStyles.connectedButton}
        onClick={() => disconnect()}
      >
        <Wallet className="mr-2 h-4 w-4" />
        {shortAddress}
      </button>
    );
  }

  // If not connected, show the default wallet button
  return (
    <div className="wallet-button-container">
      <UnifiedWalletButton 
        buttonClassName={customStyles.button}
        overrideContent={
          connecting ? (
            <div className="flex items-center">
              <Wallet className="mr-2 h-4 w-4" />
              <span>Connecting...</span>
            </div>
          ) : (
            <div className="flex items-center">
              <Wallet className="mr-2 h-4 w-4" />
              <span>Connect Wallet</span>
            </div>
          )
        }
      />
    </div>
  );
};

export default WalletButton;
