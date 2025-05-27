import React, { useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, Connection } from '@solana/web3.js';
import './JupiterTerminal.css';

// Using any types for Jupiter Terminal callbacks to avoid type mismatches
// The actual types are complex and may change between versions

const JupiterTerminal: React.FC = () => {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const connection = new Connection(clusterApiUrl('devnet'));
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [jupiterInitialized, setJupiterInitialized] = useState(false);

  // Initialize Jupiter Terminal when the component mounts
  useEffect(() => {
    const initJupiterTerminal = async () => {
      if (!containerRef.current || !publicKey || !signTransaction || !signAllTransactions || jupiterInitialized) {
        return;
      }

      // Ensure the DOM element exists before initializing Jupiter Terminal
      const container = document.getElementById('jupiter-terminal-container');
      if (!container) {
        console.error('Jupiter Terminal container element not found');
        return;
      }
      try {
        // Dynamically import Jupiter Terminal
        const terminal = await import('@jup-ag/terminal');
        
        // Pass the actual DOM element, not a string
        await terminal.init({
          displayMode: "integrated",
          element: container,
          connection: connection, 
          cluster: "devnet",
          publicKey: publicKey,
          signAllTransactions: signAllTransactions,
          signTransaction: signTransaction,
          onSuccess: (payload: any) => {
            console.log('Transaction successful:', payload.txid);
            console.log('Swap result:', payload.swapResult);
          },
          onError: (error: Error) => {
            console.error('Transaction failed:', error);
          },
        } as any);

        setJupiterInitialized(true);
        setLoading(false);
      } catch (error) {
        console.error('Error initializing Jupiter Terminal:', error);
        setLoading(false);
      }
    };

    initJupiterTerminal();

    // Cleanup function
    return () => {
      // Clean up Jupiter Terminal if needed
      if (jupiterInitialized) {
        import('@jup-ag/terminal').then((terminal) => {
          terminal.close();
        }).catch(console.error);
      }
    };
  }, [publicKey, signTransaction, signAllTransactions, connection, jupiterInitialized]);

  return (
    <div className="jupiter-terminal-container">
      <div className="jupiter-terminal-header">
        <h2>Jupiter Swap</h2>
        <div className="wallet-button-container">
          <WalletMultiButton />
        </div>
      </div>
      
      {!publicKey ? (
        <div className="connect-wallet-message">
          <p>Connect your wallet to use Jupiter Terminal</p>
          <WalletMultiButton />
        </div>
      ) : loading ? (
        <div className="jupiter-loading">Loading Jupiter Terminal...</div>
      ) : (
        <div id="jupiter-terminal-container" ref={containerRef} className="jupiter-terminal"></div>
      )}
    </div>
  );
};

export default JupiterTerminal;