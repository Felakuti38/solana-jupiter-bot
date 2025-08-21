/**
 * Validation utilities for the Solana Jupiter Bot
 * Provides input validation, environment validation, and configuration validation
 */

const bs58 = require("bs58");
const { TRADING_CONSTANTS } = require("./constants");
const logger = require("./logger");

/**
 * Validate environment variables
 */
const validateEnvironment = () => {
	const required = [
		'SOLANA_WALLET_PRIVATE_KEY',
		'DEFAULT_RPC'
	];
	
	const missing = required.filter(key => !process.env[key]);
	
	if (missing.length > 0) {
		throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
	}
	
	// Validate private key format
	try {
		bs58.decode(process.env.SOLANA_WALLET_PRIVATE_KEY);
	} catch {
		throw new Error('Invalid SOLANA_WALLET_PRIVATE_KEY format');
	}
	
	// Validate RPC URL
	try {
		new URL(process.env.DEFAULT_RPC);
	} catch {
		throw new Error('Invalid DEFAULT_RPC URL format');
	}

	logger.info('Environment validation passed');
};

/**
 * Validate slippage value
 */
const validateSlippage = (slippage) => {
	if (typeof slippage !== 'number') {
		throw new Error('Slippage must be a number');
	}
	
	if (slippage < 0 || slippage > TRADING_CONSTANTS.MAX_SLIPPAGE) {
		throw new Error(`Slippage must be between 0 and ${TRADING_CONSTANTS.MAX_SLIPPAGE}`);
	}
	
	return true;
};

/**
 * Validate profit percentage
 */
const validateProfitPercentage = (profit) => {
	if (typeof profit !== 'number') {
		throw new Error('Profit percentage must be a number');
	}
	
	if (profit < 0 || profit > 100) {
		throw new Error('Profit percentage must be between 0 and 100');
	}
	
	return true;
};

/**
 * Validate trade size
 */
const validateTradeSize = (size, balance) => {
	if (typeof size !== 'number' || size <= 0) {
		throw new Error('Trade size must be a positive number');
	}
	
	if (size > balance) {
		throw new Error('Trade size cannot exceed available balance');
	}
	
	if (size < balance * TRADING_CONSTANTS.MIN_POSITION_SIZE) {
		throw new Error(`Trade size must be at least ${TRADING_CONSTANTS.MIN_POSITION_SIZE * 100}% of balance`);
	}
	
	if (size > balance * TRADING_CONSTANTS.MAX_POSITION_SIZE) {
		throw new Error(`Trade size cannot exceed ${TRADING_CONSTANTS.MAX_POSITION_SIZE * 100}% of balance`);
	}
	
	return true;
};

/**
 * Validate token address format
 */
const validateTokenAddress = (address) => {
	if (!address || typeof address !== 'string') {
		throw new Error('Token address must be a non-empty string');
	}
	
	if (address.length !== 44) {
		throw new Error('Token address must be 44 characters long');
	}
	
	try {
		bs58.decode(address);
	} catch {
		throw new Error('Invalid token address format');
	}
	
	return true;
};

/**
 * Validate configuration object
 */
const validateConfig = (config) => {
	const errors = [];
	
	// Validate network
	if (!config.network || !['mainnet', 'devnet', 'testnet'].includes(config.network)) {
		errors.push('Invalid network configuration');
	}
	
	// Validate RPC
	if (!config.rpc || !Array.isArray(config.rpc) || config.rpc.length === 0) {
		errors.push('Invalid RPC configuration');
	}
	
	// Validate strategy
	if (!config.tradingStrategy || !['pingpong', 'arbitrage'].includes(config.tradingStrategy)) {
		errors.push('Invalid trading strategy');
	}
	
	// Validate tokens
	if (!config.tokenA || !config.tokenA.address || !config.tokenA.symbol) {
		errors.push('Invalid token A configuration');
	}
	
	if (config.tradingStrategy === 'pingpong' && (!config.tokenB || !config.tokenB.address || !config.tokenB.symbol)) {
		errors.push('Invalid token B configuration for pingpong strategy');
	}
	
	// Validate slippage
	try {
		validateSlippage(config.slippage);
	} catch (error) {
		errors.push(`Slippage validation failed: ${error.message}`);
	}
	
	// Validate profit
	try {
		validateProfitPercentage(config.minPercProfit);
	} catch (error) {
		errors.push(`Profit validation failed: ${error.message}`);
	}
	
	// Validate trade size
	if (!config.tradeSize || typeof config.tradeSize.value !== 'number' || config.tradeSize.value <= 0) {
		errors.push('Invalid trade size configuration');
	}
	
	if (errors.length > 0) {
		throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
	}
	
	logger.info('Configuration validation passed');
	return true;
};

/**
 * Validate safety level
 */
const validateSafetyLevel = (level) => {
	const validLevels = ['FAST', 'BALANCED', 'SAFE'];
	
	if (!validLevels.includes(level)) {
		throw new Error(`Invalid safety level. Must be one of: ${validLevels.join(', ')}`);
	}
	
	return true;
};

/**
 * Validate AMM strategy
 */
const validateAMMStrategy = (strategy) => {
	const validStrategies = ['FAST', 'OPTIMIZED', 'COMPREHENSIVE'];
	
	if (!validStrategies.includes(strategy)) {
		throw new Error(`Invalid AMM strategy. Must be one of: ${validStrategies.join(', ')}`);
	}
	
	return true;
};

/**
 * Sanitize user input
 */
const sanitizeInput = (input) => {
	if (typeof input === 'string') {
		// Remove potentially dangerous characters
		return input.replace(/[<>\"'&]/g, '');
	}
	return input;
};

/**
 * Validate and sanitize all inputs
 */
const validateAndSanitizeInputs = (inputs) => {
	const sanitized = {};
	
	for (const [key, value] of Object.entries(inputs)) {
		try {
			sanitized[key] = sanitizeInput(value);
		} catch (error) {
			logger.warn(`Failed to sanitize input ${key}`, { error: error.message });
			sanitized[key] = value; // Keep original if sanitization fails
		}
	}
	
	return sanitized;
};

module.exports = {
	validateEnvironment,
	validateSlippage,
	validateProfitPercentage,
	validateTradeSize,
	validateTokenAddress,
	validateConfig,
	validateSafetyLevel,
	validateAMMStrategy,
	sanitizeInput,
	validateAndSanitizeInputs
};