/**
 * Enhanced security utilities for the Solana Jupiter Bot
 */

const { PublicKey } = require("@solana/web3.js");
const axios = require("axios");

/**
 * Enhanced input validation and sanitization
 */
const sanitizeInput = (input) => {
	if (typeof input !== "string") {
		return input;
	}
	
	// Remove potentially dangerous characters and patterns
	return input
		.replace(/[<>"'&]/g, "")
		.replace(/javascript:/gi, "")
		.replace(/data:/gi, "")
		.replace(/vbscript:/gi, "")
		.trim();
};

/**
 * Validate Solana address format
 */
const validateSolanaAddress = (address) => {
	try {
		if (typeof address !== "string" || address.length !== 44) {
			return false;
		}
		new PublicKey(address);
		return true;
	} catch {
		return false;
	}
};

/**
 * Rate limiting utility
 */
class RateLimiter {
	constructor(maxRequests = 10, timeWindow = 1000) {
		this.maxRequests = maxRequests;
		this.timeWindow = timeWindow;
		this.requests = [];
	}

	async checkLimit() {
		const now = Date.now();
		this.requests = this.requests.filter(time => now - time < this.timeWindow);
		
		if (this.requests.length >= this.maxRequests) {
			const oldestRequest = this.requests[0];
			const waitTime = this.timeWindow - (now - oldestRequest);
			await new Promise(resolve => setTimeout(resolve, waitTime));
		}
		
		this.requests.push(now);
		return true;
	}
}

/**
 * Enhanced token validation
 */
const validateToken = async (tokenAddress, connection) => {
	try {
		if (!validateSolanaAddress(tokenAddress)) {
			return { valid: false, reason: "Invalid address format" };
		}

		const tokenPublicKey = new PublicKey(tokenAddress);
		const accountInfo = await connection.getAccountInfo(tokenPublicKey);
		
		if (!accountInfo) {
			return { valid: false, reason: "Token account not found" };
		}

		// Check if it's a valid SPL token
		if (accountInfo.data.length < 82) {
			return { valid: false, reason: "Invalid token data" };
		}

		return { valid: true };
	} catch (error) {
		return { valid: false, reason: error.message };
	}
};

/**
 * Transaction simulation with enhanced safety
 */
const simulateTransactionSafely = async (connection, transaction, commitment = "confirmed") => {
	try {
		const simulation = await connection.simulateTransaction(transaction, {
			commitment,
			sigVerify: false,
			replaceRecentBlockhash: true,
		});

		if (simulation.value.err) {
			return {
				success: false,
				error: simulation.value.err,
				logs: simulation.value.logs || [],
			};
		}

		return {
			success: true,
			fee: simulation.value.fee,
			logs: simulation.value.logs || [],
		};
	} catch (error) {
		return {
			success: false,
			error: error.message,
			logs: [],
		};
	}
};

/**
 * Enhanced balance validation
 */
const validateBalance = (balance, requiredAmount, tokenSymbol) => {
	if (typeof balance !== "number" || balance < 0) {
		return { valid: false, reason: "Invalid balance format" };
	}

	if (balance < requiredAmount) {
		return {
			valid: false,
			reason: `Insufficient ${tokenSymbol} balance. Required: ${requiredAmount}, Available: ${balance}`,
		};
	}

	return { valid: true };
};

/**
 * Slippage protection
 */
const validateSlippage = (slippageBps, maxSlippage = 500) => {
	if (typeof slippageBps !== "number" || slippageBps < 0) {
		return { valid: false, reason: "Invalid slippage format" };
	}

	if (slippageBps > maxSlippage) {
		return {
			valid: false,
			reason: `Slippage too high: ${slippageBps} bps (max: ${maxSlippage} bps)`,
		};
	}

	return { valid: true };
};

/**
 * Enhanced error logging
 */
const logSecurityEvent = (event, details) => {
	const timestamp = new Date().toISOString();
	console.log(`[SECURITY] ${timestamp} - ${event}:`, details);
	
	// In production, you might want to send this to a logging service
	// or security monitoring system
};

module.exports = {
	sanitizeInput,
	validateSolanaAddress,
	RateLimiter,
	validateToken,
	simulateTransactionSafely,
	validateBalance,
	validateSlippage,
	logSecurityEvent,
};