import Decimal from 'decimal.js';
import { ArbitrageOpportunity, TradeExecution, BotStatistics } from '../types';
import { TRADING_CONFIG } from '../config/config';
import { logger } from '../utils/logger';

export class RiskManager {
  private dailyPnL: Decimal = new Decimal(0);
  private dailyTradeCount: number = 0;
  private recentTrades: TradeExecution[] = [];
  private lastTradeTime: number = 0;
  private consecutiveLosses: number = 0;
  private maxDrawdown: Decimal = new Decimal(0);
  private peakBalance: Decimal = new Decimal(0);
  private statistics: BotStatistics;

  constructor() {
    this.statistics = this.initializeStatistics();
    this.resetDailyMetrics();
  }

  async canTrade(opportunity: ArbitrageOpportunity): Promise<boolean> {
    // Check daily loss limit
    if (this.dailyPnL.lt(-TRADING_CONFIG.maxDailyLoss)) {
      logger.warn('Daily loss limit reached');
      return false;
    }

    // Check rate limiting
    const now = Date.now();
    const timeSinceLastTrade = now - this.lastTradeTime;
    const minTimeBetweenTrades = 60000 / TRADING_CONFIG.maxTradesPerMinute; // ms per trade

    if (timeSinceLastTrade < minTimeBetweenTrades) {
      logger.debug('Rate limit: Too soon since last trade');
      return false;
    }

    // Check consecutive losses circuit breaker
    if (this.consecutiveLosses >= 3) {
      logger.warn('Circuit breaker: Too many consecutive losses');
      // Cool down period after consecutive losses
      if (timeSinceLastTrade < 300000) { // 5 minutes
        return false;
      }
    }

    // Check opportunity quality
    if (!this.isQualityOpportunity(opportunity)) {
      logger.debug('Opportunity does not meet quality criteria');
      return false;
    }

    // Check drawdown limits
    if (this.maxDrawdown.gt(TRADING_CONFIG.maxDailyLoss * 0.5)) {
      logger.warn('Approaching maximum drawdown limit');
      // Reduce trading when approaching drawdown limits
      if (opportunity.profitPercentage.lt(TRADING_CONFIG.minProfitThreshold * 2)) {
        return false;
      }
    }

    return true;
  }

  async recordTrade(execution: TradeExecution): Promise<void> {
    this.recentTrades.push(execution);
    this.lastTradeTime = Date.now();
    this.dailyTradeCount++;

    // Update statistics
    this.statistics.totalTrades++;
    
    if (execution.status === 'success') {
      this.statistics.successfulTrades++;
      
      if (execution.profit) {
        this.dailyPnL = this.dailyPnL.add(execution.profit);
        this.statistics.totalProfit = this.statistics.totalProfit.add(execution.profit);
        
        if (execution.profit.gt(0)) {
          this.consecutiveLosses = 0;
        } else {
          this.consecutiveLosses++;
        }
      }

      if (execution.actualAmountOut) {
        this.statistics.totalVolume = this.statistics.totalVolume.add(execution.actualAmountOut);
      }
    } else {
      this.statistics.failedTrades++;
      this.consecutiveLosses++;
    }

    // Update win rate
    this.statistics.winRate = this.statistics.successfulTrades / this.statistics.totalTrades;
    
    // Update average profit
    if (this.statistics.successfulTrades > 0) {
      this.statistics.averageProfit = this.statistics.totalProfit.div(this.statistics.successfulTrades);
    }

    // Update drawdown
    this.updateDrawdown();

    // Clean old trades (keep last 100)
    if (this.recentTrades.length > 100) {
      this.recentTrades = this.recentTrades.slice(-100);
    }

    logger.info(`Risk metrics updated - Daily P&L: ${this.dailyPnL.toString()}, Consecutive losses: ${this.consecutiveLosses}`);
  }

  async getMaxPositionSize(): Promise<Decimal> {
    // Dynamic position sizing based on recent performance
    let baseSize = new Decimal(TRADING_CONFIG.maxPositionSize);

    // Reduce size if experiencing losses
    if (this.consecutiveLosses > 0) {
      baseSize = baseSize.mul(Math.pow(0.7, this.consecutiveLosses));
    }

    // Reduce size if approaching daily loss limit
    const lossRatio = this.dailyPnL.abs().div(TRADING_CONFIG.maxDailyLoss);
    if (lossRatio.gt(0.5)) {
      baseSize = baseSize.mul(1 - lossRatio.toNumber());
    }

    // Kelly Criterion inspired sizing (simplified)
    if (this.statistics.winRate > 0 && this.statistics.averageProfit.gt(0)) {
      const kellyFraction = this.calculateKellyFraction();
      baseSize = baseSize.mul(kellyFraction);
    }

    return Decimal.max(baseSize, new Decimal(1)); // Minimum 1 unit
  }

  private calculateKellyFraction(): Decimal {
    // Simplified Kelly Criterion
    // f = (p * b - q) / b
    // where p = win rate, q = loss rate, b = avg win/avg loss ratio
    
    const p = new Decimal(this.statistics.winRate);
    const q = new Decimal(1 - this.statistics.winRate);
    
    // Calculate average win and loss
    let avgWin = new Decimal(0);
    let avgLoss = new Decimal(0);
    let winCount = 0;
    let lossCount = 0;

    this.recentTrades.forEach(trade => {
      if (trade.profit) {
        if (trade.profit.gt(0)) {
          avgWin = avgWin.add(trade.profit);
          winCount++;
        } else {
          avgLoss = avgLoss.add(trade.profit.abs());
          lossCount++;
        }
      }
    });

    if (winCount > 0) avgWin = avgWin.div(winCount);
    if (lossCount > 0) avgLoss = avgLoss.div(lossCount);

    if (avgLoss.eq(0)) return new Decimal(0.1); // Conservative default

    const b = avgWin.div(avgLoss);
    const kelly = p.mul(b).sub(q).div(b);

    // Apply Kelly fraction with safety factor (25% of Kelly)
    return Decimal.min(Decimal.max(kelly.mul(0.25), new Decimal(0.01)), new Decimal(0.25));
  }

  private isQualityOpportunity(opportunity: ArbitrageOpportunity): boolean {
    // Check minimum profit threshold
    if (opportunity.profitPercentage.lt(TRADING_CONFIG.minProfitThreshold)) {
      return false;
    }

    // Check liquidity
    if (opportunity.liquidity.lt(TRADING_CONFIG.minLiquidity)) {
      return false;
    }

    // Additional quality checks based on recent performance
    if (this.consecutiveLosses > 1) {
      // Require higher profit margin after losses
      if (opportunity.profitPercentage.lt(TRADING_CONFIG.minProfitThreshold * 1.5)) {
        return false;
      }
    }

    return true;
  }

  private updateDrawdown(): void {
    const currentBalance = this.statistics.totalProfit;
    
    if (currentBalance.gt(this.peakBalance)) {
      this.peakBalance = currentBalance;
    }

    const drawdown = this.peakBalance.sub(currentBalance);
    if (drawdown.gt(this.maxDrawdown)) {
      this.maxDrawdown = drawdown;
    }
  }

  resetDailyMetrics(): void {
    const now = new Date();
    const lastReset = new Date(this.statistics.uptime);
    
    // Reset if it's a new day
    if (now.getDate() !== lastReset.getDate()) {
      this.dailyPnL = new Decimal(0);
      this.dailyTradeCount = 0;
      this.consecutiveLosses = 0;
      logger.info('Daily risk metrics reset');
    }

    this.statistics.dailyPnL = this.dailyPnL;
    this.statistics.uptime = Date.now();
  }

  getStatistics(): BotStatistics {
    return { ...this.statistics };
  }

  getRiskMetrics(): any {
    return {
      dailyPnL: this.dailyPnL.toString(),
      dailyTradeCount: this.dailyTradeCount,
      consecutiveLosses: this.consecutiveLosses,
      maxDrawdown: this.maxDrawdown.toString(),
      lastTradeTime: this.lastTradeTime,
      winRate: this.statistics.winRate,
      averageProfit: this.statistics.averageProfit.toString(),
    };
  }

  private initializeStatistics(): BotStatistics {
    return {
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalProfit: new Decimal(0),
      totalVolume: new Decimal(0),
      winRate: 0,
      averageProfit: new Decimal(0),
      dailyPnL: new Decimal(0),
      uptime: Date.now(),
    };
  }
}