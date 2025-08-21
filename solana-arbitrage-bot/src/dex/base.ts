import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import Decimal from 'decimal.js';
import { PriceData, TokenInfo } from '../types';
import { logger } from '../utils/logger';

export abstract class BaseDEX {
  protected connection: Connection;
  protected name: string;

  constructor(connection: Connection, name: string) {
    this.connection = connection;
    this.name = name;
  }

  abstract async getPrice(
    tokenA: PublicKey,
    tokenB: PublicKey,
    amount: Decimal
  ): Promise<PriceData | null>;

  abstract async buildSwapTransaction(
    tokenA: PublicKey,
    tokenB: PublicKey,
    amount: Decimal,
    minAmountOut: Decimal,
    walletPublicKey: PublicKey
  ): Promise<Transaction | null>;

  abstract async getPools(tokenMint: PublicKey): Promise<any[]>;

  abstract async getLiquidity(
    tokenA: PublicKey,
    tokenB: PublicKey
  ): Promise<Decimal>;

  getName(): string {
    return this.name;
  }

  protected async fetchTokenInfo(mint: PublicKey): Promise<TokenInfo | null> {
    try {
      // In a real implementation, you would fetch this from on-chain metadata
      // For now, returning a basic structure
      return {
        mint,
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        decimals: 9,
      };
    } catch (error) {
      logger.error(`Failed to fetch token info for ${mint.toString()}:`, error);
      return null;
    }
  }

  protected calculatePriceImpact(
    amountIn: Decimal,
    reserveIn: Decimal,
    reserveOut: Decimal,
    fee: Decimal = new Decimal(0.003) // 0.3% default fee
  ): { amountOut: Decimal; priceImpact: Decimal } {
    const amountInWithFee = amountIn.mul(new Decimal(1).sub(fee));
    const numerator = amountInWithFee.mul(reserveOut);
    const denominator = reserveIn.add(amountInWithFee);
    const amountOut = numerator.div(denominator);
    
    const priceBeforeSwap = reserveOut.div(reserveIn);
    const priceAfterSwap = reserveOut.sub(amountOut).div(reserveIn.add(amountIn));
    const priceImpact = priceAfterSwap.sub(priceBeforeSwap).div(priceBeforeSwap).abs();
    
    return { amountOut, priceImpact };
  }
}