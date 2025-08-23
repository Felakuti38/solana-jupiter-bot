console.log(">>> RUNNING ENTRY:", __filename, "at", new Date().toISOString());
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

// CLMM protection utility
const { robustRouteComputation, isClmmRelatedError } = require("../utils/clmmProtection");

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

				if (slippagerevised>500) {
					// Make sure on really big numbers it is only 30% of the total
					slippagerevised = (0.3*slippagerevised).toFixed(3);
				} else {
					slippagerevised = (0.8*slippagerevised).toFixed(3);
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

		// check profitability and execute tx
		let tx, performanceOfTx;
		if (
			!cache.swappingRightNow &&
			(cache.hotkeys.e ||
				cache.hotkeys.r ||
				simulatedProfit >= cache.config.minPercProfit)
		) {
			// hotkeys
			if (cache.hotkeys.e) {
				console.log("[E] PRESSED - EXECUTION FORCED BY USER!");
				cache.hotkeys.e = false;
			}
			if (cache.hotkeys.r) {
				console.log("[R] PRESSED - REVERT BACK SWAP!");
				route.otherAmountThreshold = 0;
			}

			if (cache.tradingEnabled || cache.hotkeys.r) {
				cache.swappingRightNow = true;
				// store trade to the history
				let tradeEntry = {
					date: date.toLocaleString(),
					buy: cache.sideBuy,
					inputToken: inputToken.symbol,
					outputToken: outputToken.symbol,
					inAmount: toDecimal(route.amount, inputToken.decimals),
					expectedOutAmount: toDecimal(route.outAmount, outputToken.decimals),
					expectedProfit: simulatedProfit,
					slippage: slippagerevised,
				};

				// start refreshing status
				const printTxStatus = setInterval(() => {
					if (cache.swappingRightNow) {
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
					}
				}, 50);

				[tx, performanceOfTx] = await swap(jupiter, route);

				// stop refreshing status
				clearInterval(printTxStatus);

				const profit = calculateProfit(
					cache.currentBalance[cache.sideBuy ? "tokenB" : "tokenA"],
					tx.outputAmount
				);

				tradeEntry = {
					...tradeEntry,
					outAmount: tx.outputAmount || 0,
					profit,
					performanceOfTx,
					error: tx.error?.code === 6001 ? "Slippage Tolerance Exceeded" : tx.error?.message || null,
				};

				await waitabit(100);

				// handle TX results
				if (tx.error) {
					await failedSwapHandler(tradeEntry, inputToken, amountToTrade);
				}
				else {
					if (cache.hotkeys.r) {
						console.log("[R] - REVERT BACK SWAP - SUCCESS!");
						cache.tradingEnabled = false;
						console.log("TRADING DISABLED!");
						cache.hotkeys.r = false;
					}
					await successSwapHandler(tx, tradeEntry, tokenA, tokenB);
				}
			}
		}

		if (tx) {
			if (!tx.error) {
				// change side
				cache.sideBuy = !cache.sideBuy;
			}
			cache.swappingRightNow = false;
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

	} catch (error) {
		cache.queue[i] = 1;
		console.log(error);
	} finally {
		delete cache.queue[i];
	}
};

const arbitrageStrategy = async (jupiter, tokenA, tokenB) => {
	if (tokenA.address === tokenB.address) { 
		throw new Error('Arbitrage requires two distinct tokens (e.g., SOL + USDC).'); 
	}

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
				? cache.currentBalance["tokenA"]
				: cache.initialBalance["tokenA"];
		const baseAmount = amountToTrade;

		//BNI AMT to TRADE
		const amountInJSBI = JSBI.BigInt(amountToTrade);

		// default slippage
		const slippage = typeof cache.config.slippage === "number" ? cache.config.slippage : 1; // 100 is 0.1%

		// set input / output token
		const inputToken = cache.sideBuy ? tokenA : tokenB;
		const outputToken = cache.sideBuy ? tokenB : tokenA;

		// check current routes with CLMM protection
		const performanceOfRouteCompStart = performance.now();
		const routes = await robustRouteComputation(jupiter, {
			inputMint: new PublicKey(inputToken.address),
			outputMint: new PublicKey(outputToken.address),
			amount: amountInJSBI,
			slippageBps: slippage,
			onlyDirectRoutes: true,
			filterTopNResult: 1,
			enforceSingleTx: true,
			excludeDexes: ['Raydium CLMM']
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
		const simulatedProfit = calculateProfit(baseAmount, await JSBI.toNumber(route.outAmount));
		const minPercProfitRnd = getRandomAmt(cache.config.minPercProfit);

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
			tokenB: tokenB,
			route,
			simulatedProfit,
		});

		// check profitability and execute tx
		let tx, performanceOfTx;
		if (
			!cache.swappingRightNow &&
			(cache.hotkeys.e ||
				cache.hotkeys.r ||
				simulatedProfit >= minPercProfitRnd)
		) {
			// hotkeys
			if (cache.hotkeys.e) {
				console.log("[E] PRESSED - EXECUTION FORCED BY USER!");
				cache.hotkeys.e = false;
			}
			if (cache.hotkeys.r) {
				console.log("[R] PRESSED - REVERT BACK SWAP!");
				route.otherAmountThreshold = 0;
			}

			if (cache.tradingEnabled || cache.hotkeys.r) {
				cache.swappingRightNow = true;
				console.log('swappingRightNow');
				let tradeEntry = {
					date: date.toLocaleString(),
					buy: cache.sideBuy,
					inputToken: inputToken.symbol,
					outputToken: outputToken.symbol,
					inAmount: toDecimal(route.amount, inputToken.decimals),
					expectedOutAmount: toDecimal(route.outAmount, outputToken.decimals),
					expectedProfit: simulatedProfit,
				};

				// start refreshing status
				const printTxStatus = setInterval(() => {
					if (cache.swappingRightNow) {
						printToConsole({
							date,
							i,
							performanceOfRouteComp,
							inputToken,
							outputToken,
							tokenA,
							tokenB: tokenB,
							route,
							simulatedProfit,
						});
					}
				}, 250);

				[tx, performanceOfTx] = await swap(jupiter, route);

				// stop refreshing status
				clearInterval(printTxStatus);

				// Calculate the profit of the trade
				const profit = calculateProfit(tradeEntry.inAmount, tx.outputAmount);

				tradeEntry = {
					...tradeEntry,
					outAmount: tx.outputAmount || 0,
					profit,
					performanceOfTx,
					error: tx.error?.code === 6001 ? "Slippage Tolerance Exceeded" : tx.error?.message || null,
					slippage: slippagerevised,
				};

				// handle TX results
				if (tx.error) {
					// Slippage tolerance exceeded
					await failedSwapHandler(tradeEntry, inputToken, amountToTrade);
				} else {
					if (cache.hotkeys.r) {
						console.log("[R] - REVERT BACK SWAP - SUCCESS!");
						cache.tradingEnabled = false;
						console.log("TRADING DISABLED!");
						cache.hotkeys.r = false;
					}
					await successSwapHandler(tx, tradeEntry, tokenA, tokenB);
				}
			}
		}

		if (tx) {
			cache.swappingRightNow = false;
		}

		printToConsole({
			date,
			i,
			performanceOfRouteComp,
			inputToken,
			outputToken,
			tokenA,
			tokenB: tokenB,
			route,
			simulatedProfit,
		});
	} catch (error) {
		cache.queue[i] = 1;
		if (isClmmRelatedError(error)) {
			console.log('⚠️ CLMM route issue detected, continuing with next iteration...');
		} else {
			throw error;
		}
	} finally {
		delete cache.queue[i];
	}
};

// Enhanced Meme Coin Arbitrage Strategy
const memeCoinArbitrageStrategy = async (jupiter, tokenA, tokenB) => {
	try {
		const config = getMemeCoinConfig('aggressive');
		const strategy = new MemeCoinArbitrageStrategy(jupiter, config);
		
		// Execute meme coin arbitrage
		const result = await strategy.execute(tokenA, tokenB);
		
		if (result.success) {
			console.log(`🎭 Meme Coin Arbitrage: ${result.profit}% profit`);
		}
		
		return result;
	} catch (error) {
		console.error('❌ Meme Coin Arbitrage Error:', error.message);
		return { success: false, error: error.message };
	}
};

// Enhanced Micro Trading Strategy
const microTradingStrategy = async (jupiter, tokenA, tokenB) => {
	try {
		const config = getMemeCoinConfig('ultra-micro');
		const engine = new MicroTradingEngine(jupiter, config);
		
		// Execute micro trading
		const result = await engine.execute(tokenA, tokenB);
		
		if (result.success) {
			console.log(`⚡ Micro Trading: ${result.trades} trades, ${result.profit}% profit`);
		}
		
		return result;
	} catch (error) {
		console.error('❌ Micro Trading Error:', error.message);
		return { success: false, error: error.message };
	}
};

const watcher = async (jupiter, tokenA, tokenB) => {
	if (
		!cache.swappingRightNow &&
		Object.keys(cache.queue).length < cache.queueThrottle
	) {
		if (cache.config.tradingStrategy === "pingpong") {
			await pingpongStrategy(jupiter, tokenA, tokenB);
		} else if (cache.config.tradingStrategy === "arbitrage") {
			await arbitrageStrategy(jupiter, tokenA, tokenB);
		} else if (cache.config.tradingStrategy === "memecoin-arbitrage") {
			await memeCoinArbitrageStrategy(jupiter, tokenA, tokenB);
		} else if (cache.config.tradingStrategy === "micro-trading") {
			await microTradingStrategy(jupiter, tokenA, tokenB);
		}
	}
};

async function run() {
	console.log("RUN START");
	try {
		// set everything up
		const { jupiter, tokenA, tokenB, wallet } = await setup();

		// Set pubkey display
		const walpubkeyfull = wallet.publicKey.toString();
		console.log(`Wallet Enabled: ${walpubkeyfull}`);
		cache.walletpubkeyfull = walpubkeyfull;
		cache.walletpubkey = walpubkeyfull.slice(0,5) + '...' + walpubkeyfull.slice(walpubkeyfull.length-3);

		if (cache.config.tradingStrategy === "pingpong") {
			// set initial & current & last balance for tokenA
			console.log('Trade Size is:'+cache.config.tradeSize.value);

			cache.initialBalance.tokenA = toNumber(
				cache.config.tradeSize.value,
				tokenA.decimals
			);
			cache.currentBalance.tokenA = cache.initialBalance.tokenA;
			cache.lastBalance.tokenA = cache.initialBalance.tokenA;

			// Check wallet balance and adjust if necessary
			const realbalanceTokenA = await checkTokenABalance(tokenA, cache.initialBalance.tokenA);
			if (realbalanceTokenA < cache.initialBalance.tokenA) {
				const adj = Math.max(1, Math.floor(realbalanceTokenA * 0.98));
				cache.initialBalance.tokenA = adj;
				cache.currentBalance.tokenA = adj;
				cache.lastBalance.tokenA = adj;
				console.log('⚠️ Adjusted trade size to available balance:', adj);
			}

			// set initial & last balance for tokenB
			cache.initialBalance.tokenB = await getInitialotherAmountThreshold(
				jupiter,
				tokenA,
				tokenB,
				cache.initialBalance.tokenA
			);
			cache.lastBalance.tokenB = cache.initialBalance.tokenB;

		} else if (cache.config.tradingStrategy === "arbitrage") {
			cache.initialBalance.tokenA = toNumber(
				cache.config.tradeSize.value,
				tokenA.decimals
			);
			cache.currentBalance.tokenA = cache.initialBalance.tokenA;
			cache.lastBalance.tokenA = cache.initialBalance.tokenA;

			// Check wallet balance
			const realbalanceTokenA = await checkTokenABalance(tokenA, cache.initialBalance.tokenA);
			if (realbalanceTokenA < cache.initialBalance.tokenA) {
				const adj = Math.max(1, Math.floor(realbalanceTokenA * 0.98));
				cache.initialBalance.tokenA = adj;
				cache.currentBalance.tokenA = adj;
				cache.lastBalance.tokenA = adj;
				console.log('⚠️ Adjusted arbitrage size to available balance:', adj);
			}

		} else if (cache.config.tradingStrategy === "memecoin-arbitrage") {
			// Initialize meme coin arbitrage
			console.log('🎭 Initializing Meme Coin Arbitrage Strategy');
			cache.initialBalance.tokenA = toNumber(cache.config.tradeSize.value, tokenA.decimals);
			cache.currentBalance.tokenA = cache.initialBalance.tokenA;
			
			// Initialize meme coin statistics
			cache.memeCoinStats = {
				totalTrades: 0,
				successfulTrades: 0,
				totalProfit: 0,
				averageProfit: 0
			};

		} else if (cache.config.tradingStrategy === "micro-trading") {
			// Initialize micro trading
			console.log('⚡ Initializing Micro Trading Strategy');
			const microSize = Math.min(cache.config.tradeSize.value, 5); // Max $5 for micro trading
			cache.initialBalance.tokenA = toNumber(microSize, tokenA.decimals);
			cache.currentBalance.tokenA = cache.initialBalance.tokenA;
			
			// Initialize micro trading statistics
			cache.microTradingStats = {
				totalMicroTrades: 0,
				successfulMicroTrades: 0,
				totalMicroProfit: 0,
				averageMicroProfit: 0
			};
		}

		console.log('START LOOP', cache.config.tradingStrategy, cache.config.minInterval);
		global.botInterval = setInterval(
			() => watcher(jupiter, tokenA, tokenB),
			cache.config.minInterval
		);
	} catch (error) {
		logExit(error);
		process.exitCode = 1;
	}
}

// handle exit
process.on("exit", handleExit);

if (require.main === module) run();
