const CONFIG_INITIAL_STATE = {
	showHelp: true,
	nav: {
		currentStep: 0,
		steps: [
			"network",
			"rpc",
			"strategy",
			"tokens",
			"trading size",
			"profit",
			"slippage",
			"priority",
			"safety",
			"advanced",
			"confirm",
		],
	},
	config: {
		network: {
			value: "",
			isSet: false,
		},
		rpc: {
			value: [],
			isSet: false,
			state: {
				items: [
					// Primary RPC from environment variable
					{
						label:
							process.env.DEFAULT_RPC || "https://api.mainnet-beta.solana.com",
						value:
							process.env.DEFAULT_RPC || "https://api.mainnet-beta.solana.com",
						isSelected: true,
					},
					// Comprehensive RPC list
					{
						label:
							"Helius (Premium) - https://mainnet.helius-rpc.com/?api-key=YOUR_KEY",
						value: "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY",
						isSelected: false,
					},
					{
						label: "GS Node (Premium) - https://rpc.gsnode.io",
						value: "https://rpc.gsnode.io",
						isSelected: false,
					},
					{
						label:
							"Chainstack (Premium) - https://solana-mainnet.chainstacklabs.com",
						value: "https://solana-mainnet.chainstacklabs.com",
						isSelected: false,
					},
					{
						label:
							"QuickNode (Premium) - https://solana-mainnet.rpc.quicknode.com",
						value: "https://solana-mainnet.rpc.quicknode.com",
						isSelected: false,
					},
					{
						label: "Ankr (Free/Premium) - https://rpc.ankr.com/solana",
						value: "https://rpc.ankr.com/solana",
						isSelected: false,
					},
					{
						label: "dRPC (Free) - https://solana.drpc.org/",
						value: "https://solana.drpc.org/",
						isSelected: false,
					},
					{
						label: "LeoRPC (Free) - https://solana.leorpc.com/?api_key=FREE",
						value: "https://solana.leorpc.com/?api_key=FREE",
						isSelected: false,
					},
					{
						label:
							"Solana Foundation (Free) - https://api.mainnet-beta.solana.com",
						value: "https://api.mainnet-beta.solana.com",
						isSelected: false,
					},
					// Additional RPCs from environment variable
					...String(process.env.ALT_RPC_LIST || "")
						.split(",")
						.filter((item) => item.trim() !== "")
						.map((item) => ({
							label: `Custom RPC - ${item.trim()}`,
							value: item.trim(),
							isSelected: false,
						})),
				],
			},
		},
		strategy: {
			value: "",
			isSet: false,
		},
		tokens: {
			value: {
				tokenA: { symbol: "", address: "" },
				tokenB: { symbol: "", address: "" },
			},
			isSet: {
				tokenA: false,
				tokenB: false,
			},
		},
		"trading size": {
			value: {
				strategy: "",
				value: "",
			},
			isSet: false,
		},
		profit: {
			value: 1,
			isSet: {
				percent: false,
				strategy: false,
			},
		},
		slippage: {
			value: 0,
			isSet: false,
		},
		priority: {
			value: 0,
			isSet: false,
		},
		advanced: {
			value: {
				minInterval: 100,
				safetyLevel: "BALANCED",
				maxRiskPerTrade: 0.02,
				maxDailyLoss: 0.1,
				maxConcurrentTrades: 3,
				cooldownPeriod: 5000,
				ammStrategy: "OPTIMIZED", // FAST, OPTIMIZED, COMPREHENSIVE
			},
			isSet: {
				minInterval: false,
				safetyLevel: false,
				maxRiskPerTrade: false,
				maxDailyLoss: false,
				maxConcurrentTrades: false,
				cooldownPeriod: false,
				ammStrategy: false,
			},
		},
	},
};

module.exports = {
	DISCORD_INVITE_URL: "https://discord.gg/jupiter",
	CONFIG_INITIAL_STATE,
};
