console.clear();

require("dotenv").config();
const { clearInterval } = require("timers");
const { PublicKey } = require("@solana/web3.js");
const JSBI = require('jsbi');
const { setTimeout } = require("timers/promises");
const {
	calculateProfit,
	toDecimal,
	toNumber,
	updateIterationsPerMin,
	checkRoutesResponse,
	preTradeSafetyCheck,
} = require("../utils");
const { TRADING_CONSTANTS } = require("../utils/constants");
const { handleExit, logExit } = require("./exit");
const cache = require("./cache");
global.cache = cache; // Make cache globally accessible for safety checks
const { setup, getInitialotherAmountThreshold, checkTokenABalance } = require("./setup");
const { printToConsole } = require("./ui/");
const { swap, failedSwapHandler, successSwapHandler } = require("./swap");

// Enhanced meme coin and micro trading strategies
const { MemeCoinArbitrageStrategy } = require("../strategies/memeCoinArbitrage");
const { MicroTradingEngine } = require("../strategies/microTradingEngine");
const { getMemeCoinConfig } = require("../config/memeCoinConfig");

const waitabit = async (ms) => {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve();
		}, ms);
	});
};

function getRandomAmt(runtime) {
	const min = Math.ceil((runtime*10000)*0.99);
	const max = Math.floor((runtime*10000)*1.01);
	return ((Math.floor(Math.random() * (max - min + 1)) + min)/10000);
}

const pingpongStrategy = async (jupiter, tokenA, tokenB) => {
	cache.iteration++;
	const date = new Date();
	const i = cache.iteration;
	cache.queue[i] = -1;

	try {
		// calculate & update iterations per minute
		updateIterationsPerMin(cache);

		// Calculate amount that will be used for trade
		const amountToTrade =
			cache.config.tradeSize.strategy === "cumulative"
				? cache.currentBalance[cache.sideBuy ? "tokenA" : "tokenB"]
				: cache.initialBalance[cache.sideBuy ? "tokenA" : "tokenB"];

		const baseAmount = cache.lastBalance[cache.sideBuy ? "tokenB" : "tokenA"];
		const slippage = typeof cache.config.slippage === "number" ? cache.config.slippage : 1; // 1BPS is 0.01%

		// set input / output token
		const inputToken = cache.sideBuy ? tokenA : tokenB;
		const outputToken = cache.sideBuy ? tokenB : tokenA;
		const tokdecimals = cache.sideBuy ? inputToken.decimals : outputToken.decimals;
		const amountInJSBI = JSBI.BigInt(amountToTrade);

		// check current routes via JUP4 SDK
		const performanceOfRouteCompStart = performance.now();
		const routes = await jupiter.computeRoutes({
			inputMint: new PublicKey(inputToken.address),
			outputMint: new PublicKey(outputToken.address),
			amount: amountInJSBI,
			slippageBps: slippage,
			forceFetch: false, // Use cached data when possible for better performance
			onlyDirectRoutes: false,
			filterTopNResult: 2,
		});

		checkRoutesResponse(routes);

		// count available routes
		cache.availableRoutes[cache.sideBuy ? "buy" : "sell"] =
			routes.routesInfos.length;

		// update status as OK
		cache.queue[i] = 0;

		const performanceOfRouteComp = performance.now() - performanceOfRouteCompStart;

		// choose first route
		const route = await routes.routesInfos[0];

		// calculate profitability
		const simulatedProfit = calculateProfit(String(baseAmount), await JSBI.toNumber(route.outAmount));

		// Alter slippage to be larger based on the profit if enabled in the config
		// set cache.config.adaptiveSlippage=1 to enable
		// Profit minus minimum profit
		// default to the set slippage
		var slippagerevised = slippage;

		if ((simulatedProfit > cache.config.minPercProfit) && cache.config.adaptiveSlippage == 1){
				var slippagerevised = (100*(simulatedProfit-cache.config.minPercProfit+(slippage/100))).toFixed(3)

				if (slippagerevised > TRADING_CONSTANTS.MAX_SLIPPAGE) {
					// Make sure on really big numbers it is only 30% of the total
					slippagerevised = (TRADING_CONSTANTS.SLIPPAGE_MULTIPLIER * slippagerevised).toFixed(3);
				} else {
					slippagerevised = (TRADING_CONSTANTS.SLIPPAGE_REDUCTION_FACTOR * slippagerevised).toFixed(3);
				}

				//console.log("Setting slippage to "+slippagerevised);
				route.slippageBps = slippagerevised;
		}

		// store max profit spotted
		if (
			simulatedProfit > cache.maxProfitSpotted[cache.sideBuy ? "buy" : "sell"]
		) {
			cache.maxProfitSpotted[cache.sideBuy ? "buy" : "sell"] = simulatedProfit;
		}

		printToConsole({
			date,
			i,
			performanceOfRouteComp,
			inputToken,
			outputToken,
			tokenA,
			tokenB,
			route,
			simulatedProfit,
		});

		// Pre-trade safety check
		const safetyCheck = await preTradeSafetyCheck(
			jupiter,
			route,
			inputToken,
			amountToTrade,
			cache.config.advanced?.safetyLevel || 'BALANCED'
		);

		// Log safety check results
		if (!safetyCheck.safe) {
			console.log(`🚨 Safety check failed: ${safetyCheck.reason}`);
			if (safetyCheck.details) {
				console.log(`Details:`, safetyCheck.details);
			}
		}

		// check profitability and execute tx
		let tx, performanceOfTx;
		if (
			simulatedProfit > cache.config.minPercProfit &&
			safetyCheck.safe
		) {
			// announce
			if (cache.config.tradingStrategy === "pingpong") {
				console.log(
					`[${cache.config.tradingStrategy.toUpperCase()}] 🚀 TRADE: ${simulatedProfit.toFixed(
						3
					)}% | ${cache.sideBuy ? "Buy" : "Sell"}`
				);
			}

			// start trade
			const performanceOfTxStart = performance.now();
			tx = await swap(jupiter, route);
			performanceOfTx = performance.now() - performanceOfTxStart;

			// handle tx response
			if (tx.success) {
				console.log(
					`[${cache.config.tradingStrategy.toUpperCase()}] ✅ SUCCESS: ${tx.txid}`
				);
				await successSwapHandler(tx.txid, inputToken, outputToken, amountToTrade, route);
				cache.sideBuy = !cache.sideBuy;
			} else {
				console.log(
					`[${cache.config.tradingStrategy.toUpperCase()}] ❌ FAILED: ${tx.error}`
				);
				await failedSwapHandler(route, i);
			}
		} else {
			// announce
			if (simulatedProfit <= cache.config.minPercProfit) {
				console.log(
					`[${cache.config.tradingStrategy.toUpperCase()}] 🔴 SKIP: ${simulatedProfit.toFixed(
						3
					)}% | ${simulatedProfit.toFixed(3)}% <= ${cache.config.minPercProfit}%`
				);
			} else if (!safetyCheck.safe) {
				console.log(
					`[${cache.config.tradingStrategy.toUpperCase()}] 🔴 SKIP: Safety check failed`
				);
			}
		}

		// update status as complete
		cache.queue[i] = 1;

		// wait a bit
		await waitabit(cache.config.minInterval);
	} catch (error) {
		console.error(`❌ Error in pingpong strategy:`, error.message);
		cache.queue[i] = 2;
		await waitabit(cache.config.minInterval);
	}
};

const arbitrageStrategy = async (jupiter, tokenA) => {

	//console.log('ARBITRAGE STRATEGY ACTIVE');

	cache.iteration++;
	const date = new Date();
	const i = cache.iteration;
	cache.queue[i] = -1;
	swapactionrun: try {
		// calculate & update iterations per minute
		updateIterationsPerMin(cache);

		// Calculate amount that will be used for trade
		const amountToTrade =
			cache.config.tradeSize.strategy === "cumulative"
				? cache.currentBalance["tokenA"]
				: cache.initialBalance["tokenA"];
		const baseAmount = amountToTrade;

        //BNI AMT to TRADE
        const amountInJSBI = JSBI.BigInt(amountToTrade);
        //console.log('Amount to trade:'+amountToTrade);

		// default slippage
		const slippage = typeof cache.config.slippage === "number" ? cache.config.slippage : 1; // 100 is 0.1%

		// set input / output token
		const inputToken = tokenA;
		const outputToken = tokenA;

		// check current routes
		const performanceOfRouteCompStart = performance.now();
		const routes = await jupiter.computeRoutes({
			inputMint: new PublicKey(inputToken.address),
			outputMint: new PublicKey(outputToken.address),
			amount: amountInJSBI,
			slippageBps: slippage,
			feeBps: 0,
			forceFetch: true,
		    onlyDirectRoutes: false,
            filterTopNResult: 2,
			enforceSingleTx: false,
			swapMode: 'ExactIn',
		});

		//console.log('Routes Lookup Run for '+ inputToken.address);
		checkRoutesResponse(routes);

		// count available routes
		cache.availableRoutes[cache.sideBuy ? "buy" : "sell"] =
			routes.routesInfos.length;

		// update status as OK
		cache.queue[i] = 0;

		const performanceOfRouteComp = performance.now() - performanceOfRouteCompStart;

		// choose first route
		const route = await routes.routesInfos[0];

		// calculate profitability
		const simulatedProfit = calculateProfit(baseAmount, await JSBI.toNumber(route.outAmount));
		const minPercProfitRnd = getRandomAmt(cache.config.minPercProfit);
		//console.log('mpp:'+minPercProfitRnd);

		var slippagerevised = slippage;

		if ((simulatedProfit > cache.config.minPercProfit) && cache.config.adaptiveSlippage === 1){
				slippagerevised = (100*(simulatedProfit-minPercProfitRnd+(slippage/100))).toFixed(3)

				// Set adaptive slippage
				if (slippagerevised>500) {
						// Make sure on really big numbers it is only 30% of the total if > 50%
						slippagerevised = (0.30*slippagerevised).toFixed(3);
				} else {
						slippagerevised = (0.80*slippagerevised).toFixed(3);
				}
				//console.log("Setting slippage to "+slippagerevised);
				route.slippageBps = slippagerevised;
		}

		// store max profit spotted
		if (simulatedProfit > cache.maxProfitSpotted["buy"]) {
			cache.maxProfitSpotted["buy"] = simulatedProfit;
		}

		printToConsole({
			date,
			i,
			performanceOfRouteComp,
			inputToken,
			outputToken,
			tokenA,
			tokenB,
			route,
			simulatedProfit,
		});

		// Pre-trade safety check
		const safetyCheck = await preTradeSafetyCheck(
			jupiter,
			route,
			inputToken,
			amountToTrade,
			cache.config.advanced?.safetyLevel || 'BALANCED'
		);

		// check profitability and execute tx
		let tx, performanceOfTx;
		if (simulatedProfit > cache.config.minPercProfit && safetyCheck.safe) {
			// announce
			console.log(
				`[${cache.config.tradingStrategy.toUpperCase()}] 🚀 TRADE: ${simulatedProfit.toFixed(
					3
				)}%`
			);

			// start trade
			const performanceOfTxStart = performance.now();
			tx = await swap(jupiter, route);
			performanceOfTx = performance.now() - performanceOfTxStart;

			// handle tx response
			if (tx.success) {
				console.log(
					`[${cache.config.tradingStrategy.toUpperCase()}] ✅ SUCCESS: ${tx.txid}`
				);
				await successSwapHandler(tx.txid, inputToken, outputToken, amountToTrade, route);
			} else {
				console.log(
					`[${cache.config.tradingStrategy.toUpperCase()}] ❌ FAILED: ${tx.error}`
				);
				await failedSwapHandler(route, i);
			}
		} else {
			// announce
			if (simulatedProfit <= cache.config.minPercProfit) {
				console.log(
					`[${cache.config.tradingStrategy.toUpperCase()}] 🔴 SKIP: ${simulatedProfit.toFixed(
						3
					)}% | ${simulatedProfit.toFixed(3)}% <= ${cache.config.minPercProfit}%`
				);
			} else if (!safetyCheck.safe) {
				console.log(
					`[${cache.config.tradingStrategy.toUpperCase()}] 🔴 SKIP: Safety check failed - ${safetyCheck.reason}`
				);
			}
		}

		// update status as complete
		cache.queue[i] = 1;

		// wait a bit
		await waitabit(cache.config.minInterval);
	} catch (error) {
		console.error(`❌ Error in arbitrage strategy:`, error.message);
		cache.queue[i] = 2;
		await waitabit(cache.config.minInterval);
	}
};

// Enhanced Meme Coin Arbitrage Strategy
const memeCoinArbitrageStrategy = async (jupiter, tokenA, tokenB) => {
	try {
		console.log('🎭 Starting meme coin arbitrage strategy...');
		const memeCoinStrategy = new MemeCoinArbitrageStrategy(cache.config, cache);
		const result = await memeCoinStrategy.execute(jupiter, tokenA, tokenB);
		
		if (result.success) {
			console.log(`🎯 Meme coin arbitrage successful: ${result.profit.toFixed(3)}% profit`);
			// Update cache balances
			cache.lastBalance.tokenA = cache.currentBalance.tokenA;
			cache.lastBalance.tokenB = cache.currentBalance.tokenB;
			
			// Update statistics
			cache.statistics = cache.statistics || { trades: 0, profits: 0, losses: 0 };
			cache.statistics.trades++;
			cache.statistics.profits++;
			
			console.log(`📊 Direction: ${result.direction}, TX: ${result.txHash}`);
		} else {
			console.log(`❌ Meme coin arbitrage failed: ${result.reason}`);
			cache.statistics = cache.statistics || { trades: 0, profits: 0, losses: 0 };
			cache.statistics.trades++;
			cache.statistics.losses++;
		}
		
		// Wait before next iteration
		await waitabit(cache.config.minInterval || 1000);
		
		return result;
	} catch (error) {
		console.error('🚨 Meme coin arbitrage error:', error);
		await waitabit(cache.config.minInterval || 1000);
		return { success: false, error: error.message };
	}
};

// Enhanced Micro Trading Strategy
const microTradingStrategy = async (jupiter, tokenA, tokenB) => {
	try {
		console.log('⚡ Starting micro trading strategy...');
		const microEngine = new MicroTradingEngine(cache.config, cache);
		const strategy = cache.config.microTradingMode || 'arbitrage';
		
		const result = await microEngine.execute(jupiter, tokenA, tokenB, strategy);
		
		if (result.success) {
			console.log(`⚡ Micro trading successful: ${result.profit.toFixed(3)}% profit`);
			
			// Handle ping pong side switching
			if (strategy === 'pingpong') {
				cache.sideBuy = !cache.sideBuy;
				console.log(`🏓 Switched to ${cache.sideBuy ? 'BUY' : 'SELL'} side`);
			}
			
			// Update cache balances
			cache.lastBalance.tokenA = cache.currentBalance.tokenA;
			cache.lastBalance.tokenB = cache.currentBalance.tokenB;
			
			// Update statistics
			cache.statistics = cache.statistics || { trades: 0, profits: 0, losses: 0 };
			cache.statistics.trades++;
			cache.statistics.profits++;
			
			// Log micro trading metrics
			const engineStatus = microEngine.getStatus();
			if (engineStatus.metrics.totalTrades % 10 === 0 && engineStatus.metrics.totalTrades > 0) {
				const successRate = ((engineStatus.metrics.successfulTrades / engineStatus.metrics.totalTrades) * 100).toFixed(1);
				console.log(`📊 Micro Stats: ${engineStatus.metrics.totalTrades} trades, ${successRate}% success`);
			}
			
		} else {
			console.log(`❌ Micro trading failed: ${result.reason}`);
			cache.statistics = cache.statistics || { trades: 0, profits: 0, losses: 0 };
			cache.statistics.trades++;
			cache.statistics.losses++;
		}
		
		// Wait before next iteration
		await waitabit(cache.config.minInterval || 1000);
		
		return result;
	} catch (error) {
		console.error('🚨 Micro trading error:', error);
		await waitabit(cache.config.minInterval || 1000);
		return { success: false, error: error.message };
	}
};

const watcher = async (jupiter, tokenA, tokenB) => {
	if (
		!cache.swappingRightNow &&
		Object.keys(cache.queue).length < cache.queueThrottle
	) {
		// Enhanced strategy routing with new strategies
		if (cache.config.tradingStrategy === "pingpong") {
			await pingpongStrategy(jupiter, tokenA, tokenB);
		} else if (cache.config.tradingStrategy === "arbitrage") {
			await arbitrageStrategy(jupiter, tokenA);
		} else if (cache.config.tradingStrategy === "memecoin-arbitrage") {
			await memeCoinArbitrageStrategy(jupiter, tokenA, tokenB);
		} else if (cache.config.tradingStrategy === "micro-trading") {
			await microTradingStrategy(jupiter, tokenA, tokenB);
		} else {
			// Default to pingpong for unknown strategies
			console.log(`⚠️ Unknown strategy: ${cache.config.tradingStrategy}, defaulting to pingpong`);
			await pingpongStrategy(jupiter, tokenA, tokenB);
		}
	}
};

const run = async () => {
	try {
		// set everything up
        const { jupiter, tokenA, tokenB, wallet } = await setup();

		// Set pubkey display
		const walpubkeyfull = wallet.publicKey.toString();
		console.log(`Wallet Enabled: ${walpubkeyfull}`);
		cache.walletpubkeyfull = walpubkeyfull;
		cache.walletpubkey = walpubkeyfull.slice(0,5) + '...' + walpubkeyfull.slice(walpubkeyfull.length-3);

		// Enhanced initialization for new strategies
		if (cache.config.tradingStrategy === "pingpong") {
			// set initial & current & last balance for tokenA
			console.log('Trade Size is:'+cache.config.tradeSize.value);

			cache.initialBalance.tokenA = toNumber(
				cache.config.tradeSize.value,
				tokenA.decimals
			);
			cache.currentBalance.tokenA = cache.initialBalance.tokenA;
			cache.lastBalance.tokenA = cache.initialBalance.tokenA;

			// Double check the wallet has sufficient amount of tokenA
			var realbalanceTokenA = await checkTokenABalance(tokenA,cache.initialBalance.tokenA);

			// set initial & last balance for tokenB
			cache.initialBalance.tokenB = await getInitialotherAmountThreshold(
				jupiter,
				tokenA,
				tokenB,
				cache.initialBalance.tokenA
			);
			cache.lastBalance.tokenB = cache.initialBalance.tokenB;
		} else if (cache.config.tradingStrategy === "arbitrage") {
			// set initial & current & last balance for tokenA
			cache.initialBalance.tokenA = toNumber(
				cache.config.tradeSize.value,
				tokenA.decimals
			);

			cache.currentBalance.tokenA = cache.initialBalance.tokenA;
			cache.lastBalance.tokenA = cache.initialBalance.tokenA;

			// Double check the wallet has sufficient amount of tokenA
			var realbalanceTokenA = await checkTokenABalance(tokenA,cache.initialBalance.tokenA);

			if (realbalanceTokenA<cache.initialBalance.tokenA){
				console.log('Balance Lookup is too low for token: '+realbalanceTokenA+' < '+cache.initialBalance.tokenA);
				process.exit();
			}
		} else if (cache.config.tradingStrategy === "memecoin-arbitrage" || cache.config.tradingStrategy === "micro-trading") {
			// Enhanced setup for new strategies
			console.log(`🎭 Setting up ${cache.config.tradingStrategy} strategy`);
			console.log(`💰 Trade size: $${cache.config.tradeSize?.value || cache.config.tradeSize?.baseAmount || 1.0}`);
			
			const tradeSize = cache.config.tradeSize?.value || cache.config.tradeSize?.baseAmount || 1.0;
			
			cache.initialBalance.tokenA = toNumber(tradeSize, tokenA.decimals);
			cache.currentBalance.tokenA = cache.initialBalance.tokenA;
			cache.lastBalance.tokenA = cache.initialBalance.tokenA;

			// Check wallet balance
			var realbalanceTokenA = await checkTokenABalance(tokenA, cache.initialBalance.tokenA);
			
			if (realbalanceTokenA < cache.initialBalance.tokenA) {
				console.log(`⚠️ Insufficient balance: ${realbalanceTokenA} < ${cache.initialBalance.tokenA}`);
				console.log(`💡 Consider reducing trade size or funding wallet`);
			}

			// Set up tokenB balance for meme coin strategies
			try {
				cache.initialBalance.tokenB = await getInitialotherAmountThreshold(
					jupiter,
					tokenA,
					tokenB,
					cache.initialBalance.tokenA
				);
				cache.lastBalance.tokenB = cache.initialBalance.tokenB;
			} catch (error) {
				console.log(`⚠️ Could not set tokenB balance: ${error.message}`);
				cache.initialBalance.tokenB = 0;
				cache.lastBalance.tokenB = 0;
			}

			// Initialize statistics
			cache.statistics = { trades: 0, profits: 0, losses: 0, startTime: Date.now() };
			
			// Initialize sideBuy for ping pong mode
			cache.sideBuy = true;
		}

		// Log strategy information
		console.log(`🚀 Starting ${cache.config.tradingStrategy.toUpperCase()} strategy`);
		console.log(`⚡ Min interval: ${cache.config.minInterval}ms`);
		console.log(`🎯 Min profit: ${cache.config.minPercProfit}%`);

		global.botInterval = setInterval(
			() => watcher(jupiter, tokenA, tokenB),
			cache.config.minInterval
		);
	} catch (error) {
		logExit(error);
		process.exitCode = 1;
	}
};

run();

// handle exit
process.on("exit", handleExit);
