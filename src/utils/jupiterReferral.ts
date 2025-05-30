import { ReferralProvider } from "@jup-ag/referral-sdk";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction, VersionedTransaction } from "@solana/web3.js";
import bs58 from 'bs58';

// Jupiter Ultra Referral Project public key
const JUPITER_ULTRA_PROJECT_PUBKEY = new PublicKey('DkiqsTrw1u1bYFumumC7sCG2S8K25qc2vemJFHyW2wJc');

// Common token mints that might be used for fees
const COMMON_TOKEN_MINTS = {
  SOL: new PublicKey("So11111111111111111111111111111111111111112"),
  USDC: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
  USDT: new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"),
  // Add more common tokens as needed
};

/**
 * Jupiter Referral Manager class for handling referral accounts and token accounts
 */
export class JupiterReferralManager {
  private provider: ReferralProvider;
  private connection: Connection;
  private wallet: Keypair | null = null;
  private referralAccountPubKey: PublicKey | null = null;
  
  constructor(connection: Connection) {
    this.connection = connection;
    this.provider = new ReferralProvider(connection);
  }

  /**
   * Set the wallet keypair from a private key
   * @param privateKeyBase58 Base58 encoded private key
   */
  setWalletFromPrivateKey(privateKeyBase58: string): void {
    try {
      const privateKey = bs58.decode(privateKeyBase58);
      this.wallet = Keypair.fromSecretKey(new Uint8Array(privateKey));
    } catch (error) {
      console.error("Error setting wallet from private key:", error);
      throw new Error("Invalid private key format");
    }
  }

  /**
   * Set the referral account public key
   * @param referralAccountPubKey Public key of the referral account
   */
  setReferralAccount(referralAccountPubKey: string): void {
    try {
      this.referralAccountPubKey = new PublicKey(referralAccountPubKey);
    } catch (error) {
      console.error("Error setting referral account:", error);
      throw new Error("Invalid referral account public key");
    }
  }

  /**
   * Initialize a referral account
   * @param name Name for the referral account
   * @returns Transaction signature and referral account public key
   */
  async initializeReferralAccount(name: string): Promise<{ signature: string, referralAccountPubKey: string }> {
    if (!this.wallet) {
      throw new Error("Wallet not set");
    }

    try {
      const transaction = await this.provider.initializeReferralAccountWithName({
        payerPubKey: this.wallet.publicKey,
        partnerPubKey: this.wallet.publicKey,
        projectPubKey: JUPITER_ULTRA_PROJECT_PUBKEY,
        name,
      });

      const referralAccount = await this.connection.getAccountInfo(
        transaction.referralAccountPubKey,
      );

      if (!referralAccount) {
        const signature = await sendAndConfirmTransaction(
          this.connection, 
          transaction.tx, 
          [this.wallet]
        );
        
        this.referralAccountPubKey = transaction.referralAccountPubKey;
        
        return {
          signature,
          referralAccountPubKey: transaction.referralAccountPubKey.toBase58()
        };
      } else {
        this.referralAccountPubKey = transaction.referralAccountPubKey;
        
        return {
          signature: "Account already exists",
          referralAccountPubKey: transaction.referralAccountPubKey.toBase58()
        };
      }
    } catch (error) {
      console.error("Error initializing referral account:", error);
      throw error;
    }
  }

  /**
   * Initialize a referral token account for a specific mint
   * @param mint Public key of the token mint
   * @returns Transaction signature and token account public key
   */
  async initializeReferralTokenAccount(mint: PublicKey): Promise<{ signature: string, tokenAccountPubKey: string }> {
    if (!this.wallet) {
      throw new Error("Wallet not set");
    }

    if (!this.referralAccountPubKey) {
      throw new Error("Referral account not set");
    }

    try {
      const transaction = await this.provider.initializeReferralTokenAccountV2({
        payerPubKey: this.wallet.publicKey,
        referralAccountPubKey: this.referralAccountPubKey,
        mint,
      });

      const referralTokenAccount = await this.connection.getAccountInfo(
        transaction.tokenAccount,
      );

      if (!referralTokenAccount) {
        const signature = await sendAndConfirmTransaction(
          this.connection, 
          transaction.tx, 
          [this.wallet]
        );
        
        return {
          signature,
          tokenAccountPubKey: transaction.tokenAccount.toBase58()
        };
      } else {
        return {
          signature: "Token account already exists",
          tokenAccountPubKey: transaction.tokenAccount.toBase58()
        };
      }
    } catch (error) {
      console.error(`Error initializing referral token account for mint ${mint.toBase58()}:`, error);
      throw error;
    }
  }

  /**
   * Initialize referral token accounts for common tokens
   * @returns Array of results for each token mint
   */
  async initializeCommonReferralTokenAccounts(): Promise<Array<{ mint: string, result: { signature: string, tokenAccountPubKey: string } }>> {
    const results = [];
    
    for (const [name, mint] of Object.entries(COMMON_TOKEN_MINTS)) {
      try {
        const result = await this.initializeReferralTokenAccount(mint);
        results.push({ mint: mint.toBase58(), result });
        console.log(`Created referral token account for ${name} (${mint.toBase58()}): ${result.tokenAccountPubKey}`);
      } catch (error) {
        console.error(`Failed to create referral token account for ${name} (${mint.toBase58()}):`, error);
        results.push({ 
          mint: mint.toBase58(), 
          result: { 
            signature: "Failed", 
            tokenAccountPubKey: "Error" 
          } 
        });
      }
    }
    
    return results;
  }

  /**
   * Claim all accumulated fees
   * @returns Array of transaction signatures
   */
  async claimAllFees(): Promise<string[]> {
    if (!this.wallet) {
      throw new Error("Wallet not set");
    }

    if (!this.referralAccountPubKey) {
      throw new Error("Referral account not set");
    }

    try {
      const transactions = await this.provider.claimAllV2({
        payerPubKey: this.wallet.publicKey,
        referralAccountPubKey: this.referralAccountPubKey,
      });

      const signatures = [];

      // Send each claim transaction one by one
      for (const transaction of transactions) {
        transaction.sign([this.wallet]);
        const signature = await this.connection.sendRawTransaction(transaction.serialize());
        await this.connection.confirmTransaction(signature);
        signatures.push(signature);
      }

      return signatures;
    } catch (error) {
      console.error("Error claiming fees:", error);
      throw error;
    }
  }
}

/**
 * Utility function to add referral parameters to Jupiter Ultra API URL
 * @param baseUrl Base Jupiter Ultra API URL
 * @param referralAccount Referral account public key
 * @param referralFee Referral fee in basis points (50-255)
 * @returns URL with referral parameters
 */
export function addReferralParamsToUrl(baseUrl: string, referralAccount: string, referralFee: number): string {
  // Validate referral fee is within allowed range
  if (referralFee < 50 || referralFee > 255) {
    throw new Error("Referral fee must be between 50 and 255 basis points");
  }
  
  // Add referral parameters to URL
  const url = new URL(baseUrl);
  url.searchParams.append("referralAccount", referralAccount);
  url.searchParams.append("referralFee", referralFee.toString());
  
  return url.toString();
}

/**
 * Helper function to execute a Jupiter Ultra swap with referral
 * @param orderUrl Jupiter Ultra order URL
 * @param wallet Wallet keypair
 * @param referralAccount Referral account public key
 * @param referralFee Referral fee in basis points (50-255)
 * @returns Execution response
 */
export async function executeJupiterUltraSwapWithReferral(
  orderUrl: string,
  wallet: Keypair,
  referralAccount: string,
  referralFee: number
): Promise<any> {
  try {
    // Add referral parameters to order URL
    const urlWithReferral = addReferralParamsToUrl(orderUrl, referralAccount, referralFee);
    
    // Get order
    const orderResponse = await fetch(urlWithReferral).then(res => res.json());
    
    if (orderResponse.error) {
      throw new Error(`Order error: ${orderResponse.error}`);
    }
    
    // Deserialize and sign transaction
    const transactionBase64 = orderResponse.transaction;
    const transaction = VersionedTransaction.deserialize(Buffer.from(transactionBase64, 'base64'));
    transaction.sign([wallet]);
    const signedTransaction = Buffer.from(transaction.serialize()).toString('base64');
    
    // Execute swap
    const executeResponse = await fetch('https://lite-api.jup.ag/ultra/v1/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signedTransaction: signedTransaction,
        requestId: orderResponse.requestId,
      }),
    }).then(res => res.json());
    
    return executeResponse;
  } catch (error) {
    console.error("Error executing Jupiter Ultra swap with referral:", error);
    throw error;
  }
}
