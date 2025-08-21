const React = require("react");
const { Box, Text } = require("ink");
const { default: SelectInput } = require("ink-select-input");
const { useContext, useState, useEffect, useRef } = require("react");
const WizardContext = require("../WizardContext");
const { default: TextInput } = require("ink-text-input");
const chalk = require("chalk");

const SAFETY_LEVELS = [
	{ label: "FAST - Minimal checks, maximum speed", value: "FAST" },
	{ label: "BALANCED - Moderate safety, good speed", value: "BALANCED" },
	{ label: "SAFE - Maximum safety, slower execution", value: "SAFE" },
];

const Indicator = ({ label, value }) => {
	const {
		config: {
			advanced: { value: selectedValue },
		},
	} = useContext(WizardContext);

	const isSelected = value === selectedValue.safetyLevel;

	return <Text>{chalk[isSelected ? "greenBright" : "white"](`${label}`)}</Text>;
};

function Safety() {
	const { configSetValue, config } = useContext(WizardContext);
	let isMountedRef = useRef(false);

	// const [tempSafetyLevel, setTempSafetyLevel] = useState(SAFETY_LEVELS[1]); // Default to BALANCED
	const [maxRiskPerTrade, setMaxRiskPerTrade] = useState("2");
	const [maxDailyLoss, setMaxDailyLoss] = useState("10");
	const [maxConcurrentTrades, setMaxConcurrentTrades] = useState("3");
	const [cooldownPeriod, setCooldownPeriod] = useState("5000");
	const [inputBorderColor, setInputBorderColor] = useState("gray");

	const handleSafetyLevelSelect = (safety) => {
		const value = safety.value;
		// setTempSafetyLevel(value);
		configSetValue("advanced", {
			...config.advanced.value,
			safetyLevel: value,
		}, true);
	};

	const handleMaxRiskPerTradeChange = (value) => {
		const badChars = /[^0-9.]/g;
		badChars.test(value)
			? setInputBorderColor("red")
			: setInputBorderColor("gray");
		const sanitizedValue = value.replace(badChars, "");
		setMaxRiskPerTrade(sanitizedValue);
		setTimeout(() => isMountedRef.current && setInputBorderColor("gray"), 100);
	};

	const handleMaxRiskPerTradeSubmit = () => {
		const value = Number(maxRiskPerTrade) / 100; // Convert percentage to decimal
		configSetValue("advanced", {
			...config.advanced.value,
			maxRiskPerTrade: value,
		});
	};

	const handleMaxDailyLossChange = (value) => {
		const badChars = /[^0-9.]/g;
		const sanitizedValue = value.replace(badChars, "");
		setMaxDailyLoss(sanitizedValue);
	};

	const handleMaxDailyLossSubmit = () => {
		const value = Number(maxDailyLoss) / 100; // Convert percentage to decimal
		configSetValue("advanced", {
			...config.advanced.value,
			maxDailyLoss: value,
		});
	};

	const handleMaxConcurrentTradesChange = (value) => {
		const badChars = /[^0-9]/g;
		const sanitizedValue = value.replace(badChars, "");
		setMaxConcurrentTrades(sanitizedValue);
	};

	const handleMaxConcurrentTradesSubmit = () => {
		configSetValue("advanced", {
			...config.advanced.value,
			maxConcurrentTrades: Number(maxConcurrentTrades),
		});
	};

	const handleCooldownPeriodChange = (value) => {
		const badChars = /[^0-9]/g;
		const sanitizedValue = value.replace(badChars, "");
		setCooldownPeriod(sanitizedValue);
	};

	const handleCooldownPeriodSubmit = () => {
		configSetValue("advanced", {
			...config.advanced.value,
			cooldownPeriod: Number(cooldownPeriod),
		});
	};

	useEffect(() => {
		isMountedRef.current = true;
		return () => (isMountedRef.current = false);
	}, []);

	return (
		<Box flexDirection="column">
			<Text>
				Configure <Text color="#cdadff">safety levels</Text> and risk management
			</Text>
			<Text color="gray">Higher safety = slower but safer trading</Text>
			
			<Box margin={1} flexDirection="column">
				<Text bold>Safety Level:</Text>
				<SelectInput
					items={SAFETY_LEVELS}
					itemComponent={Indicator}
					onSelect={handleSafetyLevelSelect}
				/>
			</Box>

			<Box margin={1} flexDirection="column">
				<Text bold>Risk Management:</Text>
				
				<Box flexDirection="row" alignItems="center" marginTop={1}>
					<Text>Max risk per trade (%):</Text>
					<Box
						borderStyle="round"
						borderColor={inputBorderColor}
						marginLeft={1}
					>
						<TextInput
							value={maxRiskPerTrade}
							onChange={handleMaxRiskPerTradeChange}
							onSubmit={handleMaxRiskPerTradeSubmit}
						/>
					</Box>
				</Box>

				<Box flexDirection="row" alignItems="center" marginTop={1}>
					<Text>Max daily loss (%):</Text>
					<Box
						borderStyle="round"
						borderColor="gray"
						marginLeft={1}
					>
						<TextInput
							value={maxDailyLoss}
							onChange={handleMaxDailyLossChange}
							onSubmit={handleMaxDailyLossSubmit}
						/>
					</Box>
				</Box>

				<Box flexDirection="row" alignItems="center" marginTop={1}>
					<Text>Max concurrent trades:</Text>
					<Box
						borderStyle="round"
						borderColor="gray"
						marginLeft={1}
					>
						<TextInput
							value={maxConcurrentTrades}
							onChange={handleMaxConcurrentTradesChange}
							onSubmit={handleMaxConcurrentTradesSubmit}
						/>
					</Box>
				</Box>

				<Box flexDirection="row" alignItems="center" marginTop={1}>
					<Text>Cooldown period (ms):</Text>
					<Box
						borderStyle="round"
						borderColor="gray"
						marginLeft={1}
					>
						<TextInput
							value={cooldownPeriod}
							onChange={handleCooldownPeriodChange}
							onSubmit={handleCooldownPeriodSubmit}
						/>
					</Box>
				</Box>
			</Box>

			<Box margin={1} flexDirection="column">
				<Text color="yellow">Safety Features:</Text>
				<Text color="gray">• Contract analysis (SAFE mode)</Text>
				<Text color="gray">• Liquidity & volume checks</Text>
				<Text color="gray">• Transaction simulation</Text>
				<Text color="gray">• Dynamic position sizing</Text>
				<Text color="gray">• Fee analysis</Text>
			</Box>
		</Box>
	);
}

module.exports = Safety;