/**
 * Micro Trading Engine for High-Frequency Solana Trading
 * Optimized for small trade sizes with maximum efficiency
 */

const { PublicKey } = require("@solana/web3.js");
const JSBI = require('jsbi');
const { TRADING_CONSTANTS, AMM_STRATEGIES } = require("../utils/constants");

class MicroTradingEngine {
	constructor(config, cache) {
		this.config = config;
		this.cache = cache;
		
		// Micro trading specific settings
		this.settings = {
			// Trade sizing
			minTradeSize: config.microTrading?.minTradeSize || 0.5, // $0.50
			maxTradeSize: config.microTrading?.maxTradeSize || 5.0,  // $5.00
			optimalTradeSize: config.microTrading?.optimalTradeSize || 1.0, // $1.00
			
			// Execution speed
			maxLatency: config.microTrading?.maxLatency || 200, // 200ms max
			priorityFee: config.microTrading?.priorityFee || 5000, // Higher priority
			fastMode: config.microTrading?.fastMode !== false, // Default true
			
			// Profit thresholds
			minProfitPercent: config.microTrading?.minProfitPercent || 0.5, // 0.5%
			targetProfitPercent: config.microTrading?.targetProfitPercent || 1.5, // 1.5%
			maxProfitPercent: config.microTrading?.maxProfitPercent || 10.0, // 10%
			
			// Risk management
			maxSlippagePercent: config.microTrading?.maxSlippagePercent || 2.0, // 2%
			maxConsecutiveLosses: config.microTrading?.maxConsecutiveLosses || 5,
			dailyLossLimit: config.microTrading?.dailyLossLimit || 0.1, // 10%
			
			// Frequency controls
			minIntervalMs: config.microTrading?.minIntervalMs || 100, // 100ms between trades
			maxTradesPerMinute: config.microTrading?.maxTradesPerMinute || 30,
			cooldownAfterLoss: config.microTrading?.cooldownAfterLoss || 5000, // 5s cooldown
			
			// Batch trading
			enableBatching: config.microTrading?.enableBatching || true,
			batchSize: config.microTrading?.batchSize || 3,
			batchTimeoutMs: config.microTrading?.batchTimeoutMs || 1000
		};

		// State tracking
		this.state = {
			consecutiveLosses: 0,
			dailyPnL: 0,
			lastTradeTime: 0,
			tradesThisMinute: 0,
			minuteStartTime: Date.now(),
			isInCooldown: false,
			batchQueue: [],
			activePositions: new Map()
		};

		// Performance metrics
		this.metrics = {
			totalTrades: 0,
			successfulTrades: 0,
			totalProfit: 0,
			averageLatency: 0,
			averageProfit: 0,
			bestTrade: 0,
			worstTrade: 0,
			hourlyStats: new Map()
		};
	}

	/**
	 * Main execution method for micro trading
	 */
	async execute(jupiter, tokenA, tokenB, strategy = 'arbitrage') {
		// Check if we can trade
		if (!this.canTrade()) {
			return { success: false, reason: 'Trading conditions not met' };
		}

		const startTime = performance.now();

		try {
			// Update rate limiting
			this.updateRateLimiting();

			// Calculate optimal trade size
			const tradeSize = this.calculateOptimalTradeSize();
			
			// Determine strategy
			let result;
			switch (strategy) {
				case 'arbitrage':
					result = await this.executeArbitrage(jupiter, tokenA, tokenB, tradeSize);
					break;
				case 'pingpong':
					result = await this.executePingPong(jupiter, tokenA, tokenB, tradeSize);
					break;
				case 'scalping':
					result = await this.executeScalping(jupiter, tokenA, tokenB, tradeSize);
					break;
				default:
					result = await this.executeArbitrage(jupiter, tokenA, tokenB, tradeSize);
			}

			// Update metrics
			const latency = performance.now() - startTime;
			this.updateMetrics(result, latency);

			// Handle result
			if (result.success) {
				this.handleSuccessfulTrade(result);
			} else {
				this.handleFailedTrade(result);
			}

			return result;

		} catch (error) {
			console.error('🚨 Micro trading engine error:', error);
			this.handleFailedTrade({ error: error.message });
			return { success: false, error: error.message };
		}
	}

	/**
	 * Check if trading is allowed based on current conditions
	 */
	canTrade() {
		const now = Date.now();

		// Check cooldown
		if (this.state.isInCooldown && now < this.state.lastTradeTime + this.settings.cooldownAfterLoss) {
			return false;
		}

		// Check rate limiting
		if (this.state.tradesThisMinute >= this.settings.maxTradesPerMinute) {
			return false;
		}

		// Check minimum interval
		if (now < this.state.lastTradeTime + this.settings.minIntervalMs) {
			return false;
		}

		// Check daily loss limit
		if (Math.abs(this.state.dailyPnL) >= this.settings.dailyLossLimit) {
			console.log(`⚠️ Daily loss limit reached: ${(this.state.dailyPnL * 100).toFixed(2)}%`);
			return false;
		}

		// Check consecutive losses
		if (this.state.consecutiveLosses >= this.settings.maxConsecutiveLosses) {
			console.log(`⚠️ Too many consecutive losses: ${this.state.consecutiveLosses}`);
			return false;
		}

		return true;
	}

	/**
	 * Calculate optimal trade size based on current conditions
	 */
	calculateOptimalTradeSize() {
		let baseSize = this.settings.optimalTradeSize;

		// Adjust based on recent performance
		if (this.state.consecutiveLosses > 0) {
			// Reduce size after losses
			baseSize *= Math.pow(0.8, this.state.consecutiveLosses);
		} else if (this.metrics.successfulTrades > 5) {
			// Increase size after successes (but cap it)
			const winStreak = Math.min(this.metrics.successfulTrades - this.state.consecutiveLosses, 5);
			baseSize *= Math.min(1 + (winStreak * 0.1), 1.5);
		}

		// Adjust based on volatility
		const volatilityMultiplier = this.calculateVolatilityMultiplier();
		baseSize *= volatilityMultiplier;

		// Ensure within bounds
		baseSize = Math.max(this.settings.minTradeSize, Math.min(baseSize, this.settings.maxTradeSize));

		console.log(`💰 Calculated trade size: $${baseSize.toFixed(2)}`);
		return baseSize;
	}

	/**
	 * Calculate volatility multiplier for position sizing
	 */
	calculateVolatilityMultiplier() {
		// This would analyze recent price movements
		// For now, return a value between 0.5 and 1.5
		const recentVolatility = Math.random() * 5; // Mock 0-5% volatility
		
		if (recentVolatility > 3) {
			return 0.7; // Reduce size in high volatility
		} else if (recentVolatility < 1) {
			return 1.2; // Increase size in low volatility
		}
		
		return 1.0; // Normal size
	}

	/**
	 * Execute arbitrage strategy with micro trading optimizations
	 */
	async executeArbitrage(jupiter, tokenA, tokenB, tradeSize) {
		console.log(`🔄 Executing micro arbitrage: $${tradeSize}`);

		try {
			const amount = JSBI.BigInt(Math.floor(tradeSize * Math.pow(10, tokenA.decimals)));
			
			// Get routes with CLMM protection and speed optimization
			const [routesAB, routesBA] = await Promise.all([
				jupiter.computeRoutes({
					inputMint: new PublicKey(tokenA.address),
					outputMint: new PublicKey(tokenB.address),
					amount: amount,
					slippageBps: this.calculateDynamicSlippage(),
					forceFetch: false,
					onlyDirectRoutes: true, // Always use direct routes to prevent CLMM loops
					filterTopNResult: 1, // Single best route to avoid problematic alternatives
					enforceSingleTx: true, // Single transaction only
					excludeDexes: ['Raydium CLMM'], // Exclude problematic CLMM
				}),
				jupiter.computeRoutes({
					inputMint: new PublicKey(tokenB.address),
					outputMint: new PublicKey(tokenA.address),
					amount: amount,
					slippageBps: this.calculateDynamicSlippage(),
					forceFetch: false,
					onlyDirectRoutes: true, // Always use direct routes to prevent CLMM loops
					filterTopNResult: 1, // Single best route to avoid problematic alternatives
					enforceSingleTx: true, // Single transaction only
					excludeDexes: ['Raydium CLMM'], // Exclude problematic CLMM
				})
			]);

			// Quick profit calculation
			if (!routesAB.routesInfos?.length || !routesBA.routesInfos?.length) {
				return { success: false, reason: 'No routes found' };
			}

			const route1 = routesAB.routesInfos[0];
			const route2 = routesBA.routesInfos[0];
			
			const profit1 = this.calculateQuickProfit(amount, route1.outAmount);
			const profit2 = this.calculateQuickProfit(amount, route2.outAmount);
			const bestProfit = Math.max(profit1, profit2);

			if (bestProfit < this.settings.minProfitPercent) {
				return { success: false, reason: `Insufficient profit: ${bestProfit.toFixed(3)}%` };
			}

			// Execute the profitable direction
			const bestRoute = profit1 > profit2 ? route1 : route2;
			const direction = profit1 > profit2 ? 'A->B' : 'B->A';

			console.log(`🎯 Executing ${direction} with ${bestProfit.toFixed(3)}% profit`);

			// For now, simulate execution
			const executionResult = await this.simulateTradeExecution(bestRoute, bestProfit);

			return {
				success: executionResult.success,
				profit: bestProfit,
				direction: direction,
				tradeSize: tradeSize,
				route: bestRoute,
				...executionResult
			};

		} catch (error) {
			console.error('Arbitrage execution error:', error);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Execute ping pong strategy
	 */
	async executePingPong(jupiter, tokenA, tokenB, tradeSize) {
		console.log(`🏓 Executing micro ping pong: $${tradeSize}`);

		try {
			// Determine direction based on cache.sideBuy
			const inputToken = this.cache.sideBuy ? tokenA : tokenB;
			const outputToken = this.cache.sideBuy ? tokenB : tokenA;
			const amount = JSBI.BigInt(Math.floor(tradeSize * Math.pow(10, inputToken.decimals)));

			// Get route
			const routes = await jupiter.computeRoutes({
				inputMint: new PublicKey(inputToken.address),
				outputMint: new PublicKey(outputToken.address),
				amount: amount,
				slippageBps: this.calculateDynamicSlippage(),
				forceFetch: false,
				onlyDirectRoutes: this.settings.fastMode,
				filterTopNResult: 1,
			});

			if (!routes.routesInfos?.length) {
				return { success: false, reason: 'No routes found' };
			}

			const route = routes.routesInfos[0];
			const profit = this.calculateQuickProfit(amount, route.outAmount);

			if (profit < this.settings.minProfitPercent) {
				return { success: false, reason: `Insufficient profit: ${profit.toFixed(3)}%` };
			}

			console.log(`🎯 Ping pong ${this.cache.sideBuy ? 'buy' : 'sell'} with ${profit.toFixed(3)}% profit`);

			const executionResult = await this.simulateTradeExecution(route, profit);

			// Toggle side for next trade
			this.cache.sideBuy = !this.cache.sideBuy;

			return {
				success: executionResult.success,
				profit: profit,
				direction: this.cache.sideBuy ? 'buy' : 'sell',
				tradeSize: tradeSize,
				route: route,
				...executionResult
			};

		} catch (error) {
			console.error('Ping pong execution error:', error);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Execute scalping strategy
	 */
	async executeScalping(jupiter, tokenA, tokenB, tradeSize) {
		console.log(`⚡ Executing micro scalping: $${tradeSize}`);

		// Scalping focuses on very small, quick profits
		const originalMinProfit = this.settings.minProfitPercent;
		this.settings.minProfitPercent = 0.2; // Lower threshold for scalping

		try {
			// Use ping pong logic but with tighter spreads
			const result = await this.executePingPong(jupiter, tokenA, tokenB, tradeSize);
			
			// Restore original setting
			this.settings.minProfitPercent = originalMinProfit;
			
			if (result.success) {
				result.strategy = 'scalping';
			}

			return result;

		} catch (error) {
			this.settings.minProfitPercent = originalMinProfit;
			console.error('Scalping execution error:', error);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Calculate dynamic slippage based on market conditions
	 */
	calculateDynamicSlippage() {
		let baseSlippage = 50; // 0.5%

		// Increase slippage for micro trades
		if (this.settings.optimalTradeSize < 1.0) {
			baseSlippage *= 1.5;
		}

		// Adjust based on recent success rate
		const recentSuccessRate = this.calculateRecentSuccessRate();
		if (recentSuccessRate < 0.8) {
			baseSlippage *= 1.3; // Increase slippage if many failures
		}

		// Cap at maximum
		return Math.min(baseSlippage, this.settings.maxSlippagePercent * 100);
	}

	/**
	 * Calculate recent success rate
	 */
	calculateRecentSuccessRate() {
		if (this.metrics.totalTrades < 10) return 0.9; // Assume good rate initially
		
		return this.metrics.successfulTrades / this.metrics.totalTrades;
	}

	/**
	 * Quick profit calculation for micro trading
	 */
	calculateQuickProfit(amountIn, amountOut) {
		const inputAmount = JSBI.toNumber(amountIn);
		const outputAmount = JSBI.toNumber(amountOut);
		
		return ((outputAmount - inputAmount) / inputAmount) * 100;
	}

	/**
	 * Simulate trade execution (replace with real execution in production)
	 */
	async simulateTradeExecution(route, expectedProfit) {
		// Simulate network latency
		const latency = Math.random() * 100 + 50; // 50-150ms
		await new Promise(resolve => setTimeout(resolve, latency));

		// Simulate success/failure based on conditions
		const successProbability = this.calculateSuccessProbability(expectedProfit);
		const success = Math.random() < successProbability;

		if (success) {
			// Add some randomness to actual profit
			const actualProfit = expectedProfit * (0.8 + Math.random() * 0.4); // 80%-120% of expected
			
			return {
				success: true,
				actualProfit: actualProfit,
				txHash: 'mock_tx_' + Date.now(),
				latency: latency,
				timestamp: Date.now()
			};
		} else {
			return {
				success: false,
				reason: 'Simulated failure',
				latency: latency,
				timestamp: Date.now()
			};
		}
	}

	/**
	 * Calculate probability of trade success
	 */
	calculateSuccessProbability(expectedProfit) {
		let baseProbability = 0.85; // 85% base success rate

		// Higher profit = higher chance of success
		if (expectedProfit > 2.0) {
			baseProbability += 0.1;
		} else if (expectedProfit < 0.5) {
			baseProbability -= 0.2;
		}

		// Adjust based on recent performance
		if (this.state.consecutiveLosses > 2) {
			baseProbability -= 0.1;
		}

		return Math.max(0.1, Math.min(0.95, baseProbability));
	}

	/**
	 * Update rate limiting counters
	 */
	updateRateLimiting() {
		const now = Date.now();
		
		// Reset minute counter if needed
		if (now - this.state.minuteStartTime > 60000) {
			this.state.tradesThisMinute = 0;
			this.state.minuteStartTime = now;
		}

		this.state.tradesThisMinute++;
		this.state.lastTradeTime = now;
	}

	/**
	 * Update performance metrics
	 */
	updateMetrics(result, latency) {
		this.metrics.totalTrades++;
		
		if (result.success) {
			this.metrics.successfulTrades++;
			const profit = result.actualProfit || result.profit || 0;
			this.metrics.totalProfit += profit;
			this.metrics.bestTrade = Math.max(this.metrics.bestTrade, profit);
		} else {
			const loss = result.loss || 0;
			this.metrics.worstTrade = Math.min(this.metrics.worstTrade, -loss);
		}

		// Update average latency
		this.metrics.averageLatency = (this.metrics.averageLatency * (this.metrics.totalTrades - 1) + latency) / this.metrics.totalTrades;
		
		// Update average profit
		this.metrics.averageProfit = this.metrics.totalProfit / this.metrics.successfulTrades;

		// Log metrics periodically
		if (this.metrics.totalTrades % 10 === 0) {
			this.logMetrics();
		}
	}

	/**
	 * Handle successful trade
	 */
	handleSuccessfulTrade(result) {
		this.state.consecutiveLosses = 0;
		this.state.isInCooldown = false;
		this.state.dailyPnL += (result.actualProfit || result.profit || 0) / 100;

		console.log(`✅ Successful micro trade: +${(result.actualProfit || result.profit || 0).toFixed(3)}%`);
	}

	/**
	 * Handle failed trade
	 */
	handleFailedTrade(result) {
		this.state.consecutiveLosses++;
		this.state.dailyPnL -= (result.loss || 0.1) / 100; // Assume small loss

		// Enter cooldown after consecutive losses
		if (this.state.consecutiveLosses >= 3) {
			this.state.isInCooldown = true;
			console.log(`⏸️ Entering cooldown after ${this.state.consecutiveLosses} consecutive losses`);
		}

		console.log(`❌ Failed micro trade: ${result.reason || result.error || 'Unknown error'}`);
	}

	/**
	 * Log performance metrics
	 */
	logMetrics() {
		const successRate = ((this.metrics.successfulTrades / this.metrics.totalTrades) * 100).toFixed(1);
		const avgProfit = this.metrics.averageProfit?.toFixed(3) || '0.000';
		const totalPnL = (this.state.dailyPnL * 100).toFixed(2);

		console.log(`📊 Micro Trading Stats: ${this.metrics.totalTrades} trades, ${successRate}% success, avg profit: ${avgProfit}%, daily PnL: ${totalPnL}%`);
	}

	/**
	 * Get current state and metrics
	 */
	getStatus() {
		return {
			canTrade: this.canTrade(),
			state: { ...this.state },
			metrics: { ...this.metrics },
			settings: { ...this.settings }
		};
	}

	/**
	 * Reset daily statistics
	 */
	resetDaily() {
		this.state.dailyPnL = 0;
		this.state.consecutiveLosses = 0;
		this.state.isInCooldown = false;
		console.log('🔄 Daily statistics reset');
	}
}

module.exports = { MicroTradingEngine };