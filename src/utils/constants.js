/**
 * Centralized constants for the Solana Jupiter Bot
 * Replaces magic numbers and hardcoded values throughout the codebase
 */

const TRADING_CONSTANTS = {
	// Supply and token validation
	MIN_SUPPLY: 1000000,
	MAX_DECIMALS: 18,
	
	// Slippage configuration
	MAX_SLIPPAGE: 500,
	SLIPPAGE_MULTIPLIER: 0.3,
	SLIPPAGE_REDUCTION_FACTOR: 0.8,
	
	// Safety thresholds
	MIN_LIQUIDITY_SCORE: 30,
	MIN_VOLUME_24H: 1000,
	MAX_RISK_SCORE: 70,
	
	// Error handling
	MAX_ERRORS: 100,
	MAX_CONSECUTIVE_FAILURES: 10,
	
	// Performance and caching
	ROUTE_CACHE_TTL: 5000, // 5 seconds
	API_RATE_LIMIT: 10, // requests per second
	API_TIME_WINDOW: 1000, // milliseconds
	
	// Health checks
	HEALTH_CHECK_INTERVAL: 30000, // 30 seconds
	METRICS_UPDATE_INTERVAL: 5000, // 5 seconds
	
	// Position sizing
	MAX_RISK_PER_TRADE: 0.02, // 2%
	MAX_POSITION_SIZE: 0.1, // 10% of balance
	MIN_POSITION_SIZE: 0.01, // 1% of balance
	
	// Fee thresholds
	MAX_FEE_PERCENTAGE: 5, // 5% of trade amount
	EXCESSIVE_FEE_THRESHOLD: 0.1, // 10% of trade amount
};

const SAFETY_LEVELS = {
	FAST: {
		preChecks: false,
		simulation: false,
		contractAnalysis: false,
		minLiquidity: 0,
		minVolume: 0,
		maxRiskScore: 100,
		description: 'Fast execution, minimal safety checks'
	},
	BALANCED: {
		preChecks: true,
		simulation: true,
		contractAnalysis: false,
		minLiquidity: 30,
		minVolume: 1000,
		maxRiskScore: 70,
		description: 'Balanced safety and performance'
	},
	SAFE: {
		preChecks: true,
		simulation: true,
		contractAnalysis: true,
		minLiquidity: 50,
		minVolume: 10000,
		maxRiskScore: 50,
		description: 'Maximum safety, slower execution'
	}
};

const AMM_STRATEGIES = {
	FAST: {
		enabled: ['Raydium', 'Orca', 'Openbook'], // Removed 'Raydium CLMM' to prevent loop route issues
		description: 'Fastest execution, major DEXes only (CLMM-safe)',
		expectedLatency: 100, // ms
		expectedSuccessRate: 0.95
	},
	FAST_WITH_CLMM: {
		enabled: ['Raydium', 'Raydium CLMM', 'Orca', 'Openbook'],
		description: 'Fastest execution including CLMM (may have loop route issues)',
		expectedLatency: 100, // ms
		expectedSuccessRate: 0.90
	},
	OPTIMIZED: {
		enabled: [
			'Raydium', 'Raydium CLMM', 'Orca', 'Orca (Whirlpools)', 
			'Openbook', 'Phoenix', 'Meteora', 'Lifinity', 'Lifinity V2',
			'Saber', 'Mercurial'
		],
		description: 'Balanced speed and liquidity',
		expectedLatency: 200, // ms
		expectedSuccessRate: 0.92
	},
	COMPREHENSIVE: {
		enabled: [
			'Raydium', 'Raydium CLMM', 'Orca', 'Orca (Whirlpools)',
			'Openbook', 'Phoenix', 'Meteora', 'Lifinity', 'Lifinity V2',
			'Saber', 'Mercurial', 'Aldrin', 'Crema', 'DeltaFi', 'Invariant',
			'Penguin', 'Saros', 'Sencha', 'Marco Polo', 'Oasis', 'BonkSwap'
		],
		description: 'Maximum coverage, slower execution',
		expectedLatency: 500, // ms
		expectedSuccessRate: 0.88
	}
};

const ERROR_CODES = {
	INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
	SLIPPAGE_EXCEEDED: 'SLIPPAGE_EXCEEDED',
	ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
	TRANSACTION_FAILED: 'TRANSACTION_FAILED',
	RPC_ERROR: 'RPC_ERROR',
	SAFETY_CHECK_FAILED: 'SAFETY_CHECK_FAILED',
	RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
	NETWORK_ERROR: 'NETWORK_ERROR',
	VALIDATION_ERROR: 'VALIDATION_ERROR'
};

const TRADE_STATUS = {
	PENDING: 'PENDING',
	EXECUTING: 'EXECUTING',
	SUCCESS: 'SUCCESS',
	FAILED: 'FAILED',
	CANCELLED: 'CANCELLED'
};

const PERFORMANCE_THRESHOLDS = {
	ROUTE_COMPUTATION_MAX_MS: 1000,
	SWAP_EXECUTION_MAX_MS: 5000,
	API_RESPONSE_MAX_MS: 2000,
	MIN_SUCCESS_RATE: 0.85,
	MAX_ERROR_RATE: 0.15
};

const RPC_ENDPOINTS = {
	// Premium RPCs
	HELIUS: 'https://mainnet.helius-rpc.com/?api-key=YOUR_KEY',
	GS_NODE: 'https://rpc.gsnode.io',
	CHAINSTACK: 'https://solana-mainnet.chainstacklabs.com',
	QUICKNODE: 'https://solana-mainnet.rpc.quicknode.com',
	
	// Free/Public RPCs
	ANKR: 'https://rpc.ankr.com/solana',
	DRPC: 'https://solana.drpc.org/',
	LEORPC: 'https://solana.leorpc.com/?api_key=FREE',
	SOLANA_FOUNDATION: 'https://api.mainnet-beta.solana.com',
	PROJECT_SERUM: 'https://solana-api.projectserum.com'
};

const TOKEN_ADDRESSES = {
	USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
	USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
	SOL: 'So11111111111111111111111111111111111111112',
	BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
	JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
	RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'
};

const TOKEN_DECIMALS = {
	USDC: 6,
	USDT: 6,
	SOL: 9,
	BONK: 5,
	JUP: 6,
	RAY: 6
};

module.exports = {
	TRADING_CONSTANTS,
	SAFETY_LEVELS,
	AMM_STRATEGIES,
	ERROR_CODES,
	TRADE_STATUS,
	PERFORMANCE_THRESHOLDS,
	RPC_ENDPOINTS,
	TOKEN_ADDRESSES,
	TOKEN_DECIMALS
};