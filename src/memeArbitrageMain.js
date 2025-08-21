#!/usr/bin/env node

const { runCLI } = require('./cli/memeArbitrageCLI');
const MemeArbitrageBot = require('./bot/memeArbitrageBot');
const { mergeConfig, validateConfig, CONFIG_PRESETS } = require('./config/memeArbitrageConfig');
const meow = require('meow');

// CLI help text
const cli = meow(`
    🚀 Meme Coin Arbitrage Bot - Micro Trading Strategies
    
    Usage:
        $ meme-arbitrage-bot [options]
    
    Options:
        --preset, -p          Trading preset (newbie, experienced, professional, paper)
        --mode, -m            Trading mode (ultra_micro, micro, small, medium)
        --size, -s            Trade size in USD (default: 0.50)
        --profit, -pr         Minimum profit percentage (default: 1.5)
        --slippage, -sl       Maximum slippage percentage (default: 0.5)
        --risk, -r            Risk level (conservative, moderate, aggressive)
        --interval, -i        Scan interval in milliseconds (default: 1000)
        --rpc, -rp            Custom RPC endpoint
        --headless, -h        Run in headless mode (no CLI UI)
        --config, -c          Path to custom config file
        --help                Show this help
    
    Examples:
        $ meme-arbitrage-bot --preset newbie
        $ meme-arbitrage-bot --mode micro --size 1.0 --profit 2.0
        $ meme-arbitrage-bot --headless --preset professional
    
    Presets:
        newbie        - Conservative settings for beginners
        experienced   - Balanced approach for experienced traders
        professional  - Aggressive settings for maximum profit
        paper         - Paper trading mode for testing
    
    Trading Modes:
        ultra_micro   - $0.25 trades, highest frequency
        micro         - $0.50 trades, standard micro trading
        small         - $1.00 trades, better fee efficiency
        medium        - $2.50 trades, balanced approach
    
    Risk Levels:
        conservative  - 10% daily loss limit, 2% max risk per trade
        moderate      - 20% daily loss limit, 5% max risk per trade
        aggressive    - 30% daily loss limit, 10% max risk per trade
    
    ⚠️  WARNING: This bot can lead to loss of funds. Use at your own risk!
    💡  Start with small amounts and test thoroughly before using real funds.
`, {
    flags: {
        preset: {
            type: 'string',
            alias: 'p',
            default: 'experienced'
        },
        mode: {
            type: 'string',
            alias: 'm'
        },
        size: {
            type: 'number',
            alias: 's'
        },
        profit: {
            type: 'number',
            alias: 'pr'
        },
        slippage: {
            type: 'number',
            alias: 'sl'
        },
        risk: {
            type: 'string',
            alias: 'r'
        },
        interval: {
            type: 'number',
            alias: 'i'
        },
        rpc: {
            type: 'string',
            alias: 'rp'
        },
        headless: {
            type: 'boolean',
            alias: 'h',
            default: false
        },
        config: {
            type: 'string',
            alias: 'c'
        }
    }
});

// Main function
async function main() {
    try {
        console.log('🚀 Starting Meme Coin Arbitrage Bot...\n');
        
        // Load custom config if provided
        let config;
        if (cli.flags.config) {
            try {
                config = require(cli.flags.config);
            } catch (error) {
                console.error('❌ Failed to load custom config file:', error.message);
                process.exit(1);
            }
        } else {
            // Build config from CLI flags
            config = buildConfigFromFlags(cli.flags);
        }
        
        // Validate configuration
        try {
            validateConfig(config);
        } catch (error) {
            console.error('❌ Configuration validation failed:', error.message);
            process.exit(1);
        }
        
        // Run in headless mode or CLI mode
        if (cli.flags.headless) {
            await runHeadlessMode(config);
        } else {
            runCLI();
        }
        
    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    }
}

// Build configuration from CLI flags
function buildConfigFromFlags(flags) {
    const preset = flags.preset.toUpperCase();
    const presetConfig = CONFIG_PRESETS[preset];
    
    if (!presetConfig) {
        throw new Error(`Invalid preset: ${flags.preset}`);
    }
    
    const config = { ...presetConfig };
    
    // Override with CLI flags
    if (flags.mode) {
        config.tradingMode = flags.mode.toUpperCase();
    }
    
    if (flags.size) {
        config.tradeSize = flags.size;
    }
    
    if (flags.profit) {
        config.minProfitPercent = flags.profit;
    }
    
    if (flags.slippage) {
        config.maxSlippage = flags.slippage;
    }
    
    if (flags.risk) {
        config.riskLevel = flags.risk.toUpperCase();
    }
    
    if (flags.interval) {
        config.scanInterval = flags.interval;
    }
    
    if (flags.rpc) {
        config.rpcUrl = flags.rpc;
    }
    
    return mergeConfig(config);
}

// Run bot in headless mode
async function runHeadlessMode(config) {
    console.log('🤖 Running in headless mode...\n');
    
    // Print configuration
    console.log('📋 Configuration:');
    console.log(`  Trading Mode: ${config.tradingMode}`);
    console.log(`  Trade Size: $${config.tradeSize}`);
    console.log(`  Min Profit: ${config.minProfitPercent}%`);
    console.log(`  Max Slippage: ${config.maxSlippage}%`);
    console.log(`  Risk Level: ${config.riskLevel}`);
    console.log(`  Scan Interval: ${config.scanInterval}ms`);
    console.log(`  RPC: ${config.rpcUrl}\n`);
    
    // Create and initialize bot
    const bot = new MemeArbitrageBot(config);
    
    try {
        const initialized = await bot.initialize();
        if (!initialized) {
            throw new Error('Failed to initialize bot');
        }
        
        console.log('✅ Bot initialized successfully\n');
        
        // Set up signal handlers
        process.on('SIGINT', async () => {
            console.log('\n🛑 Received SIGINT, stopping bot...');
            await bot.stop();
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            console.log('\n🛑 Received SIGTERM, stopping bot...');
            await bot.stop();
            process.exit(0);
        });
        
        // Start the bot
        console.log('🎯 Starting arbitrage trading...\n');
        await bot.start();
        
        // Keep the process running
        setInterval(() => {
            // Print stats every 30 seconds
            if (bot.dailyStats && bot.dailyStats.trades % 10 === 0) {
                bot.printStats();
            }
        }, 30000);
        
    } catch (error) {
        console.error('❌ Failed to start bot:', error.message);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the main function
if (require.main === module) {
    main();
}

module.exports = { main, buildConfigFromFlags };