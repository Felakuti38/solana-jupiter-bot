import { Connection, Transaction, sendAndConfirmTransaction, TransactionSignature } from '@solana/web3.js';
import Decimal from 'decimal.js';
import { ArbitrageOpportunity, TradeExecution } from '../types';
import { WalletManager } from './wallet';
import { BaseDEX } from '../dex/base';
import { TRADING_CONFIG } from '../config/config';
import { logger } from '../utils/logger';
import { RiskManager } from './risk-manager';

export class TradeExecutor {
  private connection: Connection;
  private walletManager: WalletManager;
  private dexes: Map<string, BaseDEX>;
  private riskManager: RiskManager;
  private executionHistory: TradeExecution[] = [];
  private isExecuting: boolean = false;

  constructor(
    walletManager: WalletManager,
    dexes: BaseDEX[],
    riskManager: RiskManager
  ) {
    this.walletManager = walletManager;
    this.connection = walletManager.getConnection();
    this.riskManager = riskManager;
    
    this.dexes = new Map();
    dexes.forEach(dex => {
      this.dexes.set(dex.getName(), dex);
    });
  }

  async executeArbitrage(opportunity: ArbitrageOpportunity): Promise<TradeExecution> {
    if (this.isExecuting) {
      logger.warn('Already executing a trade, skipping opportunity');
      return this.createFailedExecution(opportunity, 'Already executing another trade');
    }

    this.isExecuting = true;
    const execution = this.initializeExecution(opportunity);

    try {
      // Pre-execution checks
      if (!await this.performPreExecutionChecks(opportunity, execution)) {
        return execution;
      }

      // Calculate optimal position size
      const positionSize = await this.calculatePositionSize(opportunity);
      execution.amountIn = positionSize;

      logger.info(`Executing arbitrage: ${opportunity.tokenA.symbol}-${opportunity.tokenB.symbol} with ${positionSize.toString()} units`);

      // Execute buy transaction
      const buySuccess = await this.executeBuy(opportunity, positionSize, execution);
      if (!buySuccess) {
        execution.status = 'failed';
        return execution;
      }

      // Small delay to ensure transaction is confirmed
      await this.sleep(1000);

      // Execute sell transaction
      const sellSuccess = await this.executeSell(opportunity, execution);
      if (!sellSuccess) {
        execution.status = 'failed';
        return execution;
      }

      // Calculate actual profit
      await this.calculateActualProfit(execution);
      
      execution.status = 'success';
      logger.info(`Trade executed successfully! Profit: ${execution.profit?.toString() || '0'}`);

      // Update risk manager
      await this.riskManager.recordTrade(execution);

    } catch (error) {
      logger.error('Trade execution failed:', error);
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      this.isExecuting = false;
      this.executionHistory.push(execution);
    }

    return execution;
  }

  private async performPreExecutionChecks(
    opportunity: ArbitrageOpportunity,
    execution: TradeExecution
  ): Promise<boolean> {
    // Check wallet balance
    const balance = await this.walletManager.getSOLBalance();
    if (balance.lt(0.1)) {
      logger.error('Insufficient SOL balance for transaction fees');
      execution.status = 'failed';
      execution.error = 'Insufficient SOL balance';
      return false;
    }

    // Check risk limits
    if (!await this.riskManager.canTrade(opportunity)) {
      logger.warn('Trade blocked by risk manager');
      execution.status = 'failed';
      execution.error = 'Risk limits exceeded';
      return false;
    }

    // Verify opportunity still exists
    const buyDex = this.dexes.get(opportunity.buyDex);
    const sellDex = this.dexes.get(opportunity.sellDex);

    if (!buyDex || !sellDex) {
      logger.error('DEX not found');
      execution.status = 'failed';
      execution.error = 'DEX not found';
      return false;
    }

    // Re-check prices to ensure opportunity still exists
    const currentBuyPrice = await buyDex.getPrice(
      opportunity.tokenA.mint,
      opportunity.tokenB.mint,
      new Decimal(100)
    );

    const currentSellPrice = await sellDex.getPrice(
      opportunity.tokenA.mint,
      opportunity.tokenB.mint,
      new Decimal(100)
    );

    if (!currentBuyPrice || !currentSellPrice) {
      logger.error('Failed to get current prices');
      execution.status = 'failed';
      execution.error = 'Price fetch failed';
      return false;
    }

    const currentSpread = currentSellPrice.price.sub(currentBuyPrice.price).div(currentBuyPrice.price);
    if (currentSpread.lt(TRADING_CONFIG.minProfitThreshold)) {
      logger.warn('Opportunity no longer profitable');
      execution.status = 'failed';
      execution.error = 'Opportunity expired';
      return false;
    }

    return true;
  }

  private async calculatePositionSize(opportunity: ArbitrageOpportunity): Promise<Decimal> {
    // Get available balance
    const solBalance = await this.walletManager.getSOLBalance();
    const tokenBalance = await this.walletManager.getTokenBalance(opportunity.tokenA.mint);

    // Calculate maximum position based on available funds
    let maxPosition = Decimal.min(
      solBalance.mul(0.9), // Use 90% of SOL balance
      new Decimal(TRADING_CONFIG.maxPositionSize)
    );

    // Consider liquidity constraints
    const liquidityConstraint = opportunity.liquidity.mul(0.1); // Use max 10% of liquidity
    maxPosition = Decimal.min(maxPosition, liquidityConstraint);

    // Apply risk manager limits
    const riskLimit = await this.riskManager.getMaxPositionSize();
    maxPosition = Decimal.min(maxPosition, riskLimit);

    return maxPosition;
  }

  private async executeBuy(
    opportunity: ArbitrageOpportunity,
    amount: Decimal,
    execution: TradeExecution
  ): Promise<boolean> {
    try {
      const buyDex = this.dexes.get(opportunity.buyDex);
      if (!buyDex) return false;

      const minAmountOut = amount.mul(opportunity.buyPrice).mul(1 - TRADING_CONFIG.maxSlippage);
      
      const transaction = await buyDex.buildSwapTransaction(
        opportunity.tokenA.mint,
        opportunity.tokenB.mint,
        amount,
        minAmountOut,
        this.walletManager.getPublicKey()
      );

      if (!transaction) {
        logger.error('Failed to build buy transaction');
        return false;
      }

      const signature = await this.sendTransaction(transaction);
      if (!signature) {
        return false;
      }

      logger.info(`Buy transaction sent: ${signature}`);
      execution.txSignature = signature;
      
      return true;
    } catch (error) {
      logger.error('Buy execution failed:', error);
      return false;
    }
  }

  private async executeSell(
    opportunity: ArbitrageOpportunity,
    execution: TradeExecution
  ): Promise<boolean> {
    try {
      const sellDex = this.dexes.get(opportunity.sellDex);
      if (!sellDex) return false;

      // Get the amount of tokenB we received from the buy
      const tokenBBalance = await this.walletManager.getTokenBalance(opportunity.tokenB.mint);
      
      if (tokenBBalance.lte(0)) {
        logger.error('No tokens to sell');
        return false;
      }

      const minAmountOut = tokenBBalance.mul(opportunity.sellPrice).mul(1 - TRADING_CONFIG.maxSlippage);
      
      const transaction = await sellDex.buildSwapTransaction(
        opportunity.tokenB.mint,
        opportunity.tokenA.mint,
        tokenBBalance,
        minAmountOut,
        this.walletManager.getPublicKey()
      );

      if (!transaction) {
        logger.error('Failed to build sell transaction');
        return false;
      }

      const signature = await this.sendTransaction(transaction);
      if (!signature) {
        return false;
      }

      logger.info(`Sell transaction sent: ${signature}`);
      execution.actualAmountOut = tokenBBalance;
      
      return true;
    } catch (error) {
      logger.error('Sell execution failed:', error);
      return false;
    }
  }

  private async sendTransaction(transaction: Transaction): Promise<string | null> {
    try {
      transaction.feePayer = this.walletManager.getPublicKey();
      transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
      
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.walletManager.getWallet()],
        {
          commitment: 'confirmed',
          maxRetries: 3,
        }
      );

      return signature;
    } catch (error) {
      logger.error('Transaction failed:', error);
      return null;
    }
  }

  private async calculateActualProfit(execution: TradeExecution): Promise<void> {
    if (execution.actualAmountOut && execution.amountIn) {
      execution.profit = execution.actualAmountOut.sub(execution.amountIn);
      execution.slippage = execution.expectedAmountOut.sub(execution.actualAmountOut)
        .div(execution.expectedAmountOut);
    }
  }

  private initializeExecution(opportunity: ArbitrageOpportunity): TradeExecution {
    return {
      opportunity,
      amountIn: new Decimal(0),
      expectedAmountOut: new Decimal(0),
      status: 'pending',
      timestamp: Date.now(),
    };
  }

  private createFailedExecution(opportunity: ArbitrageOpportunity, error: string): TradeExecution {
    return {
      opportunity,
      amountIn: new Decimal(0),
      expectedAmountOut: new Decimal(0),
      status: 'failed',
      timestamp: Date.now(),
      error,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getExecutionHistory(): TradeExecution[] {
    return this.executionHistory;
  }

  getRecentExecutions(count: number = 10): TradeExecution[] {
    return this.executionHistory.slice(-count);
  }
}