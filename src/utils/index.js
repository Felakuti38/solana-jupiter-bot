const chalk = require("chalk");
const fs = require("fs");
const ora = require("ora-classic");
const { logExit } = require("../bot/exit");
const JSBI = require('jsbi');
const bs58 = require("bs58");
const { PublicKey, Connection, Keypair } = require("@solana/web3.js");
const { TRADING_CONSTANTS } = require("./constants");
require("dotenv").config();

const createTempDir = () => !fs.existsSync("./temp") && fs.mkdirSync("./temp");

const getCircularReplacer = () => {
  const seen = new WeakSet();
  return (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    } else if (typeof value === "bigint") {
        value = value.toString();
    }
    return value;
  };
};

const storeItInTempAsJSON = (filename, data) =>
        fs.writeFileSync(`./temp/${filename}.json`, JSON.stringify(data, getCircularReplacer(), 2));

const createConfigFile = (config) => {
	const configSpinner = ora({
		text: "Creating config...",
		discardStdin: false,
	}).start();
	
	// Set the adaptive slippage setting based on initial configuration
	const adaptiveslippage = config?.adaptiveslippage?.value ?? 0;

	const configValues = {
		network: config.network.value,
		rpc: config.rpc.value,
		tradingStrategy: config.strategy.value,
		tokenA: config.tokens.value.tokenA,
		tokenB: config.tokens.value.tokenB,
		slippage: config.slippage.value,
		adaptiveSlippage: adaptiveslippage,
		priority: config.priority.value,
		minPercProfit: config.profit.value,
		minInterval: parseInt(config.advanced.value.minInterval),
		tradeSize: {
			value: parseFloat(config["trading size"].value.value),
			strategy: config["trading size"].value.strategy,
		},
		ui: {
			defaultColor: "cyan",
		},
		storeFailedTxInHistory: true,
	};

	fs.writeFileSync("./config.json", JSON.stringify(configValues, null, 2), {});
	configSpinner.succeed("Config created!");
};

const verifyConfig = (config) => {
	let result = true;
	const badConfig = [];
	Object.entries(config).forEach(([key, value]) => {
		const isSet = value.isSet;
		const isSectionSet =
			isSet instanceof Object
				? Object.values(isSet).every((value) => value === true)
				: isSet;

		if (!isSectionSet) {
			result = false;
			badConfig.push(key);
		}
	});
	return { result, badConfig };
};

/**
 * It loads the config file and returns the config object
 * @returns The config object
 */
const loadConfigFile = ({ showSpinner = false }) => {
	let config = {};
	let spinner;
	if (showSpinner) {
		spinner = ora({
			text: "Loading config...",
			discardStdin: false,
		}).start();
	}

	if (fs.existsSync("./config.json")) {
		config = JSON.parse(fs.readFileSync("./config.json"));
		spinner?.succeed("Config loaded!");
		return config;
	}

	spinner?.fail(chalk.redBright("Loading config failed!\n"));
	throw new Error("\nNo config.json file found!\n");
};

const calculateProfit = ((oldVal, newVal) => ((newVal - oldVal) / oldVal) * 100);

const toDecimal = (number, decimals) =>
	parseFloat(String(number) / 10 ** decimals).toFixed(decimals);


const toNumber = (number, decimals) => 
	Math.floor(String(number) * 10 ** decimals);

/**
 * It calculates the number of iterations per minute and updates the cache.
 */
const updateIterationsPerMin = (cache) => {
	const iterationTimer =
		(performance.now() - cache.iterationPerMinute.start) / 1000;

	if (iterationTimer >= 60) {
		cache.iterationPerMinute.value = Number(
			cache.iterationPerMinute.counter.toFixed()
		);
		cache.iterationPerMinute.start = performance.now();
		cache.iterationPerMinute.counter = 0;
	} else cache.iterationPerMinute.counter++;
};

const checkRoutesResponse = (routes) => {
	if (Object.hasOwn(routes, "routesInfos")) {
		if (routes.routesInfos.length === 0) {
			console.log(routes);
			logExit(1, {
				message: "No routes found or something is wrong with RPC / Jupiter! ",
			});
			process.exit(1);
		}
	} else {
		console.log(routes);
		logExit(1, {
			message: "Something is wrong with RPC / Jupiter! ",
		});
		process.exit(1);
	}
};

function displayMessage(message) {
    console.clear(); // Clear console before displaying message
    const lineLength = 50; // Length of each line
    const paddingLength = Math.max(0, Math.floor((lineLength - message.length) / 2)); // Calculate padding length for centering, ensuring it's non-negative
    const padding = "-".repeat(paddingLength); // Create padding string
    const displayMessage = `${padding}\x1b[93m${message}\x1b[0m${padding}`; // Create display message with padding and light yellow color ANSI escape codes

	console.log("\n");
	console.log(`\x1b[1m${'SOLANA JUPITER BOT SETUP TESTS'}\x1b[0m\n`); 
	console.log("\x1b[93m*\x1b[0m".repeat(lineLength / 2)); // Display top border in light yellow
    console.log(`\n${displayMessage}\n`); // Display message
    console.log("\x1b[93m*\x1b[0m".repeat(lineLength / 2)); // Display bottom border in light yellow
	console.log("\n");
}

const checkForEnvFile = () => {
	if (!fs.existsSync("./.env")) {
		displayMessage("Please refer to the readme to set up the Bot properly.\n\nYou have not created the .ENV file yet.\n\nRefer to the .env.example file.");
		logExit(1, {
			message: "No .env file found! ",
		});
		process.exit(1);
	}
};
const checkWallet = () => {
	if (
		!process.env.SOLANA_WALLET_PRIVATE_KEY ||
		(process.env.SOLANA_WALLET_PUBLIC_KEY &&
			process.env.SOLANA_WALLET_PUBLIC_KEY?.length !== 88)
	) {
		displayMessage(`${process.env.SOLANA_WALLET_PUBLIC_KEY} Your wallet is not valid. \n\nCheck the .env file and ensure you have put in the private key in the correct format. \n\ni.e. SOLANA_WALLET_PRIVATE_KEY=3QztVpoRgLNvAmBX9Yo3cjR3bLrXVrJZbPW5BY7GXq8GFvEjR4xEDeVai85a8WtYUCePvMx27eBut5K2kdqN8Hks`);
		process.exit(1);
	}
}

const checkArbReady = async () => {
	// ARB token requirement removed - bot is now open to all users
	return true;
};

// New safety check utilities
const { Connection, PublicKey } = require("@solana/web3.js");
const axios = require("axios");

/**
 * Analyze token contract for potential risks
 */
const analyzeTokenContract = async (tokenAddress, connection) => {
	try {
		const tokenPublicKey = new PublicKey(tokenAddress);
		
		// Get token account info
		const accountInfo = await connection.getAccountInfo(tokenPublicKey);
		if (!accountInfo) {
			return { riskScore: 100, risks: ["Token account not found"] };
		}

		// Get token metadata
		const metadata = await connection.getParsedAccountInfo(tokenPublicKey);
		
		// Basic risk assessment
		let riskScore = 0;
		const risks = [];

		// Check if token has reasonable supply
		if (metadata?.value?.data?.parsed?.info?.supply) {
			const supply = Number(metadata.value.data.parsed.info.supply);
			if (supply < TRADING_CONSTANTS.MIN_SUPPLY) { // Less than 1M supply
				riskScore += 20;
				risks.push("Low supply token");
			}
		}

		// Check decimals
		if (metadata?.value?.data?.parsed?.info?.decimals > TRADING_CONSTANTS.MAX_DECIMALS) {
			riskScore += 15;
			risks.push("Unusual decimals");
		}

		return { riskScore: Math.min(riskScore, 100), risks };
	} catch (error) {
		console.log("Contract analysis error:", error.message);
		return { riskScore: 50, risks: ["Analysis failed"] };
	}
};

/**
 * Check token liquidity across major DEXes
 */
const checkLiquidity = async (tokenAddress) => {
	try {
		// This would ideally check multiple DEXes
		// For now, we'll use a simplified approach
		const response = await axios.get(`https://public-api.solscan.io/token/meta?tokenAddress=${tokenAddress}`);
		
		if (response.data && response.data.data) {
			const data = response.data.data;
			
			// Calculate liquidity score based on available data
			let liquidityScore = 0;
			
			if (data.price) {
				liquidityScore += 30;
			}
			if (data.volume24h) {
				liquidityScore += 30;
			}
			if (data.marketCap) {
				liquidityScore += 40;
			}
			
			return liquidityScore;
		}
		
		return 0;
	} catch (error) {
		console.log("Liquidity check error:", error.message);
		return 0;
	}
};

/**
 * Check 24h volume for token
 */
const check24hVolume = async (tokenAddress) => {
	try {
		const response = await axios.get(`https://public-api.solscan.io/token/meta?tokenAddress=${tokenAddress}`);
		
		if (response.data && response.data.data && response.data.data.volume24h) {
			return Number(response.data.data.volume24h);
		}
		
		return 0;
	} catch (error) {
		console.log("Volume check error:", error.message);
		return 0;
	}
};

/**
 * Simulate transaction to check for unexpected fees
 */
const simulateTransaction = async (jupiter, route) => {
	try {
		const simulation = await jupiter.simulateTransaction({
			routeInfo: route,
			userPublicKey: route.userPublicKey
		});
		
		if (simulation.error) {
			return { 
				success: false, 
				error: simulation.error,
				fee: 0,
				estimatedOutput: 0
			};
		}
		
		// Calculate estimated fee
		const estimatedFee = simulation.fee || 0;
		const estimatedOutput = simulation.outputAmount || route.outAmount;
		
		return {
			success: true,
			fee: estimatedFee,
			estimatedOutput: estimatedOutput,
			priceImpact: simulation.priceImpact || 0
		};
	} catch (error) {
		console.log("Transaction simulation error:", error.message);
		return { 
			success: false, 
			error: error.message,
			fee: 0,
			estimatedOutput: 0
		};
	}
};

/**
 * Calculate dynamic position size based on risk
 */
const calculatePositionSize = (balance, riskScore, maxRiskPerTrade = 0.02) => {
	// Kelly criterion inspired position sizing
	const riskAdjustedSize = Math.max(0.01, 1 - (riskScore / 100)); // Minimum 1%
	const positionSize = balance * maxRiskPerTrade * riskAdjustedSize;
	
	return Math.min(positionSize, balance * 0.1); // Max 10% of balance
};

/**
 * Get AMM configuration based on strategy
 */
const getAMMConfiguration = (strategy = 'OPTIMIZED') => {
	const ammConfigs = {
		FAST: {
			// Only the fastest, most liquid AMMs
			enabled: ['Raydium', 'Raydium CLMM', 'Orca', 'Openbook'],
			description: 'Fastest execution, major DEXes only'
		},
		OPTIMIZED: {
			// Balanced approach - good liquidity + speed
			enabled: [
				'Raydium', 'Raydium CLMM', 'Orca', 'Orca (Whirlpools)', 
				'Openbook', 'Phoenix', 'Meteora', 'Lifinity', 'Lifinity V2',
				'Saber', 'Mercurial'
			],
			description: 'Balanced speed and liquidity'
		},
		COMPREHENSIVE: {
			// All AMMs except risky ones
			enabled: [
				'Raydium', 'Raydium CLMM', 'Orca', 'Orca (Whirlpools)',
				'Openbook', 'Phoenix', 'Meteora', 'Lifinity', 'Lifinity V2',
				'Saber', 'Mercurial', 'Aldrin', 'Crema', 'DeltaFi', 'Invariant',
				'Penguin', 'Saros', 'Sencha', 'Marco Polo', 'Oasis', 'BonkSwap'
			],
			description: 'Maximum coverage, slower execution'
		}
	};
	
	return ammConfigs[strategy] || ammConfigs.OPTIMIZED;
};

/**
 * Comprehensive pre-trade safety check
 */
const preTradeSafetyCheck = async (jupiter, route, token, balance, safetyLevel = 'BALANCED') => {
	const safetyConfigs = {
		FAST: {
			preChecks: false,
			simulation: false,
			contractAnalysis: false,
			minLiquidity: 0,
			minVolume: 0,
			maxRiskScore: 100
		},
		BALANCED: {
			preChecks: true,
			simulation: true,
			contractAnalysis: false,
			minLiquidity: 30,
			minVolume: 1000,
			maxRiskScore: 70
		},
		SAFE: {
			preChecks: true,
			simulation: true,
			contractAnalysis: true,
			minLiquidity: 50,
			minVolume: 10000,
			maxRiskScore: 50
		}
	};

	const config = safetyConfigs[safetyLevel] || safetyConfigs.BALANCED;
	const connection = new Connection(process.env.DEFAULT_RPC);
	
	// Update safety statistics
	if (global.cache) {
		global.cache.safetyStats.totalSafetyChecks++;
		global.cache.safetyStats.lastSafetyCheck = new Date();
	}
	
	try {
		// 1. Contract analysis (if enabled)
		if (config.contractAnalysis) {
			const contractAnalysis = await analyzeTokenContract(token.address, connection);
			if (contractAnalysis.riskScore > config.maxRiskScore) {
				if (global.cache) {
					global.cache.safetyStats.failedSafetyChecks++;
				}
				return {
					safe: false,
					reason: `Contract risk too high: ${contractAnalysis.riskScore}/100`,
					details: contractAnalysis.risks
				};
			}
		}

		// 2. Liquidity check (if enabled)
		if (config.preChecks) {
			const liquidityScore = await checkLiquidity(token.address);
			if (liquidityScore < config.minLiquidity) {
				if (global.cache) {
					global.cache.safetyStats.failedSafetyChecks++;
				}
				return {
					safe: false,
					reason: `Insufficient liquidity: ${liquidityScore}/100`,
					details: { liquidityScore, required: config.minLiquidity }
				};
			}
		}

		// 3. Volume check (if enabled)
		if (config.preChecks) {
			const volume24h = await check24hVolume(token.address);
			if (volume24h < config.minVolume) {
				if (global.cache) {
					global.cache.safetyStats.failedSafetyChecks++;
				}
				return {
					safe: false,
					reason: `Low 24h volume: $${volume24h}`,
					details: { volume24h, required: config.minVolume }
				};
			}
		}

		// 4. Transaction simulation (if enabled)
		if (config.simulation) {
			const simulation = await simulateTransaction(jupiter, route);
			if (!simulation.success) {
				if (global.cache) {
					global.cache.safetyStats.failedSafetyChecks++;
				}
				return {
					safe: false,
					reason: `Transaction simulation failed: ${simulation.error}`,
					details: simulation
				};
			}
			
					// Check for excessive fees
		const feePercentage = (simulation.fee / balance) * 100;
		if (feePercentage > TRADING_CONSTANTS.MAX_FEE_PERCENTAGE) { // More than 5% fee
			if (global.cache) {
				global.cache.safetyStats.failedSafetyChecks++;
			}
			return {
				safe: false,
				reason: `Excessive fees: ${feePercentage.toFixed(2)}%`,
				details: { fee: simulation.fee, feePercentage }
			};
		}
		}

		// 5. Calculate dynamic position size
		const contractAnalysis = config.contractAnalysis ? 
			await analyzeTokenContract(token.address, connection) : 
			{ riskScore: 50 };
		
		const positionSize = calculatePositionSize(balance, contractAnalysis.riskScore);

		return {
			safe: true,
			positionSize,
			riskScore: contractAnalysis.riskScore,
			details: {
				liquidityScore: config.preChecks ? await checkLiquidity(token.address) : 0,
				volume24h: config.preChecks ? await check24hVolume(token.address) : 0,
				simulation: config.simulation ? await simulateTransaction(jupiter, route) : null
			}
		};
	} catch (error) {
		console.log("Safety check error:", error.message);
		return {
			safe: false,
			reason: `Safety check failed: ${error.message}`,
			details: { error: error.message }
		};
	}
};

module.exports = {
	createTempDir,
	storeItInTempAsJSON,
	createConfigFile,
	loadConfigFile,
	verifyConfig,
	calculateProfit,
	toDecimal,
	toNumber,
	updateIterationsPerMin,
	checkRoutesResponse,
	checkForEnvFile,
	checkArbReady,
	checkWallet,
	// New safety functions
	analyzeTokenContract,
	checkLiquidity,
	check24hVolume,
	simulateTransaction,
	calculatePositionSize,
	preTradeSafetyCheck,
	// AMM configuration
	getAMMConfiguration,
};
