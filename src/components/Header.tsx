import React from 'react';
import { Coins, Moon, Sun, BarChart2 } from 'lucide-react';
import useAppStore from '../store/useAppStore';

const Header: React.FC = () => {
  const { darkMode, toggleDarkMode } = useAppStore();

  return (
    <header className="bg-background-lighter border-b border-neutral-700 py-4 px-6">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Coins className="text-primary h-8 w-8" />
          <div>
            <h1 className="text-2xl font-bold text-white">Cryptobot Nightstalker</h1>
            <p className="text-xs text-neutral-400">Automated Trading Guru</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center justify-center rounded-md bg-background p-2 hover:bg-neutral-700 transition-colors cursor-pointer">
            <BarChart2 className="h-5 w-5 text-neutral-300" />
          </div>
          
          <button 
            onClick={toggleDarkMode} 
            className="flex items-center justify-center rounded-md bg-background p-2 hover:bg-neutral-700 transition-colors"
          >
            {darkMode ? (
              <Sun className="h-5 w-5 text-neutral-300" />
            ) : (
              <Moon className="h-5 w-5 text-neutral-300" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;