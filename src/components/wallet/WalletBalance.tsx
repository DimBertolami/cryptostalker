import React, { useEffect, useState, useMemo } from 'react';
import { useUnifiedWallet } from '@jup-ag/wallet-adapter';
import { Connection, clusterApiUrl } from '@solana/web3.js';
import { Coins } from 'lucide-react';

const WalletBalance: React.FC = () => {
  const { publicKey, connected } = useUnifiedWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Create a stable connection to Solana
  const connection = useMemo(() => new Connection(clusterApiUrl('mainnet-beta'), 'confirmed'), []);

  useEffect(() => {
    const fetchBalance = async () => {
      if (publicKey && connected) {
        try {
          setLoading(true);
          const lamports = await connection.getBalance(publicKey);
          // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
          const solBalance = lamports / 1_000_000_000;
          setBalance(solBalance);
        } catch (error) {
          console.error('Error fetching balance:', error);
          setBalance(null);
        } finally {
          setLoading(false);
        }
      } else {
        setBalance(null);
      }
    };

    fetchBalance();
    
    // Set up interval to refresh balance every 30 seconds
    const intervalId = setInterval(fetchBalance, 30000);
    
    return () => clearInterval(intervalId);
  }, [publicKey, connected]);

  if (!connected || !publicKey) {
    return null;
  }

  return (
    <div className="flex items-center px-3 py-2 rounded-md bg-background-lighter border border-neutral-700">
      <Coins className="h-4 w-4 mr-2 text-primary" />
      {loading ? (
        <span className="text-sm font-medium text-neutral-400">Loading...</span>
      ) : balance !== null ? (
        <span className="text-sm font-medium text-white">
          {balance.toFixed(4)} SOL
        </span>
      ) : (
        <span className="text-sm font-medium text-neutral-400">Error loading balance</span>
      )}
    </div>
  );
};

export default WalletBalance;
