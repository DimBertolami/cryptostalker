import React, { useState, useEffect } from 'react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { JupiterReferralManager } from '../utils/jupiterReferral';
import './JupiterReferralManager.css';

// Common token mints that might be used for fees
const COMMON_TOKEN_MINTS = {
  SOL: new PublicKey("So11111111111111111111111111111111111111112"),
  USDC: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  USDT: new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"),
  // Add more common tokens as needed
};

const JupiterReferralManagerComponent: React.FC = () => {
  const { publicKey } = useWallet();
  const [referralManager, setReferralManager] = useState<JupiterReferralManager | null>(null);
  
  const [referralName, setReferralName] = useState<string>('');
  const [referralAccountPubKey, setReferralAccountPubKey] = useState<string>('');
  const [privateKey, setPrivateKey] = useState<string>('');
  const [privateKeyVisible, setPrivateKeyVisible] = useState<boolean>(false);
  const [network, setNetwork] = useState<'mainnet' | 'devnet'>('mainnet');
  
  const [tokenAccounts, setTokenAccounts] = useState<Array<{ mint: string, tokenAccount: string }>>([]);
  const [selectedMint, setSelectedMint] = useState<string>(COMMON_TOKEN_MINTS.SOL.toBase58());
  const [customMint, setCustomMint] = useState<string>('');
  const [isCustomMint, setIsCustomMint] = useState<boolean>(false);
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize referral manager
  useEffect(() => {
    const conn = new Connection(
      network === 'mainnet' 
        ? clusterApiUrl('mainnet-beta') 
        : clusterApiUrl('devnet')
    );
    
    const manager = new JupiterReferralManager(conn);
    setReferralManager(manager);
  }, [network]);

  // Set up referral account if provided
  useEffect(() => {
    if (referralManager && referralAccountPubKey) {
      try {
        referralManager.setReferralAccount(referralAccountPubKey);
        setSuccess("Referral account set successfully");
        setTimeout(() => setSuccess(null), 3000);
      } catch (error) {
        setError("Invalid referral account public key");
        setTimeout(() => setError(null), 3000);
      }
    }
  }, [referralManager, referralAccountPubKey]);

  // Set private key if provided
  const handleSetPrivateKey = () => {
    if (!referralManager || !privateKey) return;
    
    try {
      referralManager.setWalletFromPrivateKey(privateKey);
      setSuccess("Private key set successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError("Invalid private key format");
      setTimeout(() => setError(null), 3000);
    }
  };

  // Initialize referral account
  const handleInitializeReferralAccount = async () => {
    if (!referralManager || !referralName) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await referralManager.initializeReferralAccount(referralName);
      setReferralAccountPubKey(result.referralAccountPubKey);
      setSuccess(`Referral account created: ${result.referralAccountPubKey}`);
    } catch (error: any) {
      setError(`Error creating referral account: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Initialize referral token account
  const handleInitializeTokenAccount = async () => {
    if (!referralManager) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const mint = new PublicKey(isCustomMint ? customMint : selectedMint);
      const result = await referralManager.initializeReferralTokenAccount(mint);
      
      setTokenAccounts(prev => [
        ...prev.filter(account => account.mint !== mint.toBase58()),
        { mint: mint.toBase58(), tokenAccount: result.tokenAccountPubKey }
      ]);
      
      setSuccess(`Token account created: ${result.tokenAccountPubKey}`);
    } catch (error: any) {
      setError(`Error creating token account: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Initialize common token accounts
  const handleInitializeCommonTokenAccounts = async () => {
    if (!referralManager) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const results = await referralManager.initializeCommonReferralTokenAccounts();
      
      const newTokenAccounts = results.map(result => ({
        mint: result.mint,
        tokenAccount: result.result.tokenAccountPubKey
      }));
      
      setTokenAccounts(prev => {
        const existingMints = new Set(prev.map(account => account.mint));
        const uniqueNewAccounts = newTokenAccounts.filter(account => !existingMints.has(account.mint));
        return [...prev, ...uniqueNewAccounts];
      });
      
      setSuccess(`Initialized ${results.length} common token accounts`);
    } catch (error: any) {
      setError(`Error initializing common token accounts: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Claim all fees
  const handleClaimAllFees = async () => {
    if (!referralManager) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const signatures = await referralManager.claimAllFees();
      setSuccess(`Claimed fees in ${signatures.length} transactions`);
    } catch (error: any) {
      setError(`Error claiming fees: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getTokenName = (mint: string) => {
    for (const [name, pubkey] of Object.entries(COMMON_TOKEN_MINTS)) {
      if (pubkey.toBase58() === mint) {
        return name;
      }
    }
    return mint.slice(0, 4) + '...' + mint.slice(-4);
  };

  return (
    <div className="jupiter-referral-manager">
      <h2>Jupiter Referral Manager</h2>
      
      {!publicKey ? (
        <div className="connect-wallet-section">
          <p>Connect your wallet to manage Jupiter referrals</p>
          <WalletMultiButton />
        </div>
      ) : (
        <>
          <div className="network-selector">
            <label>Network:</label>
            <div className="network-buttons">
              <button 
                className={network === 'mainnet' ? 'active' : ''} 
                onClick={() => setNetwork('mainnet')}
              >
                Mainnet
              </button>
              <button 
                className={network === 'devnet' ? 'active' : ''} 
                onClick={() => setNetwork('devnet')}
              >
                Devnet
              </button>
            </div>
          </div>

          <div className="referral-section">
            <h3>Referral Account</h3>
            
            <div className="input-group">
              <label>Referral Name:</label>
              <input 
                type="text" 
                value={referralName} 
                onChange={(e) => setReferralName(e.target.value)}
                placeholder="Enter a name for your referral account"
              />
            </div>
            
            <button 
              onClick={handleInitializeReferralAccount}
              disabled={loading || !referralName}
            >
              {loading ? 'Creating...' : 'Create Referral Account'}
            </button>
            
            <div className="input-group">
              <label>Referral Account Public Key:</label>
              <input 
                type="text" 
                value={referralAccountPubKey} 
                onChange={(e) => setReferralAccountPubKey(e.target.value)}
                placeholder="Enter your existing referral account public key"
              />
            </div>
            
            <div className="private-key-section">
              <div className="input-group">
                <label>Private Key (for signing transactions):</label>
                <div className="private-key-input">
                  <input 
                    type={privateKeyVisible ? "text" : "password"} 
                    value={privateKey} 
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="Enter your private key (kept locally, never sent to servers)"
                  />
                  <button 
                    className="toggle-visibility" 
                    onClick={() => setPrivateKeyVisible(!privateKeyVisible)}
                  >
                    {privateKeyVisible ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <button 
                onClick={handleSetPrivateKey}
                disabled={loading || !privateKey}
              >
                Set Private Key
              </button>
              <p className="warning">
                Warning: Your private key is only stored in memory and never sent to any server.
                However, it's generally safer to use a dedicated wallet for referral management.
              </p>
            </div>
          </div>

          <div className="token-accounts-section">
            <h3>Token Accounts</h3>
            
            <div className="token-selector">
              <div className="radio-group">
                <input 
                  type="radio" 
                  id="common-mint" 
                  checked={!isCustomMint} 
                  onChange={() => setIsCustomMint(false)} 
                />
                <label htmlFor="common-mint">Common Token</label>
                
                <select 
                  value={selectedMint} 
                  onChange={(e) => setSelectedMint(e.target.value)}
                  disabled={isCustomMint}
                >
                  {Object.entries(COMMON_TOKEN_MINTS).map(([name, pubkey]) => (
                    <option key={name} value={pubkey.toBase58()}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="radio-group">
                <input 
                  type="radio" 
                  id="custom-mint" 
                  checked={isCustomMint} 
                  onChange={() => setIsCustomMint(true)} 
                />
                <label htmlFor="custom-mint">Custom Token</label>
                
                <input 
                  type="text" 
                  value={customMint} 
                  onChange={(e) => setCustomMint(e.target.value)}
                  placeholder="Enter token mint address"
                  disabled={!isCustomMint}
                />
              </div>
            </div>
            
            <div className="token-actions">
              <button 
                onClick={handleInitializeTokenAccount}
                disabled={loading || !referralAccountPubKey || (!selectedMint && !customMint)}
              >
                {loading ? 'Creating...' : 'Create Token Account'}
              </button>
              
              <button 
                onClick={handleInitializeCommonTokenAccounts}
                disabled={loading || !referralAccountPubKey}
              >
                {loading ? 'Creating...' : 'Create All Common Token Accounts'}
              </button>
            </div>
            
            <div className="token-accounts-list">
              <h4>Your Token Accounts</h4>
              {tokenAccounts.length === 0 ? (
                <p>No token accounts created yet</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Token Account</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenAccounts.map((account) => (
                      <tr key={account.mint}>
                        <td>{getTokenName(account.mint)}</td>
                        <td>
                          <a 
                            href={`https://${network === 'devnet' ? 'explorer.solana.com' : 'solscan.io'}/account/${account.tokenAccount}?cluster=${network === 'devnet' ? 'devnet' : 'mainnet'}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {account.tokenAccount.slice(0, 6)}...{account.tokenAccount.slice(-6)}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="claim-fees-section">
            <h3>Claim Fees</h3>
            <button 
              onClick={handleClaimAllFees}
              disabled={loading || !referralAccountPubKey}
            >
              {loading ? 'Claiming...' : 'Claim All Fees'}
            </button>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
        </>
      )}
    </div>
  );
};

export default JupiterReferralManagerComponent;
