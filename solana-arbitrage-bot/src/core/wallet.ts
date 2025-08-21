import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress, Account } from '@solana/spl-token';
import bs58 from 'bs58';
import { WALLET_CONFIG, SOLANA_CONFIG } from '../config/config';
import { logger } from '../utils/logger';
import Decimal from 'decimal.js';

export class WalletManager {
  private connection: Connection;
  private wallet: Keypair;
  private publicKey: PublicKey;

  constructor() {
    this.connection = new Connection(SOLANA_CONFIG.rpcEndpoint, SOLANA_CONFIG.commitment);
    
    if (!WALLET_CONFIG.privateKey) {
      throw new Error('Wallet private key not configured');
    }
    
    try {
      // Support both base58 and array format
      if (WALLET_CONFIG.privateKey.startsWith('[')) {
        const secretKey = Uint8Array.from(JSON.parse(WALLET_CONFIG.privateKey));
        this.wallet = Keypair.fromSecretKey(secretKey);
      } else {
        this.wallet = Keypair.fromSecretKey(bs58.decode(WALLET_CONFIG.privateKey));
      }
      
      this.publicKey = this.wallet.publicKey;
      logger.info(`Wallet initialized: ${this.publicKey.toString()}`);
    } catch (error) {
      logger.error('Failed to initialize wallet:', error);
      throw new Error('Invalid wallet private key format');
    }
  }

  getConnection(): Connection {
    return this.connection;
  }

  getWallet(): Keypair {
    return this.wallet;
  }

  getPublicKey(): PublicKey {
    return this.publicKey;
  }

  async getSOLBalance(): Promise<Decimal> {
    try {
      const balance = await this.connection.getBalance(this.publicKey);
      return new Decimal(balance).div(LAMPORTS_PER_SOL);
    } catch (error) {
      logger.error('Failed to get SOL balance:', error);
      return new Decimal(0);
    }
  }

  async getTokenBalance(mint: PublicKey): Promise<Decimal> {
    try {
      const tokenAccount = await getAssociatedTokenAddress(mint, this.publicKey);
      const account = await getAccount(this.connection, tokenAccount);
      return new Decimal(account.amount.toString());
    } catch (error) {
      logger.debug(`No token account found for mint ${mint.toString()}`);
      return new Decimal(0);
    }
  }

  async getAllTokenBalances(): Promise<Map<string, Decimal>> {
    const balances = new Map<string, Decimal>();
    
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.publicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      for (const account of tokenAccounts.value) {
        const mint = account.account.data.parsed.info.mint;
        const amount = account.account.data.parsed.info.tokenAmount.uiAmount;
        if (amount > 0) {
          balances.set(mint, new Decimal(amount));
        }
      }
    } catch (error) {
      logger.error('Failed to get token balances:', error);
    }

    return balances;
  }

  async ensureTokenAccount(mint: PublicKey): Promise<PublicKey> {
    const associatedTokenAddress = await getAssociatedTokenAddress(mint, this.publicKey);
    
    try {
      await getAccount(this.connection, associatedTokenAddress);
      return associatedTokenAddress;
    } catch {
      logger.info(`Creating token account for mint ${mint.toString()}`);
      // Token account doesn't exist, will be created during swap
      return associatedTokenAddress;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const balance = await this.getSOLBalance();
      logger.info(`Wallet health check - SOL Balance: ${balance.toString()}`);
      return balance.gt(0.01); // Minimum 0.01 SOL for transactions
    } catch (error) {
      logger.error('Wallet health check failed:', error);
      return false;
    }
  }
}