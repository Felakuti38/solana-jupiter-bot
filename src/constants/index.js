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
					{
						label: process.env.DEFAULT_RPC,
						value: process.env.DEFAULT_RPC,
						isSelected: true,
					},
					...String(process.env.ALT_RPC_LIST)
						.split(",")
						.map((item) => ({
							label: item,
							value: item,
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
				maxDailyLoss: 0.10,
				maxConcurrentTrades: 3,
				cooldownPeriod: 5000,
			},
			isSet: {
				minInterval: false,
				safetyLevel: false,
				maxRiskPerTrade: false,
				maxDailyLoss: false,
				maxConcurrentTrades: false,
				cooldownPeriod: false,
			},
		},
	},
};

module.exports = {
	DISCORD_INVITE_URL: "https://discord.gg/jupiter",
	CONFIG_INITIAL_STATE,
};