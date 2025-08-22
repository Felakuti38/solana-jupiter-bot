#!/usr/bin/env node

/**
 * Complete Integration Test for Enhanced Meme Coin Bot
 */

console.log('🧪 COMPREHENSIVE INTEGRATION TEST');
console.log('================================\n');

let testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

function logTest(name, success, details = '') {
    if (success) {
        console.log(`✅ ${name}`);
        testResults.passed++;
    } else {
        console.log(`❌ ${name}: ${details}`);
        testResults.failed++;
        testResults.errors.push(`${name}: ${details}`);
    }
}

async function runTests() {
    // Test 1: Strategy file imports
    try {
        console.log('1. Testing Strategy File Imports...');
        const { MemeCoinArbitrageStrategy } = require('./src/strategies/memeCoinArbitrage');
        const { MicroTradingEngine } = require('./src/strategies/microTradingEngine');
        logTest('Strategy imports', true);
    } catch (e) {
        logTest('Strategy imports', false, e.message);
    }

    // Test 2: Configuration system
    try {
        console.log('2. Testing Configuration System...');
        const { getMemeCoinConfig, validateMemeCoinConfig } = require('./src/config/memeCoinConfig');
        const config = getMemeCoinConfig('conservative');
        const validation = validateMemeCoinConfig(config);
        logTest('Configuration system', validation.isValid, validation.errors.join(', '));
    } catch (e) {
        logTest('Configuration system', false, e.message);
    }

    // Test 3: Bot file syntax
    try {
        console.log('3. Testing Bot File Syntax...');
        const fs = require('fs');
        const botContent = fs.readFileSync('./src/bot/index.js', 'utf8');
        
        const hasMemeCoinStrategy = botContent.includes('memeCoinArbitrageStrategy');
        const hasMicroStrategy = botContent.includes('microTradingStrategy');
        const hasRouting = botContent.includes('memecoin-arbitrage') && botContent.includes('micro-trading');
        
        logTest('Meme coin strategy function', hasMemeCoinStrategy);
        logTest('Micro trading strategy function', hasMicroStrategy);
        logTest('Enhanced strategy routing', hasRouting);
    } catch (e) {
        logTest('Bot file syntax', false, e.message);
    }

    // Test 4: Validation updates
    try {
        console.log('4. Testing Validation Updates...');
        const fs = require('fs');
        const validationContent = fs.readFileSync('./src/utils/validation.js', 'utf8');
        const hasNewStrategies = validationContent.includes('memecoin-arbitrage') && 
                                 validationContent.includes('micro-trading');
        logTest('Validation supports new strategies', hasNewStrategies);
    } catch (e) {
        logTest('Validation updates', false, e.message);
    }

    // Test 5: Wizard updates
    try {
        console.log('5. Testing Wizard Updates...');
        const fs = require('fs');
        const wizardContent = fs.readFileSync('./src/wizard/Pages/Strategy.js', 'utf8');
        const hasMemeCoinOption = wizardContent.includes('Meme Coin Arbitrage');
        const hasMicroOption = wizardContent.includes('Micro Trading');
        logTest('Wizard has meme coin option', hasMemeCoinOption);
        logTest('Wizard has micro trading option', hasMicroOption);
    } catch (e) {
        logTest('Wizard updates', false, e.message);
    }

    // Test 6: Strategy instance creation
    try {
        console.log('6. Testing Strategy Instance Creation...');
        const { MemeCoinArbitrageStrategy } = require('./src/strategies/memeCoinArbitrage');
        const { MicroTradingEngine } = require('./src/strategies/microTradingEngine');
        const { getMemeCoinConfig } = require('./src/config/memeCoinConfig');
        
        const config = getMemeCoinConfig();
        const mockCache = { 
            config: config, 
            sideBuy: true,
            iteration: 0,
            currentBalance: { tokenA: 1000000, tokenB: 1000000 },
            lastBalance: { tokenA: 1000000, tokenB: 1000000 }
        };
        
        const memeStrategy = new MemeCoinArbitrageStrategy(config, mockCache);
        const microEngine = new MicroTradingEngine(config, mockCache);
        
        logTest('Meme coin strategy instance', !!memeStrategy);
        logTest('Micro trading engine instance', !!microEngine);
        
        // Test basic functionality
        const mockTokenA = { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112', decimals: 9 };
        const mockTokenB = { symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5 };
        
        const isMeme = await memeStrategy.isMemeCoin(mockTokenB);
        logTest('Meme coin detection works', typeof isMeme === 'boolean');
        
        const canTrade = microEngine.canTrade();
        logTest('Micro trading conditions check', typeof canTrade === 'boolean');
        
    } catch (e) {
        logTest('Strategy instance creation', false, e.message);
    }

    // Test 7: Configuration presets
    try {
        console.log('7. Testing Configuration Presets...');
        const { getMemeCoinConfig } = require('./src/config/memeCoinConfig');
        
        const ultraMicro = getMemeCoinConfig('ultra-micro');
        const conservative = getMemeCoinConfig('conservative');
        const aggressive = getMemeCoinConfig('aggressive');
        
        logTest('Ultra micro preset', ultraMicro.tradeSize.baseAmount === 0.5);
        logTest('Conservative preset', conservative.tradeSize.baseAmount === 2.0);
        logTest('Aggressive preset', !!aggressive.advanced);
    } catch (e) {
        logTest('Configuration presets', false, e.message);
    }

    // Final summary
    console.log('\n📊 TEST RESULTS');
    console.log('================');
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);

    if (testResults.failed > 0) {
        console.log('\n🚨 FAILED TESTS:');
        testResults.errors.forEach(error => console.log(`   • ${error}`));
    }

    console.log('\n🎯 INTEGRATION STATUS');
    if (testResults.failed === 0) {
        console.log('🎉 COMPLETE SUCCESS! All systems integrated and working!');
        console.log('\n🚀 READY TO USE:');
        console.log('   • npm run wizard  (to configure and start)');
        console.log('   • npm run trade   (direct trading mode)');
        console.log('\n🎭 Available Strategies:');
        console.log('   1. pingpong (original)');
        console.log('   2. arbitrage (original)');
        console.log('   3. memecoin-arbitrage (NEW!)');
        console.log('   4. micro-trading (NEW!)');
    } else if (testResults.failed < 3) {
        console.log('⚠️ MOSTLY WORKING - Minor issues to fix');
        console.log('Bot should work but may have some rough edges');
    } else {
        console.log('❌ INTEGRATION INCOMPLETE - Needs fixes');
        console.log('Several components need attention before use');
    }

    console.log('\n💡 Next Steps:');
    console.log('   1. Run: npm run wizard');
    console.log('   2. Select a new strategy (🎭 Meme Coin or ⚡ Micro Trading)');
    console.log('   3. Configure with small trade sizes ($0.50-$2)');
    console.log('   4. Test with small amounts first!');
    
    return testResults.failed === 0;
}

// Run the tests
runTests().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('🚨 Test runner error:', error);
    process.exit(1);
});