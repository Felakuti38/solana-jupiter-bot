import { Connection } from '@solana/web3.js';
import { WalletManager } from './core/wallet';
import { RiskManager } from './core/risk-manager';
import { TradeExecutor } from './core/executor';
import { ArbitrageDetector } from './strategies/arbitrage';
import { RaydiumDEX } from './dex/raydium';
import { JupiterDEX } from './dex/jupiter';
import { Dashboard } from './monitoring/dashboard';
import { logger } from './utils/logger';
import { 
  SOLANA_CONFIG, 
  DEX_CONFIG, 
  MONITORING_CONFIG,
  MEME_TOKENS,
  TRADING_CONFIG 
} from './config/config';
import { TokenInfo, ArbitrageOpportunity } from './types';
import { PublicKey } from '@solana/web3.js';
import * as cron from 'node-cron';

class SolanaArbitrageBot {
  private walletManager!: WalletManager;
  private riskManager!: RiskManager;
  private executor!: TradeExecutor;
  private detector!: ArbitrageDetector;
  private dashboard?: Dashboard;
  private dexes: any[] = [];
  private isRunning: boolean = false;
  private scanInterval: NodeJS.Timeout | null = null;
  private performanceHistory: { time: string; pnl: number }[] = [];

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Solana Arbitrage Bot...');

      // Initialize wallet
      this.walletManager = new WalletManager();
      const walletHealth = await this.walletManager.checkHealth();
      
      if (!walletHealth) {
        throw new Error('Wallet health check failed. Please ensure you have sufficient SOL balance.');
      }

      const balance = await this.walletManager.getSOLBalance();
      logger.info(`Wallet Balance: ${balance.toString()} SOL`);

      // Initialize connection
      const connection = this.walletManager.getConnection();

      // Initialize DEXes based on configuration
      if (DEX_CONFIG.enableRaydium) {
        this.dexes.push(new RaydiumDEX(connection));
        logger.info('Raydium DEX initialized');
      }

      if (DEX_CONFIG.enableJupiter) {
        this.dexes.push(new JupiterDEX(connection));
        logger.info('Jupiter DEX initialized');
      }

      if (this.dexes.length === 0) {
        throw new Error('No DEXes enabled. Please enable at least one DEX in configuration.');
      }

      // Initialize core components
      this.riskManager = new RiskManager();
      this.detector = new ArbitrageDetector(this.dexes);
      this.executor = new TradeExecutor(this.walletManager, this.dexes, this.riskManager);

      // Initialize dashboard if enabled
      if (MONITORING_CONFIG.enableDashboard) {
        this.dashboard = new Dashboard();
        this.dashboard.log('Bot initialized successfully', 'success');
      }

      // Set up periodic tasks
      this.setupPeriodicTasks();

      logger.info('Bot initialization complete');
    } catch (error) {
      logger.error('Failed to initialize bot:', error);
      throw error;
    }
  }

  private setupPeriodicTasks(): void {
    // Reset daily metrics at midnight
    cron.schedule('0 0 * * *', () => {
      logger.info('Resetting daily metrics');
      this.riskManager.resetDailyMetrics();
    });

    // Update dashboard every 5 seconds
    if (this.dashboard) {
      setInterval(() => {
        this.updateDashboard();
      }, 5000);
    }

    // Log statistics every minute
    setInterval(() => {
      const stats = this.riskManager.getStatistics();
      logger.info(`Stats - Trades: ${stats.totalTrades}, Win Rate: ${(stats.winRate * 100).toFixed(2)}%, P&L: ${stats.totalProfit.toFixed(4)} SOL`);
    }, 60000);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Bot is already running');
      return;
    }

    logger.info('Starting arbitrage bot...');
    this.isRunning = true;

    // Start scanning for opportunities
    this.startScanning();

    if (this.dashboard) {
      this.dashboard.log('Bot started - Scanning for opportunities...', 'success');
    }
  }

  private startScanning(): void {
    const scanForOpportunities = async () => {
      if (!this.isRunning) return;

      try {
        // Get list of tokens to monitor
        const tokens = await this.getMonitoredTokens();
        
        // Scan for arbitrage opportunities
        const opportunities = await this.detector.scanForOpportunities(tokens);
        
        if (opportunities.length > 0) {
          logger.info(`Found ${opportunities.length} arbitrage opportunities`);
          
          if (this.dashboard) {
            this.dashboard.updateOpportunities(opportunities);
          }

          // Execute the best opportunity
          const bestOpportunity = opportunities[0];
          
          if (bestOpportunity.profitPercentage.gte(TRADING_CONFIG.minProfitThreshold)) {
            await this.executeOpportunity(bestOpportunity);
          }
        }
      } catch (error) {
        logger.error('Error during opportunity scan:', error);
      }
    };

    // Initial scan
    scanForOpportunities();

    // Set up recurring scans (every 2 seconds)
    this.scanInterval = setInterval(scanForOpportunities, 2000);
  }

  private async getMonitoredTokens(): Promise<TokenInfo[]> {
    const tokens: TokenInfo[] = [];

    // Add configured meme tokens
    for (const token of MEME_TOKENS) {
      tokens.push({
        mint: new PublicKey(token.mint),
        symbol: token.symbol,
        name: token.name,
        decimals: 9, // Most SPL tokens use 9 decimals
      });
    }

    // In production, you could also fetch trending tokens from APIs
    // or monitor new token launches

    return tokens;
  }

  private async executeOpportunity(opportunity: ArbitrageOpportunity): Promise<void> {
    try {
      logger.info(`Executing arbitrage opportunity: ${opportunity.tokenA.symbol}-${opportunity.tokenB.symbol}`);
      
      if (this.dashboard) {
        this.dashboard.log(
          `Executing: ${opportunity.tokenA.symbol}-${opportunity.tokenB.symbol} | Expected profit: ${opportunity.profitPercentage.mul(100).toFixed(3)}%`,
          'info'
        );
      }

      const execution = await this.executor.executeArbitrage(opportunity);
      
      if (execution.status === 'success') {
        logger.info(`Trade successful! Profit: ${execution.profit?.toString() || '0'}`);
        
        if (this.dashboard) {
          this.dashboard.log(
            `Trade successful! Profit: ${execution.profit?.toFixed(4) || '0'} SOL`,
            'success'
          );
        }
      } else {
        logger.error(`Trade failed: ${execution.error}`);
        
        if (this.dashboard) {
          this.dashboard.log(`Trade failed: ${execution.error}`, 'error');
        }
      }

      // Update dashboard with recent trades
      if (this.dashboard) {
        const recentTrades = this.executor.getRecentExecutions();
        this.dashboard.updateTrades(recentTrades);
      }
    } catch (error) {
      logger.error('Failed to execute opportunity:', error);
    }
  }

  private updateDashboard(): void {
    if (!this.dashboard) return;

    try {
      // Update statistics
      const stats = this.riskManager.getStatistics();
      this.dashboard.updateStatistics(stats);

      // Update risk metrics
      const riskMetrics = this.riskManager.getRiskMetrics();
      this.dashboard.updateRiskMetrics(riskMetrics);

      // Update performance chart
      this.performanceHistory.push({
        time: new Date().toLocaleTimeString(),
        pnl: parseFloat(stats.totalProfit.toFixed(4)),
      });

      // Keep last 50 data points
      if (this.performanceHistory.length > 50) {
        this.performanceHistory = this.performanceHistory.slice(-50);
      }

      this.dashboard.updatePerformance(this.performanceHistory);
    } catch (error) {
      logger.error('Failed to update dashboard:', error);
    }
  }

  async stop(): Promise<void> {
    logger.info('Stopping arbitrage bot...');
    this.isRunning = false;

    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }

    if (this.dashboard) {
      this.dashboard.log('Bot stopped', 'warn');
      setTimeout(() => {
        this.dashboard?.destroy();
      }, 1000);
    }

    logger.info('Bot stopped successfully');
  }
}

// Main execution
async function main() {
  const bot = new SolanaArbitrageBot();

  try {
    // Initialize bot
    await bot.initialize();

    // Start bot
    await bot.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await bot.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await bot.stop();
      process.exit(0);
    });

    // Keep the process running
    process.stdin.resume();
  } catch (error) {
    logger.error('Fatal error:', error);
    await bot.stop();
    process.exit(1);
  }
}

// Run the bot
main().catch(error => {
  logger.error('Unhandled error:', error);
  process.exit(1);
});