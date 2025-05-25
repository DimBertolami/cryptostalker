import React, { useState } from 'react';
import useWallet from '../../hooks/useWallet';
import { Wallet, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const WalletConnection: React.FC = () => {
  const { 
    publicKey, 
    connected, 
    disconnect, 
    formattedAddress 
  } = useWallet();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleDisconnect = () => {
    disconnect();
    setIsDropdownOpen(false);
  };

  const openExplorer = () => {
    if (publicKey) {
      window.open(`https://explorer.solana.com/address/${publicKey.toString()}`, '_blank');
    }
  };

  if (!connected || !publicKey) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center px-3 py-2 rounded-md bg-background-lighter hover:bg-background-light border border-neutral-700 text-white"
      >
        <Wallet className="h-4 w-4 mr-2 text-primary" />
        <span className="font-medium">{formattedAddress}</span>
        {isDropdownOpen ? (
          <ChevronUp className="h-4 w-4 ml-2" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-2" />
        )}
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-background-lighter border border-neutral-700 z-10">
          <div className="py-1">
            <button
              onClick={openExplorer}
              className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-background-light"
            >
              <ExternalLink className="h-4 w-4 mr-2 text-neutral-400" />
              View on Explorer
            </button>
            <button
              onClick={handleDisconnect}
              className="flex items-center w-full px-4 py-2 text-sm text-white hover:bg-background-light"
            >
              <Wallet className="h-4 w-4 mr-2 text-neutral-400" />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletConnection;
