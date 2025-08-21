import { PublicKey } from '@solana/web3.js';
import Decimal from 'decimal.js';
import { ArbitrageOpportunity, PriceData, TokenInfo } from '../types';
import { TRADING_CONFIG, MEME_TOKEN_FILTER } from '../config/config';
import { logger } from '../utils/logger';
import { BaseDEX } from '../dex/base';

export class ArbitrageDetector {
  private dexes: Map<string, BaseDEX>;
  private opportunities: ArbitrageOpportunity[] = [];
  private priceCache: Map<string, PriceData[]> = new Map();

  constructor(dexes: BaseDEX[]) {
    this.dexes = new Map();
    dexes.forEach(dex => {
      this.dexes.set(dex.getName(), dex);
    });
  }

  async scanForOpportunities(tokens: TokenInfo[]): Promise<ArbitrageOpportunity[]> {
    this.opportunities = [];
    
    // Filter tokens based on meme token criteria
    const eligibleTokens = tokens.filter(token => this.isEligibleToken(token));
    
    logger.info(`Scanning ${eligibleTokens.length} eligible tokens for arbitrage opportunities`);

    // Compare prices across all DEX pairs
    for (let i = 0; i < eligibleTokens.length; i++) {
      for (let j = i + 1; j < eligibleTokens.length; j++) {
        const tokenA = eligibleTokens[i];
        const tokenB = eligibleTokens[j];
        
        await this.checkTokenPair(tokenA, tokenB);
      }
    }

    // Sort opportunities by profit percentage
    this.opportunities.sort((a, b) => b.profitPercentage.sub(a.profitPercentage).toNumber());

    logger.info(`Found ${this.opportunities.length} arbitrage opportunities`);
    
    return this.opportunities;
  }

  private async checkTokenPair(tokenA: TokenInfo, tokenB: TokenInfo): Promise<void> {
    const prices: Map<string, PriceData> = new Map();
    const testAmount = new Decimal(100); // Test with 100 units

    // Get prices from all DEXes
    for (const [dexName, dex] of this.dexes) {
      try {
        const priceData = await dex.getPrice(tokenA.mint, tokenB.mint, testAmount);
        if (priceData && priceData.liquidity.gt(TRADING_CONFIG.minLiquidity)) {
          prices.set(dexName, priceData);
        }
      } catch (error) {
        logger.debug(`Failed to get price from ${dexName} for ${tokenA.symbol}-${tokenB.symbol}`);
      }
    }

    // Find arbitrage opportunities
    const dexNames = Array.from(prices.keys());
    
    for (let i = 0; i < dexNames.length; i++) {
      for (let j = i + 1; j < dexNames.length; j++) {
        const dex1 = dexNames[i];
        const dex2 = dexNames[j];
        const price1 = prices.get(dex1)!;
        const price2 = prices.get(dex2)!;

        this.evaluateArbitrage(tokenA, tokenB, dex1, dex2, price1, price2);
      }
    }
  }

  private evaluateArbitrage(
    tokenA: TokenInfo,
    tokenB: TokenInfo,
    dex1: string,
    dex2: string,
    price1: PriceData,
    price2: PriceData
  ): void {
    // Calculate profit opportunities both ways
    const spread = price1.price.sub(price2.price).abs();
    const avgPrice = price1.price.add(price2.price).div(2);
    const spreadPercentage = spread.div(avgPrice);

    // Account for fees
    const totalFees = price1.fee.add(price2.fee);
    const netProfit = spreadPercentage.sub(totalFees);

    if (netProfit.gt(TRADING_CONFIG.minProfitThreshold)) {
      const buyDex = price1.price.lt(price2.price) ? dex1 : dex2;
      const sellDex = price1.price.lt(price2.price) ? dex2 : dex1;
      const buyPrice = price1.price.lt(price2.price) ? price1.price : price2.price;
      const sellPrice = price1.price.lt(price2.price) ? price2.price : price1.price;

      const opportunity: ArbitrageOpportunity = {
        tokenA,
        tokenB,
        buyDex,
        sellDex,
        buyPrice,
        sellPrice,
        profitPercentage: netProfit,
        estimatedProfit: netProfit.mul(TRADING_CONFIG.maxPositionSize),
        liquidity: Decimal.min(price1.liquidity, price2.liquidity),
        timestamp: Date.now(),
      };

      this.opportunities.push(opportunity);
      
      logger.info(`Arbitrage opportunity found: ${tokenA.symbol}-${tokenB.symbol} | Buy on ${buyDex} @ ${buyPrice.toFixed(6)} | Sell on ${sellDex} @ ${sellPrice.toFixed(6)} | Profit: ${netProfit.mul(100).toFixed(2)}%`);
    }
  }

  private isEligibleToken(token: TokenInfo): boolean {
    // Check if token meets meme token criteria
    if (token.marketCap) {
      if (token.marketCap < MEME_TOKEN_FILTER.minMarketCap || 
          token.marketCap > MEME_TOKEN_FILTER.maxMarketCap) {
        return false;
      }
    }

    if (token.volume24h && token.volume24h < MEME_TOKEN_FILTER.minVolume24h) {
      return false;
    }

    return true;
  }

  async updatePriceCache(token: PublicKey, prices: PriceData[]): Promise<void> {
    const key = token.toString();
    this.priceCache.set(key, prices);
    
    // Clean old entries (keep last 100)
    if (this.priceCache.size > 100) {
      const firstKey = this.priceCache.keys().next().value;
      this.priceCache.delete(firstKey);
    }
  }

  getTopOpportunities(count: number = 10): ArbitrageOpportunity[] {
    return this.opportunities.slice(0, count);
  }

  clearOpportunities(): void {
    this.opportunities = [];
  }
}