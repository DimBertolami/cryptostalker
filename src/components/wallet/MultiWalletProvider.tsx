import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { 
  WalletAdapterNetwork, 
  WalletName,
  WalletReadyState 
} from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { GlowWalletAdapter } from '@solana/wallet-adapter-glow';
import { BraveWalletAdapter } from '@solana/wallet-adapter-brave';
import { TrustWalletAdapter } from '@solana/wallet-adapter-trust';
import { MathWalletAdapter } from '@solana/wallet-adapter-mathwallet';
import { ConnectionProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, Connection, PublicKey } from '@solana/web3.js';

// Define interface for a connected wallet
export interface ConnectedWallet {
  adapter: any;
  publicKey: PublicKey | null;
  connected: boolean;
}

// Create context for multiple wallets
interface MultiWalletContextState {
  walletAdapters: any[];
  connectedWallets: ConnectedWallet[];
  connectWallet: (walletName: WalletName) => Promise<void>;
  disconnectWallet: (walletName: WalletName) => Promise<void>;
  isPrimaryWallet: (walletName: WalletName) => boolean;
  setPrimaryWallet: (walletName: WalletName) => void;
  primaryWallet: ConnectedWallet | null;
}

const MultiWalletContext = createContext<MultiWalletContextState>({
  walletAdapters: [],
  connectedWallets: [],
  connectWallet: async () => {},
  disconnectWallet: async () => {},
  isPrimaryWallet: () => false,
  setPrimaryWallet: () => {},
  primaryWallet: null,
});

export const useMultiWallet = () => useContext(MultiWalletContext);

interface MultiWalletProviderProps {
  children: ReactNode;
}

export const MultiWalletProvider: React.FC<MultiWalletProviderProps> = ({ children }) => {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = clusterApiUrl(network);

  // Initialize wallet adapters
  const walletAdapters = useMemo(() => {
    return [
      new PhantomWalletAdapter({ network }),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
      new GlowWalletAdapter(),
      new BraveWalletAdapter(),
      new TrustWalletAdapter(),
      new MathWalletAdapter()
    ];
  }, [network]);

  // State for connected wallets
  const [connectedWallets, setConnectedWallets] = useState<ConnectedWallet[]>([]);
  const [primaryWalletIndex, setPrimaryWalletIndex] = useState<number>(-1);

  // Keep wallet state in sync with adapter events
  useEffect(() => {
    const listeners: Array<() => void> = [];
    walletAdapters.forEach((adapter) => {
      // Connect event
      const handleConnect = () => {
        setConnectedWallets((prev) => {
          // If already present, update publicKey/connected, else add
          const idx = prev.findIndex(w => w.adapter.name === adapter.name);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = {
              ...updated[idx],
              publicKey: adapter.publicKey,
              connected: adapter.connected,
            };
            return updated;
          } else {
            return [
              ...prev,
              {
                adapter,
                publicKey: adapter.publicKey,
                connected: adapter.connected,
              },
            ];
          }
        });
      };
      // Disconnect event
      const handleDisconnect = () => {
        setConnectedWallets((prev) => prev.filter(w => w.adapter.name !== adapter.name));
      };
      adapter.on && adapter.on('connect', handleConnect);
      adapter.on && adapter.on('disconnect', handleDisconnect);
      // Cleanup
      listeners.push(() => {
        adapter.off && adapter.off('connect', handleConnect);
        adapter.off && adapter.off('disconnect', handleDisconnect);
      });
    });
    return () => {
      listeners.forEach((off) => off());
    };
  }, [walletAdapters]);

  // Connect a wallet by name
  const connectWallet = useCallback(async (walletName: WalletName) => {
    const adapter = walletAdapters.find(adapter => adapter.name === walletName);
    if (!adapter) return;

    try {
      // Check if wallet is already connected
      const existingWalletIndex = connectedWallets.findIndex(
        wallet => wallet.adapter.name === walletName
      );
      
      if (existingWalletIndex >= 0) {
        console.log(`Wallet ${walletName} already connected`);
        return;
      }

      await adapter.connect();
      
      // Create the connected wallet entry
      const newWallet: ConnectedWallet = {
        adapter,
        publicKey: adapter.publicKey,
        connected: adapter.connected,
      };
      
      // Add to connected wallets
      setConnectedWallets(prev => [...prev, newWallet]);
      
      // If this is the first connected wallet, make it primary
      if (connectedWallets.length === 0) {
        setPrimaryWalletIndex(0);
      }
      
      console.log(`Connected to ${walletName} wallet`);
    } catch (error) {
      console.error(`Error connecting to ${walletName} wallet:`, error);
    }
  }, [walletAdapters, connectedWallets]);

  // Disconnect a wallet by name
  const disconnectWallet = useCallback(async (walletName: WalletName) => {
    const walletIndex = connectedWallets.findIndex(
      wallet => wallet.adapter.name === walletName
    );
    
    if (walletIndex < 0) return;

    try {
      const adapter = connectedWallets[walletIndex].adapter;
      await adapter.disconnect();
      
      // Remove from connected wallets
      setConnectedWallets(prev => prev.filter((_, i) => i !== walletIndex));
      
      // Adjust primary wallet if needed
      if (walletIndex === primaryWalletIndex) {
        setPrimaryWalletIndex(connectedWallets.length > 1 ? 0 : -1);
      } else if (walletIndex < primaryWalletIndex) {
        setPrimaryWalletIndex(prev => prev - 1);
      }
      
      console.log(`Disconnected from ${walletName} wallet`);
    } catch (error) {
      console.error(`Error disconnecting from ${walletName} wallet:`, error);
    }
  }, [connectedWallets, primaryWalletIndex]);

  // Check if a wallet is the primary wallet
  const isPrimaryWallet = useCallback((walletName: WalletName) => {
    if (primaryWalletIndex < 0 || primaryWalletIndex >= connectedWallets.length) return false;
    return connectedWallets[primaryWalletIndex].adapter.name === walletName;
  }, [connectedWallets, primaryWalletIndex]);

  // Set a wallet as the primary wallet
  const setPrimaryWallet = useCallback((walletName: WalletName) => {
    const walletIndex = connectedWallets.findIndex(
      wallet => wallet.adapter.name === walletName
    );
    
    if (walletIndex >= 0) {
      setPrimaryWalletIndex(walletIndex);
      console.log(`Set ${walletName} as primary wallet`);
    }
  }, [connectedWallets]);

  // Get the primary wallet
  const primaryWallet = useMemo(() => {
    if (primaryWalletIndex < 0 || primaryWalletIndex >= connectedWallets.length) return null;
    return connectedWallets[primaryWalletIndex];
  }, [connectedWallets, primaryWalletIndex]);

  // Value for the context
  const contextValue = useMemo(() => ({
    walletAdapters,
    connectedWallets,
    connectWallet,
    disconnectWallet,
    isPrimaryWallet,
    setPrimaryWallet,
    primaryWallet,
  }), [
    walletAdapters, 
    connectedWallets, 
    connectWallet, 
    disconnectWallet, 
    isPrimaryWallet, 
    setPrimaryWallet, 
    primaryWallet
  ]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <MultiWalletContext.Provider value={contextValue}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </MultiWalletContext.Provider>
    </ConnectionProvider>
  );
};

export default MultiWalletProvider;
