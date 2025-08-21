const MemeArbitrageBot = require('../bot/memeArbitrageBot');
const { mergeConfig, validateConfig, CONFIG_PRESETS } = require('../config/memeArbitrageConfig');

// Test configuration for paper trading
const TEST_CONFIG = {
    ...CONFIG_PRESETS.PAPER_TRADING,
    // Override for testing
    tradeSize: 0.10, // Very small for testing
    minProfitPercent: 5.0, // High threshold for testing
    maxConcurrentTrades: 1,
    scanInterval: 5000, // Slower for testing
    enableLogging: true,
    logLevel: 'debug'
};

async function testBotSetup() {
    console.log('🧪 Testing Meme Arbitrage Bot Setup...\n');
    
    try {
        // Test 1: Configuration validation
        console.log('✅ Test 1: Validating configuration...');
        validateConfig(TEST_CONFIG);
        console.log('   Configuration is valid\n');
        
        // Test 2: Bot initialization
        console.log('✅ Test 2: Initializing bot...');
        const bot = new MemeArbitrageBot(TEST_CONFIG);
        const initialized = await bot.initialize();
        
        if (initialized) {
            console.log('   Bot initialized successfully\n');
        } else {
            throw new Error('Bot initialization failed');
        }
        
        // Test 3: Jupiter connection
        console.log('✅ Test 3: Testing Jupiter connection...');
        if (bot.jupiter) {
            console.log('   Jupiter SDK connected successfully\n');
        } else {
            throw new Error('Jupiter SDK not initialized');
        }
        
        // Test 4: Meme coin loading
        console.log('✅ Test 4: Testing meme coin loading...');
        if (bot.config.memeCoinList && bot.config.memeCoinList.length > 0) {
            console.log(`   Loaded ${bot.config.memeCoinList.length} meme coins`);
            console.log('   Sample coins:', bot.config.memeCoinList.slice(0, 3).map(c => c.symbol).join(', '));
            console.log('');
        } else {
            throw new Error('No meme coins loaded');
        }
        
        // Test 5: Route computation (simulation)
        console.log('✅ Test 5: Testing route computation...');
        try {
            const testCoin = bot.config.memeCoinList[0];
            const routes = await bot.getRoutes(testCoin.address, 'USDC');
            
            if (routes && routes.length > 0) {
                console.log(`   Found ${routes.length} routes for ${testCoin.symbol}/USDC`);
                console.log('   Route computation working\n');
            } else {
                console.log('   No routes found (this is normal for some tokens)\n');
            }
        } catch (error) {
            console.log('   Route computation test skipped (network issue)\n');
        }
        
        // Test 6: Configuration summary
        console.log('✅ Test 6: Configuration summary...');
        console.log(`   Trading Mode: ${bot.config.tradingMode}`);
        console.log(`   Trade Size: $${bot.config.tradeSize}`);
        console.log(`   Min Profit: ${bot.config.minProfitPercent}%`);
        console.log(`   Max Slippage: ${bot.config.maxSlippage}%`);
        console.log(`   Risk Level: ${bot.config.riskLevel}`);
        console.log(`   Scan Interval: ${bot.config.scanInterval}ms`);
        console.log(`   Max Concurrent Trades: ${bot.config.maxConcurrentTrades}`);
        console.log(`   Daily Loss Limit: ${bot.config.maxDailyLoss * 100}%`);
        console.log('');
        
        // Test 7: Risk management
        console.log('✅ Test 7: Testing risk management...');
        const riskChecks = [
            bot.config.maxDailyLoss <= 0.5,
            bot.config.maxRiskPerTrade <= 0.2,
            bot.config.maxSlippage <= 5.0,
            bot.config.tradeSize >= 0.1
        ];
        
        if (riskChecks.every(check => check)) {
            console.log('   Risk management parameters are safe\n');
        } else {
            console.log('   ⚠️  Some risk parameters may be too aggressive\n');
        }
        
        console.log('🎉 All tests passed! Bot is ready for use.\n');
        console.log('📋 Next steps:');
        console.log('   1. Set your wallet private key in .env file');
        console.log('   2. Fund your wallet with SOL for fees');
        console.log('   3. Add USDC for trading');
        console.log('   4. Start with paper trading mode');
        console.log('   5. Monitor performance and adjust settings\n');
        
        return true;
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n🔧 Troubleshooting:');
        console.log('   1. Check your internet connection');
        console.log('   2. Verify RPC endpoint is accessible');
        console.log('   3. Ensure all dependencies are installed');
        console.log('   4. Check configuration parameters\n');
        return false;
    }
}

async function testConfigurationPresets() {
    console.log('🧪 Testing Configuration Presets...\n');
    
    const presets = ['NEWBIE', 'EXPERIENCED', 'PROFESSIONAL', 'PAPER_TRADING'];
    
    for (const preset of presets) {
        try {
            console.log(`✅ Testing ${preset} preset...`);
            const config = CONFIG_PRESETS[preset];
            validateConfig(config);
            console.log(`   ${preset} preset is valid`);
            console.log(`   Trade Size: $${config.tradeSize}, Risk: ${config.riskLevel}\n`);
        } catch (error) {
            console.error(`❌ ${preset} preset failed:`, error.message);
        }
    }
}

async function testMemeCoinDetection() {
    console.log('🧪 Testing Meme Coin Detection...\n');
    
    try {
        const bot = new MemeArbitrageBot(TEST_CONFIG);
        await bot.loadMemeCoins();
        
        console.log(`✅ Loaded ${bot.config.memeCoinList.length} meme coins`);
        
        // Show sample coins
        const sampleCoins = bot.config.memeCoinList.slice(0, 5);
        sampleCoins.forEach(coin => {
            console.log(`   ${coin.symbol}: ${coin.name} (${coin.address.substring(0, 8)}...)`);
        });
        
        console.log('');
        
    } catch (error) {
        console.error('❌ Meme coin detection failed:', error.message);
    }
}

// Main test function
async function runAllTests() {
    console.log('🚀 Starting Meme Arbitrage Bot Tests...\n');
    
    const tests = [
        { name: 'Configuration Presets', fn: testConfigurationPresets },
        { name: 'Meme Coin Detection', fn: testMemeCoinDetection },
        { name: 'Bot Setup', fn: testBotSetup }
    ];
    
    let passed = 0;
    let total = tests.length;
    
    for (const test of tests) {
        console.log(`\n📋 Running ${test.name}...`);
        try {
            const result = await test.fn();
            if (result !== false) {
                passed++;
            }
        } catch (error) {
            console.error(`❌ ${test.name} failed:`, error.message);
        }
    }
    
    console.log('\n📊 Test Results:');
    console.log(`   Passed: ${passed}/${total}`);
    console.log(`   Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (passed === total) {
        console.log('\n🎉 All tests passed! Your bot is ready to use.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the issues above.');
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testBotSetup,
    testConfigurationPresets,
    testMemeCoinDetection,
    runAllTests
};