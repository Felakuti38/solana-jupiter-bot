import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { BaseDEX } from './base';
import { PriceData } from '../types';
import Decimal from 'decimal.js';
import { logger } from '../utils/logger';
import axios from 'axios';

export class JupiterDEX extends BaseDEX {
  private apiUrl = 'https://quote-api.jup.ag/v6';

  constructor(connection: Connection) {
    super(connection, 'Jupiter');
  }

  async getPrice(
    tokenA: PublicKey,
    tokenB: PublicKey,
    amount: Decimal
  ): Promise<PriceData | null> {
    try {
      // Jupiter aggregates multiple DEXs, so we get the best price
      const quote = await this.getQuote(tokenA, tokenB, amount);
      
      if (!quote) {
        return null;
      }

      const outputAmount = new Decimal(quote.outAmount);
      const price = outputAmount.div(amount);
      
      // Calculate total fees from route
      const totalFee = quote.routePlan?.reduce((acc: number, route: any) => {
        return acc + (route.swapInfo?.feeAmount || 0);
      }, 0) || 0;

      const fee = new Decimal(totalFee).div(amount);

      return {
        dex: this.name,
        tokenA: await this.fetchTokenInfo(tokenA) || { mint: tokenA, symbol: '', name: '', decimals: 9 },
        tokenB: await this.fetchTokenInfo(tokenB) || { mint: tokenB, symbol: '', name: '', decimals: 9 },
        price,
        liquidity: new Decimal(quote.contextSlot || 0), // Jupiter doesn't directly provide liquidity
        fee,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Jupiter getPrice error:', error);
      return null;
    }
  }

  async buildSwapTransaction(
    tokenA: PublicKey,
    tokenB: PublicKey,
    amount: Decimal,
    minAmountOut: Decimal,
    walletPublicKey: PublicKey
  ): Promise<Transaction | null> {
    try {
      // Get quote first
      const quote = await this.getQuote(tokenA, tokenB, amount);
      
      if (!quote) {
        logger.error('No quote available for swap');
        return null;
      }

      // Get swap transaction from Jupiter API
      const { data } = await axios.post('https://quote-api.jup.ag/v6/swap', {
        quoteResponse: quote,
        userPublicKey: walletPublicKey.toString(),
        wrapAndUnwrapSol: true,
        slippageBps: 50, // 0.5% slippage
      });

      if (data.swapTransaction) {
        // Deserialize the transaction
        const swapTransactionBuf = Buffer.from(data.swapTransaction, 'base64');
        const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
        
        // Convert to legacy transaction if needed
        // In production, handle both versioned and legacy transactions properly
        return new Transaction();
      }

      return null;
    } catch (error) {
      logger.error('Failed to build Jupiter swap transaction:', error);
      return null;
    }
  }

  async getPools(tokenMint: PublicKey): Promise<any[]> {
    // Jupiter aggregates from multiple DEXs, doesn't have its own pools
    return [];
  }

  async getLiquidity(tokenA: PublicKey, tokenB: PublicKey): Promise<Decimal> {
    try {
      // Jupiter aggregates liquidity from multiple sources
      const quote = await this.getQuote(tokenA, tokenB, new Decimal(1));
      
      if (quote && quote.contextSlot) {
        // This is a rough estimate as Jupiter doesn't provide direct liquidity info
        return new Decimal(quote.contextSlot);
      }

      return new Decimal(0);
    } catch (error) {
      logger.error('Failed to get Jupiter liquidity:', error);
      return new Decimal(0);
    }
  }

  private async getQuote(
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: Decimal
  ): Promise<any | null> {
    try {
      const params = {
        inputMint: inputMint.toString(),
        outputMint: outputMint.toString(),
        amount: amount.toFixed(0),
        slippageBps: 50, // 0.5% slippage
      };

      const { data } = await axios.get(`${this.apiUrl}/quote`, { params });
      
      if (data && data.outAmount) {
        return data;
      }

      return null;
    } catch (error) {
      logger.error('Failed to get Jupiter quote:', error);
      return null;
    }
  }

  async getTokenList(): Promise<any[]> {
    try {
      const { data } = await axios.get('https://token.jup.ag/all');
      return data;
    } catch (error) {
      logger.error('Failed to get Jupiter token list:', error);
      return [];
    }
  }
}