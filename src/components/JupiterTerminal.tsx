import React, { useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl, Connection } from '@solana/web3.js';
import './JupiterTerminal.css';

// Using any types for Jupiter Terminal callbacks to avoid type mismatches
// The actual types are complex and may change between versions

// Local storage keys
const REFERRAL_ACCOUNT_KEY = 'jupiter_referral_account';
const REFERRAL_FEE_KEY = 'jupiter_referral_fee';

const JupiterTerminal: React.FC = () => {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const connection = new Connection(clusterApiUrl('devnet'));
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [jupiterInitialized, setJupiterInitialized] = useState(false);
  
  // Referral settings
  const [referralAccount, setReferralAccount] = useState<string>(
    localStorage.getItem(REFERRAL_ACCOUNT_KEY) || ''
  );
  const [referralFee, setReferralFee] = useState<number>(
    parseInt(localStorage.getItem(REFERRAL_FEE_KEY) || '50')
  );
  const [showReferralSettings, setShowReferralSettings] = useState<boolean>(false);

  // Save referral settings to local storage when they change
  useEffect(() => {
    if (referralAccount) {
      localStorage.setItem(REFERRAL_ACCOUNT_KEY, referralAccount);
    }
    localStorage.setItem(REFERRAL_FEE_KEY, referralFee.toString());
  }, [referralAccount, referralFee]);

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
        
        // Create terminal config
        const terminalConfig: any = {
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
        };
        
        // Add referral settings if available
        if (referralAccount) {
          terminalConfig.referralAccount = referralAccount;
          terminalConfig.referralFee = referralFee;
          console.log(`Using referral account: ${referralAccount} with fee: ${referralFee} bps`);
        }
        
        // Initialize terminal
        await terminal.init(terminalConfig);

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
  }, [publicKey, signTransaction, signAllTransactions, connection, jupiterInitialized, referralAccount, referralFee]);
  
  // Handle referral fee change
  const handleReferralFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 50 && value <= 255) {
      setReferralFee(value);
    }
  };

  return (
    <div className="jupiter-terminal-container">
      <div className="jupiter-terminal-header">
        <h2>Jupiter Swap</h2>
        <div className="header-actions">
          <button 
            className="referral-settings-button"
            onClick={() => setShowReferralSettings(!showReferralSettings)}
          >
            {showReferralSettings ? 'Hide Referral Settings' : 'Referral Settings'}
          </button>
          <div className="wallet-button-container">
            <WalletMultiButton />
          </div>
        </div>
      </div>
      
      {showReferralSettings && (
        <div className="referral-settings-panel">
          <h3>Jupiter Referral Settings</h3>
          <div className="referral-settings-form">
            <div className="input-group">
              <label>Referral Account:</label>
              <input 
                type="text" 
                value={referralAccount} 
                onChange={(e) => setReferralAccount(e.target.value)}
                placeholder="Enter your Jupiter referral account public key"
              />
            </div>
            <div className="input-group">
              <label>Referral Fee (50-255 bps):</label>
              <input 
                type="number" 
                min="50" 
                max="255" 
                value={referralFee} 
                onChange={handleReferralFeeChange}
              />
              <span className="fee-hint">{referralFee} basis points = {referralFee / 100}%</span>
            </div>
            <div className="referral-note">
              <p><strong>Note:</strong> You must create a referral account and token accounts before using this feature. 
              Visit the <a href="/jupiter-referral">Jupiter Referral Manager</a> to set up your accounts.</p>
              <p>Jupiter will take 20% of your referral fee. For example, if you set 100 bps (1%), Jupiter will take 20 bps (0.2%).</p>
            </div>
          </div>
        </div>
      )}
      
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