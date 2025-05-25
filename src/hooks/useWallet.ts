import { useUnifiedWallet } from '@jup-ag/wallet-adapter';
import { useCallback, useEffect, useState } from 'react';

export const useWallet = () => {
  const [error, setError] = useState<string | null>(null);
  
  // Safely access wallet functionality with error handling
  let walletData;
  try {
    walletData = useUnifiedWallet();
  } catch (err) {
    console.error('Error accessing wallet adapter:', err);
    // Provide fallback values if wallet adapter fails
    walletData = {
      publicKey: null,
      connecting: false,
      connected: false,
      disconnect: () => {},
      select: () => {},
      wallets: [],
      wallet: null
    };
  }
  
  const { 
    publicKey, 
    connecting, 
    connected, 
    disconnect, 
    select, 
    wallets, 
    wallet
  } = walletData;

  // Format wallet address for display
  const formattedAddress = publicKey ? 
    `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}` : 
    null;

  // Helper function to check if a specific wallet is connected
  const isWalletConnected = useCallback(() => {
    return connected && publicKey !== null;
  }, [connected, publicKey]);

  // Safe disconnect function with error handling
  const safeDisconnect = useCallback(async () => {
    try {
      setError(null);
      await disconnect();
    } catch (err) {
      console.error('Error disconnecting wallet:', err);
      setError('Failed to disconnect wallet. Please try again.');
    }
  }, [disconnect]);

  // Safe select function with error handling
  const safeSelect = useCallback(async (walletName: any) => {
    try {
      setError(null);
      await select(walletName);
    } catch (err) {
      console.error('Error selecting wallet:', err);
      setError('Failed to connect wallet. Please try again.');
    }
  }, [select]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return {
    publicKey,
    connecting,
    connected,
    disconnect: safeDisconnect,
    select: safeSelect,
    wallets,
    wallet,
    formattedAddress,
    isWalletConnected,
    error
  };
};

export default useWallet;
