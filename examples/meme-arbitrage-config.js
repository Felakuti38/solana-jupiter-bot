// Example configuration file for Meme Arbitrage Bot
// Copy this file and customize it for your needs

const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

// Load your wallet private key (replace with your actual private key)
const WALLET_PRIVATE_KEY = process.env.SOLANA_WALLET_PRIVATE_KEY || 'your_private_key_here';

// Example configuration for aggressive meme coin arbitrage
module.exports = {
    // Network configuration
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    walletPrivateKey: Keypair.fromSecretKey(bs58.decode(WALLET_PRIVATE_KEY)),
    
    // Trading strategy - AGGRESSIVE for maximum profit
    tradingMode: 'ULTRA_MICRO', // ULTRA_MICRO, MICRO, SMALL, MEDIUM
    ammStrategy: 'AGGRESSIVE', // FAST, CONSERVATIVE, AGGRESSIVE
    riskLevel: 'AGGRESSIVE', // CONSERVATIVE, MODERATE, AGGRESSIVE
    
    // Micro trading parameters
    tradeSize: 0.25, // $0.25 per trade
    minProfitPercent: 1.2, // 1.2% minimum profit
    maxSlippage: 0.8, // 0.8% maximum slippage
    scanInterval: 800, // 800ms between scans
    
    // Risk management
    maxDailyLoss: 0.30, // 30% daily loss limit
    maxRiskPerTrade: 0.10, // 10% max risk per trade
    stopLossPercent: 2.0, // 2% stop loss
    maxConcurrentTrades: 4, // 4 concurrent trades
    
    // Performance settings
    executionTimeout: 5000, // 5 seconds
    priorityFee: 2000, // Higher priority fee for faster execution
    cooldownPeriod: 500, // 500ms cooldown between trades
    
    // Meme coin settings
    memeCoinList: [
        {
            symbol: 'BONK',
            name: 'Bonk',
            address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
            decimals: 5,
            minLiquidity: 50000
        },
        {
            symbol: 'WIF',
            name: 'dogwifhat',
            address: 'EKpQGSJtjMFqKZ1KQanSqYXRcF8fBopzLHYxdM65Qjm',
            decimals: 6,
            minLiquidity: 100000
        },
        {
            symbol: 'POPCAT',
            name: 'Popcat',
            address: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr',
            decimals: 6,
            minLiquidity: 20000
        },
        {
            symbol: 'BOOK',
            name: 'BOOK OF MEME',
            address: '3FoUJzqJvVg8f7VojqNySKzqNqJqJqJqJqJqJqJqJqJq',
            decimals: 6,
            minLiquidity: 30000
        }
    ],
    
    minLiquidity: 10000, // $10k minimum liquidity
    maxPriceImpact: 2.0, // 2% max price impact
    
    // Monitoring and logging
    enableLogging: true,
    logLevel: 'info', // debug, info, warn, error
    saveTradeHistory: true,
    
    // Advanced settings
    enableBackupRPC: true,
    maxRetries: 3,
    retryDelay: 1000,
    
    // Notifications (optional)
    enableNotifications: false,
    webhookUrl: process.env.WEBHOOK_URL,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID
};

// Alternative configurations you can use:

// CONSERVATIVE CONFIGURATION
/*
module.exports = {
    // ... same network config ...
    tradingMode: 'SMALL',
    ammStrategy: 'CONSERVATIVE',
    riskLevel: 'CONSERVATIVE',
    tradeSize: 1.00,
    minProfitPercent: 2.5,
    maxSlippage: 0.3,
    scanInterval: 3000,
    maxDailyLoss: 0.10,
    maxRiskPerTrade: 0.02,
    stopLossPercent: 0.5,
    maxConcurrentTrades: 1,
    cooldownPeriod: 2000,
    priorityFee: 500
};
*/

// BALANCED CONFIGURATION
/*
module.exports = {
    // ... same network config ...
    tradingMode: 'MICRO',
    ammStrategy: 'FAST',
    riskLevel: 'MODERATE',
    tradeSize: 0.50,
    minProfitPercent: 1.8,
    maxSlippage: 0.5,
    scanInterval: 1500,
    maxDailyLoss: 0.20,
    maxRiskPerTrade: 0.05,
    stopLossPercent: 1.0,
    maxConcurrentTrades: 2,
    cooldownPeriod: 1000,
    priorityFee: 1000
};
*/

// PAPER TRADING CONFIGURATION
/*
module.exports = {
    // ... same network config ...
    tradingMode: 'SMALL',
    ammStrategy: 'CONSERVATIVE',
    riskLevel: 'CONSERVATIVE',
    tradeSize: 2.50,
    minProfitPercent: 3.0,
    maxSlippage: 0.2,
    scanInterval: 5000,
    maxDailyLoss: 0.10,
    maxRiskPerTrade: 0.02,
    stopLossPercent: 0.5,
    maxConcurrentTrades: 1,
    cooldownPeriod: 2000,
    priorityFee: 500,
    enableLogging: true,
    logLevel: 'debug'
};
*/