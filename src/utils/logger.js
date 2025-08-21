/**
 * Structured logging utility for the Solana Jupiter Bot
 * Provides consistent logging format with levels, timestamps, and metadata
 */

const chalk = require("chalk");

class Logger {
	constructor() {
		this.correlationId = this.generateCorrelationId();
	}

	generateCorrelationId() {
		return `bot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	formatMessage(level, message, meta = {}) {
		const timestamp = new Date().toISOString();
		const logEntry = {
			level,
			message,
			timestamp,
			correlationId: this.correlationId,
			...meta,
		};

		return JSON.stringify(logEntry);
	}

	info(message, meta = {}) {
		const formatted = this.formatMessage("info", message, meta);
		console.log(chalk.blue(`[INFO] ${formatted}`));
	}

	success(message, meta = {}) {
		const formatted = this.formatMessage("success", message, meta);
		console.log(chalk.green(`[SUCCESS] ${formatted}`));
	}

	warn(message, meta = {}) {
		const formatted = this.formatMessage("warn", message, meta);
		console.warn(chalk.yellow(`[WARN] ${formatted}`));
	}

	error(message, meta = {}) {
		const formatted = this.formatMessage("error", message, meta);
		console.error(chalk.red(`[ERROR] ${formatted}`));
	}

	debug(message, meta = {}) {
		if (process.env.DEBUG === "true") {
			const formatted = this.formatMessage("debug", message, meta);
			console.log(chalk.gray(`[DEBUG] ${formatted}`));
		}
	}

	trade(message, meta = {}) {
		const formatted = this.formatMessage("trade", message, meta);
		console.log(chalk.cyan(`[TRADE] ${formatted}`));
	}

	safety(message, meta = {}) {
		const formatted = this.formatMessage("safety", message, meta);
		console.log(chalk.magenta(`[SAFETY] ${formatted}`));
	}

	performance(message, meta = {}) {
		const formatted = this.formatMessage("performance", message, meta);
		console.log(chalk.cyan(`[PERF] ${formatted}`));
	}

	// Legacy support for existing console.log calls
	log(message, meta = {}) {
		this.info(message, meta);
	}
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
