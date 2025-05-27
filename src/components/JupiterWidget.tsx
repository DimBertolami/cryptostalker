import React, { useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import '@jup-ag/terminal/css';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Loader2 } from 'lucide-react';
import './JupiterWidget.css';

const JupiterWidget: React.FC = () => {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const jupiterContainerRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);
  const loadingRef = useRef(true);

  useEffect(() => {
    // Skip if already initialized or if wallet is not connected
    if (isInitializedRef.current || !publicKey || !signTransaction || !signAllTransactions) {
      return;
    }

    // Define an async function to load and initialize Jupiter Terminal
    const loadJupiterTerminal = async () => {
      try {
        // Make sure the container exists
        if (!jupiterContainerRef.current) return;

        // Import Jupiter Terminal dynamically
        const jupiterModule = await import('@jup-ag/terminal');
        
        // Set flags before initialization to prevent re-entry
        isInitializedRef.current = true;

        // Configure and initialize Jupiter Terminal
        // Using any to bypass TypeScript strict checking since the Jupiter API may have changed
        const config: any = {
          endpoint: 'https://api.devnet.solana.com',
          // Make sure this ID matches the div ID in the render method
          integratedTargetId: 'jupiter-terminal-target',
          platformFeeAndAccounts: undefined,
          defaultExplorer: 'Solscan',
          displayMode: 'integrated',
          formProps: {
            fixedInputMint: false,
            fixedOutputMint: false,
            swapMode: 'ExactIn',
            defaultInputMint: 'SOL',
            defaultOutputMint: 'USDC',
          },
          containerStyles: {
            borderRadius: '10px',
            border: '1px solid #333',
          },
          walletProviderInfo: {
            publicKey: publicKey,
            signTransaction: signTransaction,
            signAllTransactions: signAllTransactions,
          },
        };

        // Initialize Jupiter Terminal
        await jupiterModule.init(config);
        loadingRef.current = false;

        // Force a re-render to reflect the loading state
        // Using a small state update to trigger re-render
        const element = document.getElementById('jupiter-loading-indicator');
        if (element) {
          element.style.display = 'none';
        }
      } catch (error) {
        console.error('Error initializing Jupiter Terminal:', error);
        loadingRef.current = false;
        isInitializedRef.current = false;
      }
    };

    // Load Jupiter Terminal
    loadJupiterTerminal();

    // Cleanup function
    return () => {
      if (isInitializedRef.current) {
        // Try to clean up Jupiter Terminal if needed
        import('@jup-ag/terminal').then(jupiterModule => {
          try {
            jupiterModule.close();
          } catch (e) {
            console.error('Error closing Jupiter Terminal:', e);
          }
        }).catch(console.error);
      }
    };
  }, [publicKey, signTransaction, signAllTransactions]);

  return (
    <div className="jupiter-widget-container">
      {!publicKey ? (
        <div className="wallet-connect-prompt">
          <h2>Connect your wallet to use Jupiter Swap</h2>
          <p>Jupiter aggregates multiple DEXs to provide the best swap rates on Solana</p>
          <div className="wallet-button-wrapper">
            <WalletMultiButton />
          </div>
        </div>
      ) : (
        <div className="jupiter-terminal-wrapper">
          <div id="jupiter-loading-indicator" className="jupiter-loading">
            <Loader2 className="animate-spin h-6 w-6 mr-2" />
            <span>Loading Jupiter Terminal...</span>
          </div>
          <div id="jupiter-terminal-target" ref={jupiterContainerRef} />
        </div>
      )}
    </div>
  );
};

export default JupiterWidget;