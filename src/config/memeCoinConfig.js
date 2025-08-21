/**
 * Meme Coin Trading Configuration
 * Optimized settings for micro trading meme coins on Solana
 */

const { TOKEN_ADDRESSES, AMM_STRATEGIES, SAFETY_LEVELS } = require("../utils/constants");

const MEME_COIN_CONFIG = {
	// Network settings
	network: "mainnet",
	
	// Trading strategy
	tradingStrategy: "memecoin-arbitrage", // New strategy type
	
	// Token configuration for meme coins
	tokens: {
		// Primary token (usually SOL or USDC for liquidity)
		tokenA: {
			address: TOKEN_ADDRESSES.SOL,
			symbol: "SOL",
			decimals: 9,
			role: "base" // Base token for trading pairs
		},
		// Secondary token (auto-detected meme coins or specific target)
		tokenB: {
			address: "AUTO_DETECT", // Will be auto-detected based on meme coin criteria
			symbol: "AUTO",
			decimals: 6,
			role: "target" // Target meme coin
		}
	},

	// Trade size configuration optimized for micro trading
	tradeSize: {
		strategy: "adaptive", // adaptive, fixed, percentage
		baseAmount: 1.0, // $1.00 base trade size
		minAmount: 0.5,  // $0.50 minimum
		maxAmount: 5.0,  // $5.00 maximum
		scaleWithVolatility: true,
		scaleWithLiquidity: true
	},

	// Profit targets for meme coin trading
	profit: {
		minPercProfit: 0.8,    // 0.8% minimum profit for meme coins
		targetPercProfit: 2.0,  // 2% target profit
		maxPercProfit: 15.0,    // 15% maximum (take profit)
		adaptiveTargets: true   // Adjust based on volatility
	},

	// Slippage settings for meme coins
	slippage: {
		base: 100,              // 1% base slippage
		max: 300,               // 3% maximum slippage
		adaptive: true,         // Adjust based on liquidity
		volatilityMultiplier: 1.5 // Increase with volatility
	},

	// Priority fee for fast execution
	priority: 5000, // 5000 micro lamports for meme coin speed

	// Advanced settings
	advanced: {
		ammStrategy: "FAST",        // Use fastest DEXes only
		safetyLevel: "FAST",        // Minimal safety checks for speed
		minInterval: 200,           // 200ms minimum between trades
		maxConcurrentTrades: 1,     // One trade at a time for micro amounts
		enableBatching: false,      // Disable batching for micro trades
		
		// Risk management
		maxRiskPerTrade: 0.02,      // 2% max risk per trade
		maxDailyLoss: 0.10,         // 10% daily loss limit
		maxConsecutiveLosses: 5,    // Stop after 5 consecutive losses
		
		// Performance optimization
		routeCaching: true,         // Cache routes for speed
		priceUpdateInterval: 500,   // Update prices every 500ms
		healthCheckInterval: 30000, // Health check every 30s
		
		// Meme coin specific
		memeCoinDetection: true,    // Enable automatic meme coin detection
		socialSentiment: false,     // Disable social sentiment (for now)
		trendingOnly: true         // Only trade trending meme coins
	},

	// Meme coin specific configuration
	memeCoin: {
		// Detection criteria
		detection: {
			marketCapMin: 100000,     // $100K minimum market cap
			marketCapMax: 50000000,   // $50M maximum market cap
			volumeMin: 10000,         // $10K minimum 24h volume
			liquidityMin: 25000,      // $25K minimum liquidity
			ageMaxDays: 90,           // Maximum 90 days old
			socialScoreMin: 20,       // Minimum social activity score
			
			// Keywords for meme coin detection
			keywords: [
				'doge', 'shib', 'pepe', 'wojak', 'chad', 'bonk', 'floki',
				'moon', 'rocket', 'diamond', 'ape', 'baby', 'mini', 'elon',
				'trump', 'biden', 'cat', 'dog', 'frog', 'bear', 'bull',
				'meme', 'coin', 'token', 'inu', 'shiba', 'akita', 'safe'
			],
			
			// Exclusion patterns
			excludeKeywords: [
				'scam', 'rug', 'fake', 'clone', 'copy', 'test'
			]
		},

		// Risk assessment
		riskAssessment: {
			checkRugPull: true,       // Check for rug pull indicators
			checkLiquidity: true,     // Verify liquidity depth
			checkHolderDistribution: true, // Check token distribution
			maxConcentration: 0.5,    // Max 50% held by top 10 wallets
			minHolders: 100,          // Minimum 100 holders
			
			// Contract analysis
			verifyContract: false,    // Skip contract verification for speed
			checkMintAuthority: true, // Check if mint authority is disabled
			checkFreezeAuthority: true // Check if freeze authority is disabled
		},

		// Micro trading optimizations
		microTrading: {
			minTradeSize: 0.5,        // $0.50 minimum
			maxTradeSize: 2.0,        // $2.00 maximum for meme coins
			optimalTradeSize: 1.0,    // $1.00 optimal size
			
			// Execution settings
			maxLatency: 150,          // 150ms max execution time
			priorityFee: 8000,        // Higher priority for meme coin speed
			fastMode: true,           // Enable fast mode
			
			// Profit settings
			minProfitPercent: 0.5,    // 0.5% minimum for micro trades
			targetProfitPercent: 1.5, // 1.5% target
			maxProfitPercent: 10.0,   // 10% take profit
			
			// Risk settings
			maxSlippagePercent: 2.5,  // 2.5% max slippage for meme coins
			maxConsecutiveLosses: 3,  // Lower threshold for meme coins
			dailyLossLimit: 0.05,     // 5% daily loss limit
			
			// Frequency
			minIntervalMs: 100,       // 100ms between trades
			maxTradesPerMinute: 20,   // 20 trades per minute max
			cooldownAfterLoss: 3000,  // 3s cooldown after loss
			
			// Batching
			enableBatching: false,    // Disable for micro amounts
			batchSize: 1,             // Single trades only
			batchTimeoutMs: 500       // 500ms batch timeout
		}
	},

	// Monitoring and alerts
	monitoring: {
		enableLogging: true,
		logLevel: "info",
		enableMetrics: true,
		enableAlerts: true,
		
		// Performance thresholds
		maxLatencyMs: 200,
		minSuccessRate: 0.8,
		maxErrorRate: 0.2,
		
		// Alert conditions
		alerts: {
			consecutiveLosses: 3,
			dailyLossPercent: 5,
			lowSuccessRate: 0.7,
			highLatency: 300
		}
	}
};

// Preset configurations for different meme coin trading styles
const MEME_COIN_PRESETS = {
	// Ultra micro trading - $0.50 trades
	"ultra-micro": {
		...MEME_COIN_CONFIG,
		tradeSize: {
			...MEME_COIN_CONFIG.tradeSize,
			baseAmount: 0.5,
			minAmount: 0.25,
			maxAmount: 1.0
		},
		profit: {
			...MEME_COIN_CONFIG.profit,
			minPercProfit: 1.0,
			targetPercProfit: 2.5
		},
		memeCoin: {
			...MEME_COIN_CONFIG.memeCoin,
			microTrading: {
				...MEME_COIN_CONFIG.memeCoin.microTrading,
				minTradeSize: 0.25,
				maxTradeSize: 1.0,
				optimalTradeSize: 0.5,
				minProfitPercent: 1.0,
				targetProfitPercent: 2.5
			}
		}
	},

	// Conservative micro trading - $2 trades
	"conservative": {
		...MEME_COIN_CONFIG,
		tradeSize: {
			...MEME_COIN_CONFIG.tradeSize,
			baseAmount: 2.0,
			minAmount: 1.0,
			maxAmount: 5.0
		},
		profit: {
			...MEME_COIN_CONFIG.profit,
			minPercProfit: 0.5,
			targetPercProfit: 1.5
		},
		advanced: {
			...MEME_COIN_CONFIG.advanced,
			safetyLevel: "BALANCED",
			maxRiskPerTrade: 0.01,
			maxConsecutiveLosses: 3
		}
	},

	// Aggressive micro trading - higher frequency
	"aggressive": {
		...MEME_COIN_CONFIG,
		advanced: {
			...MEME_COIN_CONFIG.advanced,
			minInterval: 100,
			maxConcurrentTrades: 2
		},
		memeCoin: {
			...MEME_COIN_CONFIG.memeCoin,
			microTrading: {
				...MEME_COIN_CONFIG.memeCoin.microTrading,
				minIntervalMs: 50,
				maxTradesPerMinute: 30,
				maxSlippagePercent: 3.0,
				minProfitPercent: 0.3
			}
		}
	},

	// High-volume meme coin trading
	"high-volume": {
		...MEME_COIN_CONFIG,
		tradeSize: {
			...MEME_COIN_CONFIG.tradeSize,
			baseAmount: 5.0,
			minAmount: 2.0,
			maxAmount: 10.0
		},
		memeCoin: {
			...MEME_COIN_CONFIG.memeCoin,
			detection: {
				...MEME_COIN_CONFIG.memeCoin.detection,
				volumeMin: 100000, // $100K minimum volume
				liquidityMin: 100000 // $100K minimum liquidity
			}
		}
	}
};

// Helper function to get configuration by preset name
function getMemeCoinConfig(preset = 'default') {
	if (preset === 'default') {
		return MEME_COIN_CONFIG;
	}
	
	return MEME_COIN_PRESETS[preset] || MEME_COIN_CONFIG;
}

// Helper function to validate meme coin configuration
function validateMemeCoinConfig(config) {
	const errors = [];

	// Validate trade sizes
	if (config.tradeSize.minAmount > config.tradeSize.maxAmount) {
		errors.push('Minimum trade size cannot be greater than maximum trade size');
	}

	// Validate profit settings
	if (config.profit.minPercProfit > config.profit.targetPercProfit) {
		errors.push('Minimum profit cannot be greater than target profit');
	}

	// Validate slippage settings
	if (config.slippage.base > config.slippage.max) {
		errors.push('Base slippage cannot be greater than maximum slippage');
	}

	// Validate meme coin detection settings
	if (config.memeCoin.detection.marketCapMin > config.memeCoin.detection.marketCapMax) {
		errors.push('Minimum market cap cannot be greater than maximum market cap');
	}

	return {
		isValid: errors.length === 0,
		errors: errors
	};
}

module.exports = {
	MEME_COIN_CONFIG,
	MEME_COIN_PRESETS,
	getMemeCoinConfig,
	validateMemeCoinConfig
};