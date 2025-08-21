import { PublicKey } from '@solana/web3.js';
import Decimal from 'decimal.js';

export interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  price?: number;
  volume24h?: number;
  marketCap?: number;
  liquidity?: number;
}

export interface PriceData {
  dex: string;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  price: Decimal;
  liquidity: Decimal;
  fee: Decimal;
  timestamp: number;
}

export interface ArbitrageOpportunity {
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  buyDex: string;
  sellDex: string;
  buyPrice: Decimal;
  sellPrice: Decimal;
  profitPercentage: Decimal;
  estimatedProfit: Decimal;
  liquidity: Decimal;
  timestamp: number;
}

export interface TradeExecution {
  opportunity: ArbitrageOpportunity;
  amountIn: Decimal;
  expectedAmountOut: Decimal;
  actualAmountOut?: Decimal;
  slippage?: Decimal;
  gasUsed?: Decimal;
  profit?: Decimal;
  status: 'pending' | 'success' | 'failed';
  txSignature?: string;
  timestamp: number;
  error?: string;
}

export interface TradingConfig {
  minProfitThreshold: number;
  maxSlippage: number;
  maxPositionSize: number;
  minLiquidity: number;
  maxDailyLoss: number;
  maxTradesPerMinute: number;
  stopLossPercentage: number;
}

export interface DexConfig {
  enableRaydium: boolean;
  enableOrca: boolean;
  enableJupiter: boolean;
}

export interface MemeTokenFilter {
  minMarketCap: number;
  maxMarketCap: number;
  minVolume24h: number;
}

export interface BotStatistics {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalProfit: Decimal;
  totalVolume: Decimal;
  winRate: number;
  averageProfit: Decimal;
  dailyPnL: Decimal;
  uptime: number;
}