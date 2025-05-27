import React, { useState } from 'react';
import { useWallet } from '@jup-ag/wallet-adapter';
import './Header.css';
import { Coins, Moon, Sun } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { WalletBalance } from './wallet';
import WalletModal from './WalletModal';

const Header: React.FC = () => {
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const { darkMode, toggleDarkMode } = useAppStore();
  const { connected, publicKey } = useWallet();

  const openWalletModal = () => setIsWalletModalOpen(true);
  const closeWalletModal = () => setIsWalletModalOpen(false);

  return (
    <header className="bg-background-lighter border-b border-neutral-700 py-4 px-6">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Coins className="text-primary" size={24} />
          <h1 className="text-xl font-bold">Cryptobot Nightstalker</h1>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full hover:bg-neutral-700 transition-colors"
            aria-label="Toggle dark mode"
          >
            <div className="relative w-5 h-5">
              <Sun
                size={20}
                className={`absolute transition-transform duration-300 ${darkMode ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`}
              />
              <Moon
                size={20}
                className={`absolute transition-transform duration-300 ${darkMode ? 'rotate-0 scale-100' : '-rotate-90 scale-0'}`}
              />
            </div>
          </button>
          <button 
            className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors"
            onClick={openWalletModal}
          >
            {connected && publicKey
              ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`
              : 'Connect Wallet'}
          </button>
          <WalletBalance />
          <WalletModal isOpen={isWalletModalOpen} onClose={closeWalletModal} />
        </div>
      </div>
    </header>
  );
};

export default Header;