/**
 * CLMM Protection Utility
 * Prevents Jupiter CLMM loop route issues that cause bn.js assertion failures
 */

/**
 * Safe route computation with CLMM protection
 */
async function safeComputeRoutes(jupiter, params, options = {}) {
	const {
		enableClmmProtection = true,
		maxRetries = 2,
		fallbackToSimpleRoutes = true,
		logErrors = true
	} = options;

	// Enhanced parameters with CLMM protection
	const safeParams = {
		...params,
		// CLMM Protection settings
		forceFetch: false, // Use cached routes to avoid repeated CLMM probing
		onlyDirectRoutes: enableClmmProtection ? true : params.onlyDirectRoutes,
		filterTopNResult: enableClmmProtection ? Math.min(params.filterTopNResult || 3, 2) : params.filterTopNResult,
		enforceSingleTx: enableClmmProtection ? true : params.enforceSingleTx,
		
		// Exclude problematic DEXes if protection is enabled
		excludeDexes: enableClmmProtection ? 
			[...(params.excludeDexes || []), 'Raydium CLMM'] : 
			params.excludeDexes
	};

	let attempt = 0;
	let lastError = null;

	while (attempt < maxRetries) {
		try {
			if (logErrors && attempt > 0) {
				console.log(`🔄 Retry attempt ${attempt + 1} for route computation`);
			}

			const routes = await jupiter.computeRoutes(safeParams);
			
			// Validate routes don't contain problematic patterns
			if (enableClmmProtection && routes.routesInfos) {
				const filteredRoutes = filterProblematicRoutes(routes.routesInfos);
				routes.routesInfos = filteredRoutes;
			}

			return routes;

		} catch (error) {
			lastError = error;
			attempt++;

			if (logErrors) {
				console.log(`⚠️ Route computation error (attempt ${attempt}): ${error.message}`);
			}

			// Check if it's a CLMM-related error
			if (isClmmRelatedError(error)) {
				if (logErrors) {
					console.log('🚨 CLMM loop route detected, applying stricter protection');
				}

				// Apply stricter protection for next attempt
				safeParams.onlyDirectRoutes = true;
				safeParams.filterTopNResult = 1;
				safeParams.excludeDexes = [...(safeParams.excludeDexes || []), 'Raydium CLMM', 'Orca (Whirlpools)'];
			}

			// If this is the last attempt and fallback is enabled, try ultra-safe mode
			if (attempt === maxRetries - 1 && fallbackToSimpleRoutes) {
				if (logErrors) {
					console.log('🛡️ Applying ultra-safe routing mode');
				}

				safeParams.onlyDirectRoutes = true;
				safeParams.filterTopNResult = 1;
				safeParams.enforceSingleTx = true;
				safeParams.excludeDexes = ['Raydium CLMM', 'Orca (Whirlpools)', 'Meteora', 'Lifinity V2'];
			}
		}
	}

	// If all attempts failed, throw the last error
	if (logErrors) {
		console.error('🚨 All route computation attempts failed');
	}
	throw lastError;
}

/**
 * Filter out routes that might cause CLMM issues
 */
function filterProblematicRoutes(routes) {
	return routes.filter(route => {
		// Filter out routes with too many hops
		if (route.marketInfos && route.marketInfos.length > 3) {
			return false;
		}

		// Filter out routes that contain known problematic DEX combinations
		if (route.marketInfos) {
			const dexes = route.marketInfos.map(market => market.amm?.label || '');
			
			// Check for problematic CLMM combinations
			const hasClmm = dexes.some(dex => dex.includes('CLMM'));
			const hasMultipleComplexDexes = dexes.filter(dex => 
				['CLMM', 'Whirlpools', 'Meteora'].some(complex => dex.includes(complex))
			).length > 1;

			if (hasClmm && hasMultipleComplexDexes) {
				return false; // Skip routes with multiple complex DEXes
			}
		}

		return true;
	});
}

/**
 * Check if an error is related to CLMM issues
 */
function isClmmRelatedError(error) {
	const errorMessage = error.message?.toLowerCase() || '';
	const errorStack = error.stack?.toLowerCase() || '';

	const clmmErrorIndicators = [
		'bn.js assertion failed',
		'clmm',
		'loop route',
		'circular reference',
		'maximum call stack',
		'raydium clmm',
		'whirlpool',
		'concentrated liquidity'
	];

	return clmmErrorIndicators.some(indicator => 
		errorMessage.includes(indicator) || errorStack.includes(indicator)
	);
}

/**
 * Get safe AMM configuration for different strategies
 */
function getSafeAmmConfig(strategy, riskLevel = 'MEDIUM') {
	const configs = {
		// Ultra-safe: Only most reliable DEXes
		ULTRA_SAFE: {
			enabled: ['Raydium', 'Orca', 'Openbook'],
			excludeDexes: ['Raydium CLMM', 'Orca (Whirlpools)', 'Meteora', 'Lifinity V2'],
			onlyDirectRoutes: true,
			enforceSingleTx: true,
			filterTopNResult: 1
		},

		// Safe: Reliable DEXes with minimal CLMM
		SAFE: {
			enabled: ['Raydium', 'Orca', 'Openbook', 'Phoenix'],
			excludeDexes: ['Raydium CLMM'],
			onlyDirectRoutes: true,
			enforceSingleTx: true,
			filterTopNResult: 2
		},

		// Medium: Balanced approach
		MEDIUM: {
			enabled: ['Raydium', 'Orca', 'Openbook', 'Phoenix', 'Lifinity'],
			excludeDexes: [], // Allow all but with protection
			onlyDirectRoutes: false,
			enforceSingleTx: false,
			filterTopNResult: 3
		},

		// Aggressive: All DEXes (higher risk of CLMM issues)
		AGGRESSIVE: {
			enabled: ['Raydium', 'Raydium CLMM', 'Orca', 'Orca (Whirlpools)', 'Openbook', 'Phoenix', 'Meteora'],
			excludeDexes: [],
			onlyDirectRoutes: false,
			enforceSingleTx: false,
			filterTopNResult: 5
		}
	};

	// Strategy-specific recommendations
	const strategyDefaults = {
		'arbitrage': 'SAFE', // Arbitrage is prone to CLMM issues
		'memecoin-arbitrage': 'SAFE', // Meme coins need stable routing
		'micro-trading': 'ULTRA_SAFE', // Micro trading needs speed and reliability
		'pingpong': 'MEDIUM' // Ping pong is generally safe
	};

	const recommendedLevel = strategyDefaults[strategy] || riskLevel;
	return configs[recommendedLevel] || configs.MEDIUM;
}

/**
 * Wrap Jupiter route computation with error handling
 */
async function robustRouteComputation(jupiter, params, strategy = 'unknown') {
	const safeConfig = getSafeAmmConfig(strategy);
	
	// Merge safe config with user params
	const safeParams = {
		...params,
		...safeConfig,
		// Keep user's critical params
		inputMint: params.inputMint,
		outputMint: params.outputMint,
		amount: params.amount,
		slippageBps: params.slippageBps
	};

	try {
		return await safeComputeRoutes(jupiter, safeParams, {
			enableClmmProtection: true,
			maxRetries: 3,
			fallbackToSimpleRoutes: true,
			logErrors: true
		});
	} catch (error) {
		console.error(`🚨 Robust route computation failed for ${strategy}:`, error.message);
		
		// Last resort: ultra-safe mode
		console.log('🛡️ Attempting ultra-safe route computation...');
		
		const ultraSafeParams = {
			...params,
			...getSafeAmmConfig(strategy, 'ULTRA_SAFE')
		};

		return await jupiter.computeRoutes(ultraSafeParams);
	}
}

module.exports = {
	safeComputeRoutes,
	filterProblematicRoutes,
	isClmmRelatedError,
	getSafeAmmConfig,
	robustRouteComputation
};