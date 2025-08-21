const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');

// Load environment variables
require('dotenv').config();

// Popular meme coins for arbitrage
const POPULAR_MEME_COINS = [
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
    },
    {
        symbol: 'MYRO',
        name: 'Myro',
        address: 'HYPERfwdTpJ5yqMZTrWJqWJqWJqWJqWJqWJqWJqWJqWJqWJq',
        decimals: 6,
        minLiquidity: 15000
    },
    {
        symbol: 'DOGWIFHAT',
        name: 'dogwifhat',
        address: 'EKpQGSJtjMFqKZ1KQanSqYXRcF8fBopzLHYxdM65Qjm',
        decimals: 6,
        minLiquidity: 100000
    }
];

// RPC endpoints for redundancy
const RPC_ENDPOINTS = [
    process.env.DEFAULT_RPC || 'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana',
    'https://mainnet.rpcpool.com',
    ...(process.env.ALT_RPC_LIST ? process.env.ALT_RPC_LIST.split(',') : [])
];

// AMM configurations for different strategies
const AMM_STRATEGIES = {
    FAST: {
        name: 'Fast Execution',
        description: 'Optimized for speed with high-liquidity AMMs',
        amms: ['Raydium', 'Raydium CLMM', 'Orca', 'Openbook'],
        priority: 1000,
        safetyLevel: 'FAST',
        maxSlippage: 0.5,
        minProfitPercent: 1.5
    },
    CONSERVATIVE: {
        name: 'Conservative',
        description: 'Lower risk with more safety checks',
        amms: ['Raydium', 'Orca', 'Openbook', 'Serum'],
        priority: 500,
        safetyLevel: 'VERIFIED',
        maxSlippage: 0.3,
        minProfitPercent: 2.0
    },
    AGGRESSIVE: {
        name: 'Aggressive',
        description: 'Higher risk for higher rewards',
        amms: ['Raydium', 'Raydium CLMM', 'Orca', 'Openbook', 'Serum', 'Lifinity'],
        priority: 2000,
        safetyLevel: 'FAST',
        maxSlippage: 1.0,
        minProfitPercent: 1.0
    }
};

// Micro trading configurations
const MICRO_TRADING_CONFIGS = {
    ULTRA_MICRO: {
        name: 'Ultra Micro ($0.25)',
        tradeSize: 0.25,
        minProfitPercent: 2.5,
        maxSlippage: 0.8,
        scanInterval: 500,
        maxConcurrentTrades: 5,
        description: 'Smallest trades for highest frequency'
    },
    MICRO: {
        name: 'Micro ($0.50)',
        tradeSize: 0.50,
        minProfitPercent: 2.0,
        maxSlippage: 0.6,
        scanInterval: 1000,
        maxConcurrentTrades: 3,
        description: 'Standard micro trading'
    },
    SMALL: {
        name: 'Small ($1.00)',
        tradeSize: 1.00,
        minProfitPercent: 1.5,
        maxSlippage: 0.5,
        scanInterval: 1500,
        maxConcurrentTrades: 2,
        description: 'Better fee efficiency'
    },
    MEDIUM: {
        name: 'Medium ($2.50)',
        tradeSize: 2.50,
        minProfitPercent: 1.2,
        maxSlippage: 0.4,
        scanInterval: 2000,
        maxConcurrentTrades: 1,
        description: 'Balanced approach'
    }
};

// Risk management configurations
const RISK_CONFIGS = {
    CONSERVATIVE: {
        name: 'Conservative',
        maxDailyLoss: 0.10, // 10%
        maxRiskPerTrade: 0.02, // 2%
        stopLossPercent: 0.5,
        maxConcurrentTrades: 1,
        cooldownPeriod: 2000
    },
    MODERATE: {
        name: 'Moderate',
        maxDailyLoss: 0.20, // 20%
        maxRiskPerTrade: 0.05, // 5%
        stopLossPercent: 1.0,
        maxConcurrentTrades: 2,
        cooldownPeriod: 1000
    },
    AGGRESSIVE: {
        name: 'Aggressive',
        maxDailyLoss: 0.30, // 30%
        maxRiskPerTrade: 0.10, // 10%
        stopLossPercent: 2.0,
        maxConcurrentTrades: 3,
        cooldownPeriod: 500
    }
};

// Load wallet from environment
function loadWallet() {
    const privateKey = process.env.SOLANA_WALLET_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error('SOLANA_WALLET_PRIVATE_KEY not found in environment variables');
    }
    
    try {
        const decoded = bs58.decode(privateKey);
        return Keypair.fromSecretKey(decoded);
    } catch (error) {
        throw new Error('Invalid private key format');
    }
}

// Default configuration
const DEFAULT_CONFIG = {
    // Network
    rpcUrl: RPC_ENDPOINTS[0],
    walletPrivateKey: loadWallet(),
    
    // Trading strategy
    tradingMode: 'MICRO', // MICRO, ULTRA_MICRO, SMALL, MEDIUM
    ammStrategy: 'FAST', // FAST, CONSERVATIVE, AGGRESSIVE
    riskLevel: 'MODERATE', // CONSERVATIVE, MODERATE, AGGRESSIVE
    
    // Meme coin settings
    memeCoinList: POPULAR_MEME_COINS,
    minLiquidity: 10000,
    maxPriceImpact: 2.0,
    
    // Performance
    executionTimeout: 5000,
    priorityFee: 1000,
    
    // Monitoring
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

// Configuration presets for different scenarios
const CONFIG_PRESETS = {
    // Newbie configuration - very conservative
    NEWBIE: {
        ...DEFAULT_CONFIG,
        tradingMode: 'SMALL',
        ammStrategy: 'CONSERVATIVE',
        riskLevel: 'CONSERVATIVE',
        minProfitPercent: 2.5,
        maxConcurrentTrades: 1,
        scanInterval: 3000
    },
    
    // Experienced trader - balanced approach
    EXPERIENCED: {
        ...DEFAULT_CONFIG,
        tradingMode: 'MICRO',
        ammStrategy: 'FAST',
        riskLevel: 'MODERATE',
        minProfitPercent: 1.8,
        maxConcurrentTrades: 2,
        scanInterval: 1500
    },
    
    // Professional - aggressive for maximum profit
    PROFESSIONAL: {
        ...DEFAULT_CONFIG,
        tradingMode: 'ULTRA_MICRO',
        ammStrategy: 'AGGRESSIVE',
        riskLevel: 'AGGRESSIVE',
        minProfitPercent: 1.2,
        maxConcurrentTrades: 4,
        scanInterval: 800
    },
    
    // Paper trading - for testing
    PAPER_TRADING: {
        ...DEFAULT_CONFIG,
        tradingMode: 'SMALL',
        ammStrategy: 'CONSERVATIVE',
        riskLevel: 'CONSERVATIVE',
        minProfitPercent: 3.0,
        maxConcurrentTrades: 1,
        scanInterval: 5000,
        enableLogging: true,
        logLevel: 'debug'
    }
};

// Helper function to merge configurations
function mergeConfig(baseConfig, overrides = {}) {
    const config = { ...baseConfig };
    
    // Merge trading mode settings
    if (overrides.tradingMode && MICRO_TRADING_CONFIGS[overrides.tradingMode]) {
        Object.assign(config, MICRO_TRADING_CONFIGS[overrides.tradingMode]);
    }
    
    // Merge AMM strategy settings
    if (overrides.ammStrategy && AMM_STRATEGIES[overrides.ammStrategy]) {
        Object.assign(config, AMM_STRATEGIES[overrides.ammStrategy]);
    }
    
    // Merge risk settings
    if (overrides.riskLevel && RISK_CONFIGS[overrides.riskLevel]) {
        Object.assign(config, RISK_CONFIGS[overrides.riskLevel]);
    }
    
    // Apply any other overrides
    Object.assign(config, overrides);
    
    return config;
}

// Helper function to validate configuration
function validateConfig(config) {
    const errors = [];
    
    if (!config.walletPrivateKey) {
        errors.push('Wallet private key is required');
    }
    
    if (config.tradeSize < 0.1) {
        errors.push('Trade size must be at least $0.10');
    }
    
    if (config.minProfitPercent < 0.5) {
        errors.push('Minimum profit percent must be at least 0.5%');
    }
    
    if (config.maxSlippage > 5.0) {
        errors.push('Maximum slippage cannot exceed 5%');
    }
    
    if (config.maxDailyLoss > 0.5) {
        errors.push('Maximum daily loss cannot exceed 50%');
    }
    
    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
    
    return true;
}

// Export configurations
module.exports = {
    DEFAULT_CONFIG,
    CONFIG_PRESETS,
    POPULAR_MEME_COINS,
    AMM_STRATEGIES,
    MICRO_TRADING_CONFIGS,
    RISK_CONFIGS,
    RPC_ENDPOINTS,
    mergeConfig,
    validateConfig,
    loadWallet
};