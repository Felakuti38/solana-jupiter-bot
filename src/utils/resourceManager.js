/**
 * Resource Manager for the Solana Jupiter Bot
 * Handles intervals, timeouts, and prevents memory leaks
 */

const logger = require("./logger");

class ResourceManager {
	constructor() {
		this.intervals = new Set();
		this.timeouts = new Set();
		this.resources = new Map();
		this.cleanupCallbacks = new Set();
	}

	/**
	 * Add an interval and track it for cleanup
	 */
	addInterval(callback, delay, ...args) {
		const interval = setInterval(callback, delay, ...args);
		this.intervals.add(interval);

		logger.debug("Interval added", {
			intervalId: interval,
			delay,
			totalIntervals: this.intervals.size,
		});

		return interval;
	}

	/**
	 * Add a timeout and track it for cleanup
	 */
	addTimeout(callback, delay, ...args) {
		const timeout = setTimeout(callback, delay, ...args);
		this.timeouts.add(timeout);

		logger.debug("Timeout added", {
			timeoutId: timeout,
			delay,
			totalTimeouts: this.timeouts.size,
		});

		return timeout;
	}

	/**
	 * Clear a specific interval
	 */
	clearInterval(interval) {
		if (this.intervals.has(interval)) {
			clearInterval(interval);
			this.intervals.delete(interval);

			logger.debug("Interval cleared", {
				intervalId: interval,
				remainingIntervals: this.intervals.size,
			});
		}
	}

	/**
	 * Clear a specific timeout
	 */
	clearTimeout(timeout) {
		if (this.timeouts.has(timeout)) {
			clearTimeout(timeout);
			this.timeouts.delete(timeout);

			logger.debug("Timeout cleared", {
				timeoutId: timeout,
				remainingTimeouts: this.timeouts.size,
			});
		}
	}

	/**
	 * Add a resource with cleanup callback
	 */
	addResource(name, resource, cleanupCallback) {
		this.resources.set(name, resource);
		if (cleanupCallback) {
			this.cleanupCallbacks.add(cleanupCallback);
		}

		logger.debug("Resource added", {
			name,
			totalResources: this.resources.size,
		});
	}

	/**
	 * Remove a specific resource
	 */
	removeResource(name) {
		const resource = this.resources.get(name);
		if (resource) {
			this.resources.delete(name);

			logger.debug("Resource removed", {
				name,
				remainingResources: this.resources.size,
			});
		}
		return resource;
	}

	/**
	 * Get resource statistics
	 */
	getStats() {
		return {
			intervals: this.intervals.size,
			timeouts: this.timeouts.size,
			resources: this.resources.size,
			cleanupCallbacks: this.cleanupCallbacks.size,
		};
	}

	/**
	 * Cleanup all resources
	 */
	cleanup() {
		logger.info("Starting resource cleanup", this.getStats());

		// Clear all intervals
		this.intervals.forEach((interval) => {
			clearInterval(interval);
		});
		this.intervals.clear();

		// Clear all timeouts
		this.timeouts.forEach((timeout) => {
			clearTimeout(timeout);
		});
		this.timeouts.clear();

		// Execute cleanup callbacks
		this.cleanupCallbacks.forEach((callback) => {
			try {
				callback();
			} catch (error) {
				logger.error("Cleanup callback failed", { error: error.message });
			}
		});
		this.cleanupCallbacks.clear();

		// Clear resources
		this.resources.clear();

		logger.info("Resource cleanup completed", this.getStats());
	}

	/**
	 * Create a managed interval with automatic cleanup
	 */
	createManagedInterval(callback, delay, maxExecutions = null) {
		let executionCount = 0;

		const managedCallback = (...args) => {
			try {
				callback(...args);
				executionCount++;

				// Auto-cleanup after max executions
				if (maxExecutions && executionCount >= maxExecutions) {
					this.clearInterval(interval);
					logger.debug("Managed interval auto-cleared", {
						executionCount,
						maxExecutions,
					});
				}
			} catch (error) {
				logger.error("Managed interval callback failed", {
					error: error.message,
					executionCount,
				});
			}
		};

		const interval = this.addInterval(managedCallback, delay);

		return {
			interval,
			clear: () => this.clearInterval(interval),
			getExecutionCount: () => executionCount,
		};
	}

	/**
	 * Create a managed timeout with automatic cleanup
	 */
	createManagedTimeout(callback, delay) {
		const managedCallback = (...args) => {
			try {
				callback(...args);
			} catch (error) {
				logger.error("Managed timeout callback failed", {
					error: error.message,
				});
			} finally {
				this.clearTimeout(timeout);
			}
		};

		const timeout = this.addTimeout(managedCallback, delay);

		return {
			timeout,
			clear: () => this.clearTimeout(timeout),
		};
	}

	/**
	 * Setup process cleanup handlers
	 */
	setupProcessCleanup() {
		const cleanupHandler = () => {
			logger.info("Process cleanup signal received");
			this.cleanup();
			process.exit(0);
		};

		process.on("SIGINT", cleanupHandler);
		process.on("SIGTERM", cleanupHandler);
		process.on("SIGQUIT", cleanupHandler);

		// Handle uncaught exceptions
		process.on("uncaughtException", (error) => {
			logger.error("Uncaught exception", { error: error.message });
			this.cleanup();
			process.exit(1);
		});

		// Handle unhandled promise rejections
		process.on("unhandledRejection", (reason, promise) => {
			logger.error("Unhandled promise rejection", {
				reason: reason?.message || reason,
				promise: promise.toString(),
			});
		});

		logger.info("Process cleanup handlers configured");
	}
}

// Create singleton instance
const resourceManager = new ResourceManager();

module.exports = resourceManager;
