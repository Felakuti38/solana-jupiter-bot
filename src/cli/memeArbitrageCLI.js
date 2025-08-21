const { render, Box, Text, useInput, useApp } = require('ink');
const SelectInput = require('ink-select-input').default;
const TextInput = require('ink-text-input').default;
const Spinner = require('ink-spinner').default;
const React = require('react');
const MemeArbitrageBot = require('../bot/memeArbitrageBot');
const { mergeConfig, validateConfig, CONFIG_PRESETS } = require('../config/memeArbitrageConfig');

// Main CLI component
const MemeArbitrageCLI = () => {
    const [state, setState] = React.useState({
        currentScreen: 'welcome',
        config: null,
        bot: null,
        isRunning: false,
        stats: null,
        error: null
    });

    const { exit } = useApp();

    // Handle keyboard input
    useInput((input, key) => {
        if (key.escape || input === 'q') {
            if (state.isRunning) {
                stopBot();
            } else {
                exit();
            }
        }
        
        if (key.return && state.currentScreen === 'welcome') {
            setState(prev => ({ ...prev, currentScreen: 'config' }));
        }
    });

    const startBot = async (config) => {
        try {
            setState(prev => ({ ...prev, error: null }));
            
            const bot = new MemeArbitrageBot(config);
            const initialized = await bot.initialize();
            
            if (!initialized) {
                throw new Error('Failed to initialize bot');
            }
            
            setState(prev => ({ 
                ...prev, 
                bot, 
                config,
                isRunning: true,
                currentScreen: 'trading'
            }));
            
            // Start the bot
            await bot.start();
            
            // Start stats monitoring
            startStatsMonitoring(bot);
            
        } catch (error) {
            setState(prev => ({ 
                ...prev, 
                error: error.message,
                currentScreen: 'error'
            }));
        }
    };

    const stopBot = async () => {
        if (state.bot) {
            await state.bot.stop();
        }
        
        setState(prev => ({ 
            ...prev, 
            isRunning: false,
            currentScreen: 'config'
        }));
    };

    const startStatsMonitoring = (bot) => {
        const interval = setInterval(() => {
            if (bot && bot.dailyStats) {
                setState(prev => ({ 
                    ...prev, 
                    stats: { ...bot.dailyStats },
                    tradeHistory: bot.tradeHistory ? [...bot.tradeHistory] : []
                }));
            }
        }, 2000);
        
        // Cleanup interval when component unmounts
        return () => clearInterval(interval);
    };

    // Render different screens
    switch (state.currentScreen) {
        case 'welcome':
            return <WelcomeScreen onStart={() => setState(prev => ({ ...prev, currentScreen: 'config' }))} />;
        case 'config':
            return <ConfigScreen onStart={startBot} />;
        case 'trading':
            return <TradingScreen 
                bot={state.bot}
                stats={state.stats}
                onStop={stopBot}
            />;
        case 'error':
            return <ErrorScreen 
                error={state.error}
                onBack={() => setState(prev => ({ ...prev, currentScreen: 'config', error: null }))}
            />;
        default:
            return <WelcomeScreen onStart={() => setState(prev => ({ ...prev, currentScreen: 'config' }))} />;
    }
};

// Welcome screen
const WelcomeScreen = ({ onStart }) => (
    <Box flexDirection="column" alignItems="center" padding={2}>
        <Box marginBottom={2}>
            <Text bold color="cyan">
                🚀 MEME COIN ARBITRAGE BOT 🚀
            </Text>
        </Box>
        
        <Box marginBottom={1}>
            <Text color="green">
                ⚡ Micro Trading Strategies for Maximum Profit
            </Text>
        </Box>
        
        <Box marginBottom={2}>
            <Text color="yellow">
                🎯 Automated arbitrage trading on Solana meme coins
            </Text>
        </Box>
        
        <Box marginBottom={2}>
            <Text>
                Press <Text bold color="cyan">Enter</Text> to start configuration
            </Text>
        </Box>
        
        <Box>
            <Text color="gray">
                Press <Text bold>Q</Text> to quit
            </Text>
        </Box>
    </Box>
);

// Configuration screen
const ConfigScreen = ({ onStart }) => {
    const [configStep, setConfigStep] = React.useState('preset');
    const [selectedPreset, setSelectedPreset] = React.useState('EXPERIENCED');
    const [customConfig, setCustomConfig] = React.useState({});

    const presets = [
        { label: '🐣 Newbie (Conservative)', value: 'NEWBIE' },
        { label: '👨‍💼 Experienced (Balanced)', value: 'EXPERIENCED' },
        { label: '🚀 Professional (Aggressive)', value: 'PROFESSIONAL' },
        { label: '🧪 Paper Trading (Testing)', value: 'PAPER_TRADING' }
    ];

    const handlePresetSelect = (item) => {
        setSelectedPreset(item.value);
        setConfigStep('confirm');
    };

    const handleStart = () => {
        const config = mergeConfig(CONFIG_PRESETS[selectedPreset], customConfig);
        onStart(config);
    };

    if (configStep === 'preset') {
        return (
            <Box flexDirection="column" padding={2}>
                <Box marginBottom={2}>
                    <Text bold color="cyan">Select Trading Configuration:</Text>
                </Box>
                
                <SelectInput 
                    items={presets}
                    onSelect={handlePresetSelect}
                />
                
                <Box marginTop={2}>
                    <Text color="gray">
                        Use arrow keys to navigate, Enter to select
                    </Text>
                </Box>
            </Box>
        );
    }

    if (configStep === 'confirm') {
        const preset = CONFIG_PRESETS[selectedPreset];
        return (
            <Box flexDirection="column" padding={2}>
                <Box marginBottom={2}>
                    <Text bold color="cyan">Configuration Summary:</Text>
                </Box>
                
                <Box marginBottom={1}>
                    <Text>📊 Trading Mode: <Text bold>{preset.tradingMode}</Text></Text>
                </Box>
                
                <Box marginBottom={1}>
                    <Text>💰 Trade Size: <Text bold>${preset.tradeSize}</Text></Text>
                </Box>
                
                <Box marginBottom={1}>
                    <Text>🎯 Min Profit: <Text bold>{preset.minProfitPercent}%</Text></Text>
                </Box>
                
                <Box marginBottom={1}>
                    <Text>⚡ Max Slippage: <Text bold>{preset.maxSlippage}%</Text></Text>
                </Box>
                
                <Box marginBottom={1}>
                    <Text>🛡️ Risk Level: <Text bold>{preset.riskLevel}</Text></Text>
                </Box>
                
                <Box marginBottom={2}>
                    <Text>🔄 Scan Interval: <Text bold>{preset.scanInterval}ms</Text></Text>
                </Box>
                
                <Box marginBottom={2}>
                    <Text color="yellow">
                        Press <Text bold>Enter</Text> to start bot
                    </Text>
                </Box>
                
                <Box>
                    <Text color="gray">
                        Press <Text bold>Backspace</Text> to go back
                    </Text>
                </Box>
            </Box>
        );
    }
};

// Trading screen
const TradingScreen = ({ bot, stats, onStop }) => {
    const [showHistory, setShowHistory] = React.useState(false);

    useInput((input, key) => {
        if (input === 'h') {
            setShowHistory(!showHistory);
        }
        if (input === 's') {
            onStop();
        }
    });

    if (!stats) {
        return (
            <Box flexDirection="column" alignItems="center" padding={2}>
                <Spinner type="dots" />
                <Text>Initializing bot...</Text>
            </Box>
        );
    }

    return (
        <Box flexDirection="column" padding={1}>
            {/* Header */}
            <Box marginBottom={1}>
                <Text bold color="green">🤖 MEME ARBITRAGE BOT - ACTIVE</Text>
            </Box>
            
            {/* Stats Grid */}
            <Box flexDirection="row" marginBottom={1}>
                <Box width="50%" flexDirection="column">
                    <Text color="cyan">📈 Performance:</Text>
                    <Text>  Trades: <Text bold>{stats.trades}</Text></Text>
                    <Text>  Wins: <Text bold color="green">{stats.wins || 0}</Text></Text>
                    <Text>  Losses: <Text bold color="red">{stats.losses || 0}</Text></Text>
                    <Text>  Win Rate: <Text bold>{stats.trades > 0 ? ((stats.wins || 0) / stats.trades * 100).toFixed(1) : 0}%</Text></Text>
                </Box>
                
                <Box width="50%" flexDirection="column">
                    <Text color="cyan">💰 Financial:</Text>
                    <Text>  Total Profit: <Text bold color={stats.profit >= 0 ? "green" : "red"}>${stats.profit.toFixed(4)}</Text></Text>
                    <Text>  Total Volume: <Text bold>${stats.totalVolume.toFixed(2)}</Text></Text>
                    <Text>  Active Trades: <Text bold>{bot?.activeTrades?.size || 0}</Text></Text>
                </Box>
            </Box>
            
            {/* Runtime */}
            <Box marginBottom={1}>
                <Text color="yellow">
                    🕒 Runtime: {Math.floor((Date.now() - stats.startTime) / 1000)}s
                </Text>
            </Box>
            
            {/* Controls */}
            <Box marginTop={1}>
                <Text color="gray">
                    <Text bold>H</Text> - Toggle History | <Text bold>S</Text> - Stop Bot | <Text bold>Q</Text> - Quit
                </Text>
            </Box>
            
            {/* Trade History */}
            {showHistory && bot?.tradeHistory && (
                <Box marginTop={1} flexDirection="column">
                    <Text color="cyan" bold>📋 Recent Trades:</Text>
                    {bot.tradeHistory.slice(-5).map((trade, index) => (
                        <Box key={index} marginLeft={2}>
                            <Text>
                                {trade.profit > 0 ? '✅' : '❌'} {trade.memeCoin}: 
                                <Text color={trade.profit > 0 ? "green" : "red"}> ${trade.profit.toFixed(4)}</Text>
                                <Text color="gray"> ({trade.profitPercent.toFixed(2)}%)</Text>
                            </Text>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
};

// Error screen
const ErrorScreen = ({ error, onBack }) => (
    <Box flexDirection="column" alignItems="center" padding={2}>
        <Box marginBottom={2}>
            <Text bold color="red">❌ Error Occurred</Text>
        </Box>
        
        <Box marginBottom={2}>
            <Text color="red">{error}</Text>
        </Box>
        
        <Box>
            <Text color="gray">
                Press <Text bold>Backspace</Text> to go back
            </Text>
        </Box>
    </Box>
);

// Main CLI entry point
const runCLI = () => {
    render(<MemeArbitrageCLI />);
};

module.exports = { runCLI, MemeArbitrageCLI };