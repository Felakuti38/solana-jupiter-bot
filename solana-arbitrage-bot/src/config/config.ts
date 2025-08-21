import dotenv from 'dotenv';
import { TradingConfig, DexConfig, MemeTokenFilter } from '../types';

dotenv.config();

export const SOLANA_CONFIG = {
  rpcEndpoint: process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
  wsEndpoint: process.env.SOLANA_WS_ENDPOINT || 'wss://api.mainnet-beta.solana.com',
  commitment: 'confirmed' as const,
};

export const WALLET_CONFIG = {
  privateKey: process.env.WALLET_PRIVATE_KEY || '',
};

export const TRADING_CONFIG: TradingConfig = {
  minProfitThreshold: parseFloat(process.env.MIN_PROFIT_THRESHOLD || '0.005'),
  maxSlippage: parseFloat(process.env.MAX_SLIPPAGE || '0.02'),
  maxPositionSize: parseFloat(process.env.MAX_POSITION_SIZE || '100'),
  minLiquidity: parseFloat(process.env.MIN_LIQUIDITY || '1000'),
  maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS || '100'),
  maxTradesPerMinute: parseInt(process.env.MAX_TRADES_PER_MINUTE || '10'),
  stopLossPercentage: parseFloat(process.env.STOP_LOSS_PERCENTAGE || '0.05'),
};

export const DEX_CONFIG: DexConfig = {
  enableRaydium: process.env.ENABLE_RAYDIUM === 'true',
  enableOrca: process.env.ENABLE_ORCA === 'true',
  enableJupiter: process.env.ENABLE_JUPITER === 'true',
};

export const MEME_TOKEN_FILTER: MemeTokenFilter = {
  minMarketCap: parseFloat(process.env.MIN_MARKET_CAP || '10000'),
  maxMarketCap: parseFloat(process.env.MAX_MARKET_CAP || '10000000'),
  minVolume24h: parseFloat(process.env.MIN_VOLUME_24H || '1000'),
};

export const MONITORING_CONFIG = {
  port: parseInt(process.env.MONITORING_PORT || '3000'),
  enableDashboard: process.env.ENABLE_DASHBOARD === 'true',
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Known meme tokens on Solana (you can expand this list)
export const MEME_TOKENS = [
  {
    symbol: 'BONK',
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    name: 'Bonk',
  },
  {
    symbol: 'WIF',
    mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    name: 'dogwifhat',
  },
  {
    symbol: 'MYRO',
    mint: 'HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4',
    name: 'Myro',
  },
  {
    symbol: 'POPCAT',
    mint: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
    name: 'Popcat',
  },
  // Add more meme tokens as needed
];

// DEX Program IDs
export const DEX_PROGRAMS = {
  RAYDIUM_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  ORCA_WHIRLPOOL: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  JUPITER_V6: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
};