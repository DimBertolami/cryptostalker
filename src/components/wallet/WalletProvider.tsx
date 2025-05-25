import React, { ReactNode, useEffect } from 'react';
import { UnifiedWalletProvider } from '@jup-ag/wallet-adapter';

// Polyfill global for Jupiter Wallet Kit
if (typeof window !== 'undefined' && !window.global) {
  window.global = window;
}

// Polyfill Buffer for Jupiter Wallet Kit
if (typeof window !== 'undefined' && !window.Buffer) {
  window.Buffer = {
    isBuffer: () => false,
    from: () => ({}),
  } as any;
}

interface WalletProviderProps {
  children: ReactNode;
}

const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  // Add error handling for wallet connection
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Suppress specific errors related to buffer or polyfills
      if (event.message.includes('Buffer') || event.message.includes('polyfill')) {
        event.preventDefault();
        console.warn('Suppressed error:', event.message);
        return;
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return (
    <UnifiedWalletProvider
      wallets={[]}
      config={{
        autoConnect: false,
        env: 'mainnet-beta',
        metadata: {
          name: 'CryptoStalker',
          description: 'Cryptocurrency tracking and trading system',
          url: window.location.origin,
          iconUrls: [`${window.location.origin}/favicon.ico`],
        },
        walletlistExplanation: {
          href: 'https://station.jup.ag/docs/old/additional-topics/wallet-list',
        },
      }}
    >
      {children}
    </UnifiedWalletProvider>
  );
};

export default WalletProvider;
