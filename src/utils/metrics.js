/**
 * Metrics collection for the Solana Jupiter Bot
 * Tracks performance, trades, errors, and other important metrics
 */

const logger = require('./logger');
const { TRADING_CONSTANTS } = require('./constants');

class MetricsCollector {
	constructor() {
		this.metrics = {
			trades: { 
				success: 0, 
				failed: 0,
				total: 0,
				successRate: 0
			},
			latency: { 
				route: [], 
				swap: [],
				avgRoute: 0,
				avgSwap: 0,
				p95Route: 0,
				p95Swap: 0
			},
			profit: { 
				total: 0, 
				average: 0,
				best: 0,
				worst: 0,
				consecutiveWins: 0,
				consecutiveLosses: 0
			},
			errors: { 
				count: 0, 
				types: {},
				lastError: null,
				errorRate: 0
			},
			performance: {
				iterationsPerMinute: 0,
				availableRoutes: { buy: 0, sell: 0 },
				maxProfitSpotted: { buy: 0, sell: 0 },
				safetyChecks: { total: 0, failed: 0, successRate: 0 }
			},
			system: {
				startTime: new Date(),
				uptime: 0,
				memoryUsage: 0,
				cpuUsage: 0
			}
		};
		
		this.startTime = Date.now();
		this.lastUpdate = Date.now();
		this.updateInterval = null;
	}

	/**
	 * Record a trade execution
	 */
	recordTrade(success, profit, routeLatency, swapLatency, error = null) {
		const now = Date.now();
		
		// Update trade counts
		this.metrics.trades.total++;
		if (success) {
			this.metrics.trades.success++;
			this.metrics.profit.consecutiveWins++;
			this.metrics.profit.consecutiveLosses = 0;
		} else {
			this.metrics.trades.failed++;
			this.metrics.profit.consecutiveLosses++;
			this.metrics.profit.consecutiveWins = 0;
		}
		
		// Update success rate
		this.metrics.trades.successRate = this.metrics.trades.success / this.metrics.trades.total;
		
		// Update profit metrics
		if (success && profit !== undefined) {
			this.metrics.profit.total += profit;
			this.metrics.profit.average = this.metrics.profit.total / this.metrics.trades.success;
			
			if (profit > this.metrics.profit.best) {
				this.metrics.profit.best = profit;
			}
			if (profit < this.metrics.profit.worst) {
				this.metrics.profit.worst = profit;
			}
		}
		
		// Update latency metrics
		if (routeLatency !== undefined) {
			this.metrics.latency.route.push(routeLatency);
			this.updateLatencyStats('route');
		}
		
		if (swapLatency !== undefined) {
			this.metrics.latency.swap.push(swapLatency);
			this.updateLatencyStats('swap');
		}
		
		// Update error metrics
		if (error) {
			this.metrics.errors.count++;
			const errorType = error.code || error.message || 'UNKNOWN';
			this.metrics.errors.types[errorType] = (this.metrics.errors.types[errorType] || 0) + 1;
			this.metrics.errors.lastError = {
				type: errorType,
				message: error.message,
				timestamp: now
			};
		}
		
		// Update error rate
		this.metrics.errors.errorRate = this.metrics.errors.count / this.metrics.trades.total;
		
		logger.trade('Trade recorded', {
			success,
			profit,
			routeLatency,
			swapLatency,
			error: error?.message,
			successRate: this.metrics.trades.successRate,
			totalTrades: this.metrics.trades.total
		});
	}

	/**
	 * Record performance metrics
	 */
	recordPerformance(iterationsPerMinute, availableRoutes, maxProfitSpotted) {
		this.metrics.performance.iterationsPerMinute = iterationsPerMinute;
		this.metrics.performance.availableRoutes = availableRoutes;
		this.metrics.performance.maxProfitSpotted = maxProfitSpotted;
	}

	/**
	 * Record safety check results
	 */
	recordSafetyCheck(success, reason = null) {
		this.metrics.performance.safetyChecks.total++;
		
		if (!success) {
			this.metrics.performance.safetyChecks.failed++;
		}
		
		this.metrics.performance.safetyChecks.successRate = 
			(this.metrics.performance.safetyChecks.total - this.metrics.performance.safetyChecks.failed) / 
			this.metrics.performance.safetyChecks.total;
		
		if (!success) {
			logger.safety('Safety check failed', { reason });
		}
	}

	/**
	 * Update latency statistics
	 */
	updateLatencyStats(type) {
		const latencies = this.metrics.latency[type];
		if (latencies.length === 0) return;
		
		// Calculate average
		const sum = latencies.reduce((a, b) => a + b, 0);
		this.metrics.latency[`avg${type.charAt(0).toUpperCase() + type.slice(1)}`] = sum / latencies.length;
		
		// Calculate 95th percentile
		const sorted = [...latencies].sort((a, b) => a - b);
		const p95Index = Math.floor(sorted.length * 0.95);
		this.metrics.latency[`p95${type.charAt(0).toUpperCase() + type.slice(1)}`] = sorted[p95Index];
	}

	/**
	 * Update system metrics
	 */
	updateSystemMetrics() {
		const now = Date.now();
		this.metrics.system.uptime = now - this.startTime;
		this.metrics.system.memoryUsage = process.memoryUsage();
		this.metrics.system.cpuUsage = process.cpuUsage();
		this.lastUpdate = now;
	}

	/**
	 * Get current metrics
	 */
	getMetrics() {
		this.updateSystemMetrics();
		return { ...this.metrics };
	}

	/**
	 * Get metrics summary for display
	 */
	getSummary() {
		const metrics = this.getMetrics();
		
		return {
			trades: {
				total: metrics.trades.total,
				success: metrics.trades.success,
				failed: metrics.trades.failed,
				successRate: `${(metrics.trades.successRate * 100).toFixed(1)}%`
			},
			profit: {
				total: metrics.profit.total.toFixed(4),
				average: metrics.profit.average.toFixed(4),
				best: metrics.profit.best.toFixed(4),
				worst: metrics.profit.worst.toFixed(4)
			},
			latency: {
				avgRoute: `${metrics.latency.avgRoute.toFixed(0)}ms`,
				avgSwap: `${metrics.latency.avgSwap.toFixed(0)}ms`,
				p95Route: `${metrics.latency.p95Route.toFixed(0)}ms`,
				p95Swap: `${metrics.latency.p95Swap.toFixed(0)}ms`
			},
			errors: {
				total: metrics.errors.count,
				rate: `${(metrics.errors.errorRate * 100).toFixed(1)}%`,
				lastError: metrics.errors.lastError?.type || 'None'
			},
			performance: {
				iterationsPerMinute: metrics.performance.iterationsPerMinute,
				safetySuccessRate: `${(metrics.performance.safetyChecks.successRate * 100).toFixed(1)}%`
			},
			system: {
				uptime: this.formatUptime(metrics.system.uptime),
				memoryUsage: `${(metrics.system.memoryUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`
			}
		};
	}

	/**
	 * Format uptime in human readable format
	 */
	formatUptime(ms) {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);
		
		if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
		if (hours > 0) return `${hours}h ${minutes % 60}m`;
		if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
		return `${seconds}s`;
	}

	/**
	 * Check if metrics indicate poor performance
	 */
	checkPerformanceAlerts() {
		const alerts = [];
		const metrics = this.getMetrics();
		
		// Check success rate
		if (metrics.trades.successRate < TRADING_CONSTANTS.MIN_SUCCESS_RATE) {
			alerts.push(`Low success rate: ${(metrics.trades.successRate * 100).toFixed(1)}%`);
		}
		
		// Check error rate
		if (metrics.errors.errorRate > TRADING_CONSTANTS.MAX_ERROR_RATE) {
			alerts.push(`High error rate: ${(metrics.errors.errorRate * 100).toFixed(1)}%`);
		}
		
		// Check latency
		if (metrics.latency.avgRoute > TRADING_CONSTANTS.ROUTE_COMPUTATION_MAX_MS) {
			alerts.push(`High route latency: ${metrics.latency.avgRoute.toFixed(0)}ms`);
		}
		
		if (metrics.latency.avgSwap > TRADING_CONSTANTS.SWAP_EXECUTION_MAX_MS) {
			alerts.push(`High swap latency: ${metrics.latency.avgSwap.toFixed(0)}ms`);
		}
		
		// Check consecutive losses
		if (metrics.profit.consecutiveLosses > TRADING_CONSTANTS.MAX_CONSECUTIVE_FAILURES) {
			alerts.push(`High consecutive losses: ${metrics.profit.consecutiveLosses}`);
		}
		
		return alerts;
	}

	/**
	 * Start periodic metrics updates
	 */
	startPeriodicUpdates(intervalMs = TRADING_CONSTANTS.METRICS_UPDATE_INTERVAL) {
		this.updateInterval = setInterval(() => {
			this.updateSystemMetrics();
			
			// Check for performance alerts
			const alerts = this.checkPerformanceAlerts();
			if (alerts.length > 0) {
				logger.warn('Performance alerts detected', { alerts });
			}
			
			// Log metrics summary periodically
			if (this.metrics.trades.total % 10 === 0) { // Every 10 trades
				logger.info('Metrics summary', this.getSummary());
			}
		}, intervalMs);
		
		logger.info('Metrics collector started', { updateInterval: intervalMs });
	}

	/**
	 * Stop periodic updates
	 */
	stopPeriodicUpdates() {
		if (this.updateInterval) {
			clearInterval(this.updateInterval);
			this.updateInterval = null;
			logger.info('Metrics collector stopped');
		}
	}

	/**
	 * Reset metrics (useful for testing)
	 */
	reset() {
		this.metrics = {
			trades: { success: 0, failed: 0, total: 0, successRate: 0 },
			latency: { route: [], swap: [], avgRoute: 0, avgSwap: 0, p95Route: 0, p95Swap: 0 },
			profit: { total: 0, average: 0, best: 0, worst: 0, consecutiveWins: 0, consecutiveLosses: 0 },
			errors: { count: 0, types: {}, lastError: null, errorRate: 0 },
			performance: {
				iterationsPerMinute: 0,
				availableRoutes: { buy: 0, sell: 0 },
				maxProfitSpotted: { buy: 0, sell: 0 },
				safetyChecks: { total: 0, failed: 0, successRate: 0 }
			},
			system: {
				startTime: new Date(),
				uptime: 0,
				memoryUsage: 0,
				cpuUsage: 0
			}
		};
		this.startTime = Date.now();
		this.lastUpdate = Date.now();
		
		logger.info('Metrics reset');
	}
}

// Create singleton instance
const metricsCollector = new MetricsCollector();

module.exports = metricsCollector;