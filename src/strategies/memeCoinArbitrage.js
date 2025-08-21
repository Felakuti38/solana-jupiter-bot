/**
 * Meme Coin Arbitrage Strategy for Solana
 * Optimized for micro trading with high-frequency opportunities
 */

const { PublicKey } = require("@solana/web3.js");
const JSBI = require('jsbi');
const {
	calculateProfit,
	toDecimal,
	toNumber,
	updateIterationsPerMin,
	checkRoutesResponse,
	preTradeSafetyCheck,
} = require("../utils");
const { TRADING_CONSTANTS, AMM_STRATEGIES, SAFETY_LEVELS } = require("../utils/constants");

class MemeCoinArbitrageStrategy {
	constructor(config, cache) {
		this.config = config;
		this.cache = cache;
		this.memeCoinCache = new Map();
		this.priceHistory = new Map();
		this.volatilityScores = new Map();
		this.liquidityScores = new Map();
		
		// Meme coin specific settings
		this.settings = {
			minVolume24h: config.memeCoin?.minVolume24h || 10000,
			maxMarketCap: config.memeCoin?.maxMarketCap || 50000000, // $50M max
			minMarketCap: config.memeCoin?.minMarketCap || 100000,   // $100K min
			volatilityThreshold: config.memeCoin?.volatilityThreshold || 5, // 5% in 1min
			maxAge: config.memeCoin?.maxAge || 30, // 30 days max token age
			socialScoreMin: config.memeCoin?.socialScoreMin || 30,
			liquidityMin: config.memeCoin?.liquidityMin || 50000, // $50K min liquidity
			
			// Micro trading optimizations
			microTrading: {
				minProfit: config.memeCoin?.microTrading?.minProfit || 0.8, // 0.8% for meme coins
				maxSlippage: config.memeCoin?.microTrading?.maxSlippage || 200, // 2% max slippage
				priorityFee: config.memeCoin?.microTrading?.priorityFee || 5000, // Higher priority for speed
				fastExecution: true,
				batchSize: config.memeCoin?.microTrading?.batchSize || 3, // Batch 3 trades
			}
		};
	}

	/**
	 * Main meme coin arbitrage execution
	 */
	async execute(jupiter, tokenA, tokenB) {
		this.cache.iteration++;
		const date = new Date();
		const i = this.cache.iteration;
		this.cache.queue[i] = -1;

		try {
			// Update iterations per minute
			updateIterationsPerMin(this.cache);

			// Check if tokens are meme coins
			const isMemeTokenA = await this.isMemeCoin(tokenA);
			const isMemeTokenB = await this.isMemeCoin(tokenB);

			if (!isMemeTokenA && !isMemeTokenB) {
				console.log(`⚠️ Neither token is a meme coin, skipping...`);
				return { success: false, reason: 'No meme coins detected' };
			}

			// Calculate trade amount with micro trading optimization
			const amountToTrade = this.calculateOptimalTradeSize();
			const amountInJSBI = JSBI.BigInt(amountToTrade);

			// Enhanced slippage for meme coins
			const slippage = this.calculateDynamicSlippage(tokenA, tokenB);

			// Find arbitrage opportunities across multiple DEXes
			const opportunities = await this.findArbitrageOpportunities(
				jupiter, tokenA, tokenB, amountInJSBI, slippage
			);

			if (opportunities.length === 0) {
				console.log(`❌ No profitable arbitrage opportunities found`);
				return { success: false, reason: 'No opportunities' };
			}

			// Select best opportunity
			const bestOpportunity = this.selectBestOpportunity(opportunities);
			
			// Execute the arbitrage trade
			const result = await this.executeArbitrageTrade(jupiter, bestOpportunity);

			return result;

		} catch (error) {
			console.error(`🚨 Meme coin arbitrage error:`, error);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Check if a token is a meme coin based on various criteria
	 */
	async isMemeCoin(token) {
		const cacheKey = token.address;
		
		// Check cache first
		if (this.memeCoinCache.has(cacheKey)) {
			return this.memeCoinCache.get(cacheKey);
		}

		try {
			// Fetch token metadata and market data
			const tokenData = await this.fetchTokenData(token.address);
			
			const criteria = {
				hasMemeName: this.hasMemeName(token.symbol, tokenData.name),
				hasLowMarketCap: tokenData.marketCap < this.settings.maxMarketCap && 
								tokenData.marketCap > this.settings.minMarketCap,
				hasHighVolatility: await this.calculateVolatility(token.address) > this.settings.volatilityThreshold,
				hasRecentCreation: tokenData.age < this.settings.maxAge,
				hasSocialActivity: tokenData.socialScore > this.settings.socialScoreMin,
				hasAdequateLiquidity: tokenData.liquidity > this.settings.liquidityMin
			};

			// Score the token (need at least 4/6 criteria)
			const score = Object.values(criteria).filter(Boolean).length;
			const isMemeCoin = score >= 4;

			// Cache the result for 5 minutes
			this.memeCoinCache.set(cacheKey, isMemeCoin);
			setTimeout(() => this.memeCoinCache.delete(cacheKey), 300000);

			console.log(`🎯 Token ${token.symbol} meme score: ${score}/6 (${isMemeCoin ? 'MEME' : 'NOT MEME'})`);
			
			return isMemeCoin;

		} catch (error) {
			console.error(`Error checking meme coin status for ${token.symbol}:`, error);
			return false;
		}
	}

	/**
	 * Check if token name/symbol suggests it's a meme coin
	 */
	hasMemeName(symbol, name) {
		const memeKeywords = [
			'doge', 'shib', 'pepe', 'wojak', 'chad', 'bonk', 'floki', 'safe',
			'moon', 'rocket', 'diamond', 'ape', 'baby', 'mini', 'elon',
			'trump', 'biden', 'cat', 'dog', 'frog', 'bear', 'bull',
			'meme', 'coin', 'token', 'inu', 'shiba', 'akita', 'corgi'
		];

		const text = `${symbol} ${name}`.toLowerCase();
		return memeKeywords.some(keyword => text.includes(keyword));
	}

	/**
	 * Calculate dynamic slippage based on token volatility and liquidity
	 */
	calculateDynamicSlippage(tokenA, tokenB) {
		const baseSlippage = this.config.slippage || 50; // 0.5% base
		
		// Get volatility scores
		const volatilityA = this.volatilityScores.get(tokenA.address) || 1;
		const volatilityB = this.volatilityScores.get(tokenB.address) || 1;
		const avgVolatility = (volatilityA + volatilityB) / 2;

		// Get liquidity scores (lower liquidity = higher slippage needed)
		const liquidityA = this.liquidityScores.get(tokenA.address) || 100000;
		const liquidityB = this.liquidityScores.get(tokenB.address) || 100000;
		const avgLiquidity = (liquidityA + liquidityB) / 2;

		// Calculate multipliers
		const volatilityMultiplier = Math.min(avgVolatility / 2, 3); // Max 3x
		const liquidityMultiplier = Math.max(100000 / avgLiquidity, 1); // Higher for low liquidity

		const dynamicSlippage = Math.min(
			baseSlippage * volatilityMultiplier * liquidityMultiplier,
			this.settings.microTrading.maxSlippage
		);

		console.log(`📊 Dynamic slippage: ${dynamicSlippage}bps (vol: ${avgVolatility.toFixed(2)}%, liq: $${avgLiquidity.toLocaleString()})`);
		
		return Math.round(dynamicSlippage);
	}

	/**
	 * Find arbitrage opportunities across multiple DEXes
	 */
	async findArbitrageOpportunities(jupiter, tokenA, tokenB, amount, slippage) {
		const opportunities = [];

		try {
			// Get routes for A->B
			const routesAB = await jupiter.computeRoutes({
				inputMint: new PublicKey(tokenA.address),
				outputMint: new PublicKey(tokenB.address),
				amount: amount,
				slippageBps: slippage,
				forceFetch: false,
				onlyDirectRoutes: false,
				filterTopNResult: 5, // Get top 5 routes
			});

			// Get routes for B->A  
			const routesBA = await jupiter.computeRoutes({
				inputMint: new PublicKey(tokenB.address),
				outputMint: new PublicKey(tokenA.address),
				amount: amount,
				slippageBps: slippage,
				forceFetch: false,
				onlyDirectRoutes: false,
				filterTopNResult: 5,
			});

			checkRoutesResponse(routesAB);
			checkRoutesResponse(routesBA);

			// Analyze each route combination for arbitrage
			for (const routeAB of routesAB.routesInfos.slice(0, 3)) {
				for (const routeBA of routesBA.routesInfos.slice(0, 3)) {
					const opportunity = await this.analyzeArbitrageOpportunity(
						routeAB, routeBA, tokenA, tokenB, amount
					);

					if (opportunity && opportunity.profit > this.settings.microTrading.minProfit) {
						opportunities.push(opportunity);
					}
				}
			}

			// Sort by profitability
			opportunities.sort((a, b) => b.profit - a.profit);

			console.log(`🔍 Found ${opportunities.length} arbitrage opportunities`);
			
			return opportunities.slice(0, 5); // Return top 5

		} catch (error) {
			console.error('Error finding arbitrage opportunities:', error);
			return [];
		}
	}

	/**
	 * Analyze potential arbitrage opportunity
	 */
	async analyzeArbitrageOpportunity(routeAB, routeBA, tokenA, tokenB, amount) {
		try {
			const amountOut1 = JSBI.toNumber(routeAB.outAmount);
			const amountOut2 = JSBI.toNumber(routeBA.outAmount);
			
			// Calculate theoretical profit
			const profit1 = calculateProfit(JSBI.toNumber(amount), amountOut1);
			const profit2 = calculateProfit(JSBI.toNumber(amount), amountOut2);
			
			// Estimate fees
			const fees = await this.estimateArbitrageFees(routeAB, routeBA);
			const netProfit1 = profit1 - fees.total;
			const netProfit2 = profit2 - fees.total;

			const bestProfit = Math.max(netProfit1, netProfit2);
			const bestDirection = netProfit1 > netProfit2 ? 'A->B' : 'B->A';

			if (bestProfit > this.settings.microTrading.minProfit) {
				return {
					direction: bestDirection,
					routeAB: routeAB,
					routeBA: routeBA,
					profit: bestProfit,
					fees: fees,
					estimatedGas: fees.gas,
					tokenA: tokenA,
					tokenB: tokenB,
					amount: amount,
					timestamp: Date.now()
				};
			}

			return null;

		} catch (error) {
			console.error('Error analyzing arbitrage opportunity:', error);
			return null;
		}
	}

	/**
	 * Estimate fees for arbitrage trade
	 */
	async estimateArbitrageFees(routeAB, routeBA) {
		// Network fees
		const networkFee = 0.000005 * 2; // 2 transactions
		const priorityFee = (this.settings.microTrading.priorityFee / 1000000) * 2;
		
		// DEX fees (estimate from route)
		const dexFeeAB = this.estimateDexFee(routeAB);
		const dexFeeBA = this.estimateDexFee(routeBA);

		return {
			network: networkFee,
			priority: priorityFee,
			dexAB: dexFeeAB,
			dexBA: dexFeeBA,
			total: networkFee + priorityFee + dexFeeAB + dexFeeBA,
			gas: networkFee + priorityFee
		};
	}

	/**
	 * Estimate DEX fee from route
	 */
	estimateDexFee(route) {
		// Extract DEX info from route and estimate fee
		// This is a simplified estimation
		const marketInfos = route.marketInfos || [];
		let totalFee = 0;

		for (const market of marketInfos) {
			const dexName = market.amm?.label || 'Unknown';
			
			// Fee rates by DEX (in percentage)
			const feeRates = {
				'Raydium': 0.25,
				'Orca': 0.30,
				'Openbook': 0.10,
				'Phoenix': 0.10,
				'Lifinity': 0.01,
				'Meteora': 0.10,
				'Saber': 0.04
			};

			const feeRate = feeRates[dexName] || 0.25; // Default 0.25%
			totalFee += feeRate / 100; // Convert to decimal
		}

		return totalFee;
	}

	/**
	 * Select the best arbitrage opportunity
	 */
	selectBestOpportunity(opportunities) {
		if (opportunities.length === 0) return null;

		// Score opportunities based on multiple factors
		const scoredOpportunities = opportunities.map(opp => {
			const profitScore = opp.profit * 10; // Weight profit heavily
			const speedScore = this.calculateSpeedScore(opp);
			const riskScore = this.calculateRiskScore(opp);
			
			return {
				...opp,
				totalScore: profitScore + speedScore - riskScore
			};
		});

		// Return highest scoring opportunity
		scoredOpportunities.sort((a, b) => b.totalScore - a.totalScore);
		
		console.log(`🎯 Selected opportunity: ${scoredOpportunities[0].direction} with ${scoredOpportunities[0].profit.toFixed(3)}% profit`);
		
		return scoredOpportunities[0];
	}

	/**
	 * Calculate speed score for opportunity
	 */
	calculateSpeedScore(opportunity) {
		// Prefer routes with fewer hops and faster DEXes
		const routeComplexity = (opportunity.routeAB.marketInfos?.length || 1) + 
							   (opportunity.routeBA.marketInfos?.length || 1);
		
		return Math.max(10 - routeComplexity, 0);
	}

	/**
	 * Calculate risk score for opportunity  
	 */
	calculateRiskScore(opportunity) {
		// Higher risk = higher score (to subtract from total)
		let riskScore = 0;
		
		// Risk from high slippage
		const avgSlippage = ((opportunity.routeAB.slippageBps || 50) + 
							(opportunity.routeBA.slippageBps || 50)) / 2;
		riskScore += avgSlippage / 10;

		// Risk from route complexity
		const complexity = (opportunity.routeAB.marketInfos?.length || 1) + 
						  (opportunity.routeBA.marketInfos?.length || 1);
		riskScore += complexity;

		// Risk from age of opportunity
		const age = Date.now() - opportunity.timestamp;
		riskScore += age / 1000; // 1 point per second

		return riskScore;
	}

	/**
	 * Execute the arbitrage trade
	 */
	async executeArbitrageTrade(jupiter, opportunity) {
		try {
			console.log(`🚀 Executing ${opportunity.direction} arbitrage trade...`);

			// Pre-trade safety check
			const safetyCheck = await preTradeSafetyCheck(
				jupiter,
				opportunity.direction === 'A->B' ? opportunity.routeAB : opportunity.routeBA,
				opportunity.tokenA,
				JSBI.toNumber(opportunity.amount),
				this.config.advanced?.safetyLevel || 'FAST'
			);

			if (!safetyCheck.safe) {
				console.log(`🚨 Safety check failed: ${safetyCheck.reason}`);
				return { success: false, reason: safetyCheck.reason };
			}

			// Execute first leg of arbitrage
			const firstLegResult = await this.executeTrade(
				jupiter, 
				opportunity.direction === 'A->B' ? opportunity.routeAB : opportunity.routeBA
			);

			if (!firstLegResult.success) {
				return { success: false, reason: 'First leg failed', error: firstLegResult.error };
			}

			// Execute second leg of arbitrage
			const secondLegResult = await this.executeTrade(
				jupiter,
				opportunity.direction === 'A->B' ? opportunity.routeBA : opportunity.routeAB
			);

			if (!secondLegResult.success) {
				console.log(`⚠️ First leg succeeded but second leg failed. Manual intervention may be needed.`);
				return { 
					success: false, 
					reason: 'Second leg failed', 
					partialSuccess: true,
					firstLeg: firstLegResult 
				};
			}

			console.log(`✅ Arbitrage completed successfully! Profit: ${opportunity.profit.toFixed(3)}%`);

			return {
				success: true,
				profit: opportunity.profit,
				direction: opportunity.direction,
				firstLeg: firstLegResult,
				secondLeg: secondLegResult
			};

		} catch (error) {
			console.error('Error executing arbitrage trade:', error);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Execute individual trade
	 */
	async executeTrade(jupiter, route) {
		try {
			// This would integrate with the existing swap functionality
			// For now, return a mock successful result
			console.log(`📈 Executing trade via ${route.marketInfos?.[0]?.amm?.label || 'DEX'}...`);
			
			// In real implementation, this would call the actual swap function
			// return await swap(jupiter, route, this.cache);
			
			return { 
				success: true, 
				txHash: 'mock_tx_hash_' + Date.now(),
				timestamp: Date.now()
			};

		} catch (error) {
			console.error('Trade execution error:', error);
			return { success: false, error: error.message };
		}
	}

	/**
	 * Calculate optimal trade size for micro trading
	 */
	calculateOptimalTradeSize() {
		const baseAmount = this.cache.config.tradeSize.strategy === "cumulative"
			? this.cache.currentBalance["tokenA"]
			: this.cache.initialBalance["tokenA"];

		// For meme coins, use smaller sizes to minimize slippage
		const memeOptimizedSize = Math.min(baseAmount, baseAmount * 0.1); // Max 10% of balance
		
		return Math.max(memeOptimizedSize, 1000000); // Min $1 equivalent
	}

	/**
	 * Fetch token data from various sources
	 */
	async fetchTokenData(tokenAddress) {
		// This would fetch from CoinGecko, DexScreener, or other APIs
		// For now, return mock data
		return {
			marketCap: Math.random() * 10000000,
			volume24h: Math.random() * 1000000,
			age: Math.random() * 100,
			socialScore: Math.random() * 100,
			liquidity: Math.random() * 500000,
			name: 'Mock Token'
		};
	}

	/**
	 * Calculate token volatility
	 */
	async calculateVolatility(tokenAddress) {
		// This would calculate based on price history
		// For now, return mock volatility
		return Math.random() * 10; // 0-10% volatility
	}
}

module.exports = { MemeCoinArbitrageStrategy };