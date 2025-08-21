import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { BotStatistics, ArbitrageOpportunity, TradeExecution } from '../types';
import { logger } from '../utils/logger';
import Decimal from 'decimal.js';

export class Dashboard {
  private screen: blessed.Widgets.Screen;
  private grid: any;
  private widgets: {
    log: any;
    stats: any;
    opportunities: any;
    trades: any;
    performance: any;
    risk: any;
  };

  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Solana Arbitrage Bot Dashboard',
    });

    this.grid = new contrib.grid({
      rows: 12,
      cols: 12,
      screen: this.screen,
    });

    this.widgets = this.createWidgets();
    this.setupEventHandlers();
  }

  private createWidgets() {
    // Log widget (bottom)
    const log = this.grid.set(8, 0, 4, 12, contrib.log, {
      fg: 'green',
      selectedFg: 'green',
      label: 'Bot Logs',
      border: { type: 'line', fg: 'cyan' },
    });

    // Statistics widget (top left)
    const stats = this.grid.set(0, 0, 4, 6, contrib.table, {
      keys: true,
      fg: 'white',
      selectedFg: 'white',
      selectedBg: 'blue',
      interactive: false,
      label: 'Bot Statistics',
      width: '50%',
      height: '30%',
      border: { type: 'line', fg: 'cyan' },
      columnSpacing: 3,
      columnWidth: [20, 15],
    });

    // Opportunities widget (top right)
    const opportunities = this.grid.set(0, 6, 4, 6, contrib.table, {
      keys: true,
      fg: 'white',
      selectedFg: 'white',
      selectedBg: 'blue',
      interactive: false,
      label: 'Current Opportunities',
      width: '50%',
      height: '30%',
      border: { type: 'line', fg: 'cyan' },
      columnSpacing: 2,
      columnWidth: [10, 10, 10, 10],
    });

    // Recent trades widget (middle left)
    const trades = this.grid.set(4, 0, 4, 6, contrib.table, {
      keys: true,
      fg: 'white',
      selectedFg: 'white',
      selectedBg: 'blue',
      interactive: false,
      label: 'Recent Trades',
      width: '50%',
      height: '30%',
      border: { type: 'line', fg: 'cyan' },
      columnSpacing: 2,
      columnWidth: [15, 10, 10, 10],
    });

    // Performance chart (middle right)
    const performance = this.grid.set(4, 6, 4, 6, contrib.line, {
      style: {
        line: 'yellow',
        text: 'green',
        baseline: 'black',
      },
      xLabelPadding: 3,
      xPadding: 5,
      showLegend: true,
      wholeNumbersOnly: false,
      label: 'P&L Performance',
      border: { type: 'line', fg: 'cyan' },
    });

    // Risk metrics widget (positioned for visibility)
    const risk = this.grid.set(0, 0, 2, 12, contrib.lcd, {
      segmentWidth: 0.06,
      segmentInterval: 0.11,
      strokeWidth: 0.1,
      elements: 5,
      display: '0.00',
      elementSpacing: 4,
      elementPadding: 2,
      color: 'green',
      label: 'Daily P&L',
      border: { type: 'line', fg: 'cyan' },
    });

    return { log, stats, opportunities, trades, performance, risk };
  }

  private setupEventHandlers() {
    this.screen.key(['escape', 'q', 'C-c'], () => {
      process.exit(0);
    });

    this.screen.key(['r'], () => {
      this.screen.render();
    });
  }

  updateStatistics(stats: BotStatistics): void {
    const data = [
      ['Metric', 'Value'],
      ['Total Trades', stats.totalTrades.toString()],
      ['Successful', stats.successfulTrades.toString()],
      ['Failed', stats.failedTrades.toString()],
      ['Win Rate', `${(stats.winRate * 100).toFixed(2)}%`],
      ['Total Profit', `${stats.totalProfit.toFixed(4)} SOL`],
      ['Avg Profit', `${stats.averageProfit.toFixed(4)} SOL`],
      ['Daily P&L', `${stats.dailyPnL.toFixed(4)} SOL`],
      ['Total Volume', `${stats.totalVolume.toFixed(2)} SOL`],
    ];

    this.widgets.stats.setData({
      headers: data[0],
      data: data.slice(1),
    });

    // Update LCD display with daily P&L
    const pnlDisplay = stats.dailyPnL.toFixed(2);
    this.widgets.risk.setDisplay(pnlDisplay);
    this.widgets.risk.setOptions({
      color: stats.dailyPnL.gte(0) ? 'green' : 'red',
    });

    this.screen.render();
  }

  updateOpportunities(opportunities: ArbitrageOpportunity[]): void {
    const data = [
      ['Pair', 'Buy', 'Sell', 'Profit %'],
      ...opportunities.slice(0, 5).map(opp => [
        `${opp.tokenA.symbol}-${opp.tokenB.symbol}`,
        opp.buyDex,
        opp.sellDex,
        `${opp.profitPercentage.mul(100).toFixed(3)}%`,
      ]),
    ];

    this.widgets.opportunities.setData({
      headers: data[0],
      data: data.slice(1),
    });

    this.screen.render();
  }

  updateTrades(trades: TradeExecution[]): void {
    const data = [
      ['Time', 'Pair', 'Profit', 'Status'],
      ...trades.slice(-5).reverse().map(trade => {
        const time = new Date(trade.timestamp).toLocaleTimeString();
        const pair = `${trade.opportunity.tokenA.symbol}-${trade.opportunity.tokenB.symbol}`;
        const profit = trade.profit ? `${trade.profit.toFixed(4)}` : '0';
        const status = trade.status === 'success' ? '✓' : '✗';
        
        return [time, pair, profit, status];
      }),
    ];

    this.widgets.trades.setData({
      headers: data[0],
      data: data.slice(1),
    });

    this.screen.render();
  }

  updatePerformance(history: { time: string; pnl: number }[]): void {
    if (history.length === 0) return;

    const x = history.map(h => h.time);
    const y = history.map(h => h.pnl);

    const series = {
      title: 'P&L',
      x,
      y,
      style: {
        line: y[y.length - 1] >= 0 ? 'green' : 'red',
      },
    };

    this.widgets.performance.setData([series]);
    this.screen.render();
  }

  updateRiskMetrics(metrics: any): void {
    const riskInfo = `Consecutive Losses: ${metrics.consecutiveLosses} | Max Drawdown: ${metrics.maxDrawdown} | Daily Trades: ${metrics.dailyTradeCount}`;
    this.widgets.risk.setLabel(`Daily P&L | ${riskInfo}`);
    this.screen.render();
  }

  log(message: string, level: string = 'info'): void {
    const timestamp = new Date().toLocaleTimeString();
    const coloredMessage = this.colorizeMessage(`[${timestamp}] ${message}`, level);
    this.widgets.log.log(coloredMessage);
    this.screen.render();
  }

  private colorizeMessage(message: string, level: string): string {
    switch (level) {
      case 'error':
        return `{red-fg}${message}{/red-fg}`;
      case 'warn':
        return `{yellow-fg}${message}{/yellow-fg}`;
      case 'success':
        return `{green-fg}${message}{/green-fg}`;
      case 'info':
      default:
        return `{cyan-fg}${message}{/cyan-fg}`;
    }
  }

  render(): void {
    this.screen.render();
  }

  destroy(): void {
    this.screen.destroy();
  }
}