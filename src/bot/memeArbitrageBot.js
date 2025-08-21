const { Connection, PublicKey, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');
const { Jupiter } = require('@jup-ag/core');
const axios = require('axios');
const moment = require('moment');

class MemeArbitrageBot {
    constructor(config) {
        this.config = {
            // Network configuration
            rpcUrl: config.rpcUrl || 'https://api.mainnet-beta.solana.com',
            walletPrivateKey: config.walletPrivateKey,
            
            // Trading parameters
            minProfitPercent: config.minProfitPercent || 1.5,
            maxSlippage: config.maxSlippage || 0.5,
            tradeSize: config.tradeSize || 0.5, // $0.50 micro trades
            maxConcurrentTrades: config.maxConcurrentTrades || 3,
            
            // Risk management
            maxDailyLoss: config.maxDailyLoss || 0.20, // 20%
            maxRiskPerTrade: config.maxRiskPerTrade || 0.05, // 5%
            stopLossPercent: config.stopLossPercent || 1.0,
            
            // Meme coin specific settings
            memeCoinList: config.memeCoinList || [],
            minLiquidity: config.minLiquidity || 10000, // $10k minimum liquidity
            maxPriceImpact: config.maxPriceImpact || 2.0, // 2% max price impact
            
            // Performance settings
            scanInterval: config.scanInterval || 1000, // 1 second
            executionTimeout: config.executionTimeout || 5000,
            priorityFee: config.priorityFee || 1000,
            
            // AMM strategy for meme coins
            ammStrategy: config.ammStrategy || 'FAST',
            safetyLevel: config.safetyLevel || 'FAST',
            
            ...config
        };
        
        this.connection = new Connection(this.config.rpcUrl, 'confirmed');
        this.jupiter = null;
        this.isRunning = false;
        this.tradeHistory = [];
        this.dailyStats = {
            trades: 0,
            profit: 0,
            losses: 0,
            totalVolume: 0,
            startTime: Date.now()
        };
        this.activeTrades = new Map();
        this.priceCache = new Map();
        this.lastScanTime = 0;
    }

    async initialize() {
        try {
            console.log('🚀 Initializing Meme Arbitrage Bot...');
            
            // Initialize Jupiter
            this.jupiter = await Jupiter.load({
                connection: this.connection,
                cluster: 'mainnet-beta',
                user: this.config.walletPrivateKey, // or public key of a wallet
                wrapUnwrapSOL: false,
                routeCacheDuration: 10,
                restrictIntermediateTokens: true,
                enableLogging: false,
                defaultSlippageBps: this.config.maxSlippage * 100
            });
            
            // Load meme coin list if not provided
            if (this.config.memeCoinList.length === 0) {
                await this.loadMemeCoins();
            }
            
            console.log(`✅ Bot initialized with ${this.config.memeCoinList.length} meme coins`);
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize bot:', error);
            return false;
        }
    }

    async loadMemeCoins() {
        try {
            // Load popular meme coins from Jupiter API
            const response = await axios.get('https://token.jup.ag/all');
            const tokens = response.data;
            
            // Filter for meme coins (you can customize this logic)
            this.config.memeCoinList = tokens.filter(token => {
                const name = token.name?.toLowerCase() || '';
                const symbol = token.symbol?.toLowerCase() || '';
                
                // Meme coin indicators
                const memeKeywords = [
                    'dog', 'cat', 'moon', 'inu', 'shib', 'pepe', 'wojak', 'doge',
                    'floki', 'baby', 'safe', 'rocket', 'elon', 'meme', 'chad',
                    'based', 'ape', 'diamond', 'hands', 'hodl', 'lambo', 'moon'
                ];
                
                return memeKeywords.some(keyword => 
                    name.includes(keyword) || symbol.includes(keyword)
                ) && token.liquidity > this.config.minLiquidity;
            }).slice(0, 50); // Top 50 meme coins
            
            console.log(`📊 Loaded ${this.config.memeCoinList.length} meme coins`);
        } catch (error) {
            console.error('❌ Failed to load meme coins:', error);
            // Fallback to popular meme coins
            this.config.memeCoinList = [
                { symbol: 'BONK', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
                { symbol: 'WIF', address: 'EKpQGSJtjMFqKZ1KQanSqYXRcF8fBopzLHYxdM65Qjm' },
                { symbol: 'POPCAT', address: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr' },
                { symbol: 'BOOK', address: '3FoUJzqJvVg8f7VojqNySKzqNqJqJqJqJqJqJqJqJqJq' }
            ];
        }
    }

    async start() {
        if (this.isRunning) {
            console.log('⚠️ Bot is already running');
            return;
        }
        
        console.log('🎯 Starting Meme Arbitrage Bot...');
        this.isRunning = true;
        
        // Start the main trading loop
        this.tradingLoop();
        
        // Start monitoring loop
        this.monitoringLoop();
    }

    async stop() {
        console.log('🛑 Stopping Meme Arbitrage Bot...');
        this.isRunning = false;
        
        // Cancel all active trades
        for (const [tradeId, trade] of this.activeTrades) {
            await this.cancelTrade(tradeId);
        }
        
        this.printFinalStats();
    }

    async tradingLoop() {
        while (this.isRunning) {
            try {
                // Check if we can make more trades
                if (this.activeTrades.size >= this.config.maxConcurrentTrades) {
                    await this.sleep(100);
                    continue;
                }
                
                // Check daily loss limit
                if (this.dailyStats.profit < -(this.dailyStats.totalVolume * this.config.maxDailyLoss)) {
                    console.log('🛑 Daily loss limit reached, stopping bot');
                    await this.stop();
                    break;
                }
                
                // Scan for arbitrage opportunities
                const opportunities = await this.scanArbitrageOpportunities();
                
                for (const opportunity of opportunities) {
                    if (!this.isRunning) break;
                    
                    // Execute arbitrage trade
                    await this.executeArbitrageTrade(opportunity);
                    
                    // Small delay between trades
                    await this.sleep(100);
                }
                
                // Wait before next scan
                await this.sleep(this.config.scanInterval);
                
            } catch (error) {
                console.error('❌ Error in trading loop:', error);
                await this.sleep(1000);
            }
        }
    }

    async scanArbitrageOpportunities() {
        const opportunities = [];
        const currentTime = Date.now();
        
        // Rate limiting
        if (currentTime - this.lastScanTime < this.config.scanInterval) {
            return opportunities;
        }
        this.lastScanTime = currentTime;
        
        try {
            // Get routes for each meme coin pair
            for (const memeCoin of this.config.memeCoinList) {
                if (!this.isRunning) break;
                
                const routes = await this.getRoutes(memeCoin.address, 'USDC');
                if (!routes || routes.length < 2) continue;
                
                // Find arbitrage opportunities
                const arbitrage = this.findArbitrageOpportunity(routes, memeCoin);
                if (arbitrage) {
                    opportunities.push(arbitrage);
                }
            }
            
            // Sort by profit percentage
            opportunities.sort((a, b) => b.profitPercent - a.profitPercent);
            
            return opportunities.slice(0, 3); // Top 3 opportunities
            
        } catch (error) {
            console.error('❌ Error scanning opportunities:', error);
            return opportunities;
        }
    }

    async getRoutes(inputMint, outputMint) {
        try {
            const routes = await this.jupiter.computeRoutes({
                inputMint: new PublicKey(inputMint),
                outputMint: new PublicKey(outputMint),
                amount: this.config.tradeSize * 1e6, // Convert to USDC decimals
                slippageBps: this.config.maxSlippage * 100,
                forceFetch: true
            });
            
            return routes.routesInfos;
        } catch (error) {
            console.error(`❌ Error getting routes for ${inputMint}:`, error);
            return null;
        }
    }

    findArbitrageOpportunity(routes, memeCoin) {
        if (routes.length < 2) return null;
        
        // Find the best buy and sell routes
        const buyRoute = routes[0]; // Best route to buy
        const sellRoute = routes.find(route => 
            route.marketInfos.some(market => 
                market.amm.label !== buyRoute.marketInfos[0].amm.label
            )
        );
        
        if (!sellRoute) return null;
        
        // Calculate potential profit
        const buyPrice = buyRoute.outAmount / buyRoute.inAmount;
        const sellPrice = sellRoute.outAmount / sellRoute.inAmount;
        const profitPercent = ((sellPrice - buyPrice) / buyPrice) * 100;
        
        // Check if profit meets minimum threshold
        if (profitPercent < this.config.minProfitPercent) {
            return null;
        }
        
        // Check price impact
        const priceImpact = this.calculatePriceImpact(buyRoute, sellRoute);
        if (priceImpact > this.config.maxPriceImpact) {
            return null;
        }
        
        return {
            memeCoin,
            buyRoute,
            sellRoute,
            profitPercent,
            priceImpact,
            estimatedProfit: (profitPercent / 100) * this.config.tradeSize,
            timestamp: Date.now()
        };
    }

    calculatePriceImpact(buyRoute, sellRoute) {
        // Calculate total price impact across both trades
        const buyImpact = buyRoute.priceImpactPct || 0;
        const sellImpact = sellRoute.priceImpactPct || 0;
        return buyImpact + sellImpact;
    }

    async executeArbitrageTrade(opportunity) {
        const tradeId = `arb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            console.log(`🎯 Executing arbitrage trade for ${opportunity.memeCoin.symbol}`);
            console.log(`💰 Expected profit: ${opportunity.profitPercent.toFixed(2)}%`);
            
            // Add to active trades
            this.activeTrades.set(tradeId, {
                ...opportunity,
                status: 'executing',
                startTime: Date.now()
            });
            
            // Execute buy trade
            const buyResult = await this.executeTrade(opportunity.buyRoute, 'buy');
            if (!buyResult.success) {
                throw new Error(`Buy trade failed: ${buyResult.error}`);
            }
            
            // Execute sell trade
            const sellResult = await this.executeTrade(opportunity.sellRoute, 'sell');
            if (!sellResult.success) {
                throw new Error(`Sell trade failed: ${sellResult.error}`);
            }
            
            // Calculate actual profit
            const actualProfit = sellResult.amount - buyResult.amount;
            const actualProfitPercent = (actualProfit / buyResult.amount) * 100;
            
            // Update trade status
            this.activeTrades.set(tradeId, {
                ...opportunity,
                status: 'completed',
                actualProfit,
                actualProfitPercent,
                endTime: Date.now(),
                buyTx: buyResult.tx,
                sellTx: sellResult.tx
            });
            
            // Update daily stats
            this.updateDailyStats(actualProfit, buyResult.amount);
            
            // Add to trade history
            this.tradeHistory.push({
                id: tradeId,
                memeCoin: opportunity.memeCoin.symbol,
                profit: actualProfit,
                profitPercent: actualProfitPercent,
                volume: buyResult.amount,
                timestamp: Date.now(),
                buyTx: buyResult.tx,
                sellTx: sellResult.tx
            });
            
            console.log(`✅ Arbitrage completed! Profit: $${actualProfit.toFixed(4)} (${actualProfitPercent.toFixed(2)}%)`);
            
        } catch (error) {
            console.error(`❌ Arbitrage trade failed:`, error);
            
            // Update trade status
            this.activeTrades.set(tradeId, {
                ...opportunity,
                status: 'failed',
                error: error.message,
                endTime: Date.now()
            });
            
            // Update daily stats for loss
            this.updateDailyStats(-this.config.tradeSize * 0.01, this.config.tradeSize); // Assume 1% loss
        } finally {
            // Remove from active trades after a delay
            setTimeout(() => {
                this.activeTrades.delete(tradeId);
            }, 5000);
        }
    }

    async executeTrade(route, type) {
        try {
            const { transactions } = await this.jupiter.exchange({
                routeInfo: route,
                userPublicKey: this.config.walletPrivateKey.publicKey,
                wrapUnwrapSOL: false
            });
            
            // Execute transaction
            const tx = await sendAndConfirmTransaction(
                this.connection,
                transactions.txs[0],
                [this.config.walletPrivateKey],
                {
                    commitment: 'confirmed',
                    maxRetries: 3
                }
            );
            
            return {
                success: true,
                tx: tx,
                amount: route.inAmount / 1e6 // Convert from lamports
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async cancelTrade(tradeId) {
        const trade = this.activeTrades.get(tradeId);
        if (trade && trade.status === 'executing') {
            console.log(`🛑 Cancelling trade ${tradeId}`);
            // In a real implementation, you might want to cancel pending transactions
            this.activeTrades.set(tradeId, {
                ...trade,
                status: 'cancelled',
                endTime: Date.now()
            });
        }
    }

    updateDailyStats(profit, volume) {
        this.dailyStats.trades++;
        this.dailyStats.profit += profit;
        this.dailyStats.totalVolume += volume;
        
        if (profit > 0) {
            this.dailyStats.wins++;
        } else {
            this.dailyStats.losses++;
        }
    }

    async monitoringLoop() {
        while (this.isRunning) {
            try {
                // Print stats every 30 seconds
                if (this.dailyStats.trades % 10 === 0) {
                    this.printStats();
                }
                
                // Check for stuck trades
                const currentTime = Date.now();
                for (const [tradeId, trade] of this.activeTrades) {
                    if (trade.status === 'executing' && 
                        currentTime - trade.startTime > this.config.executionTimeout) {
                        console.log(`⏰ Trade ${tradeId} timed out, cancelling...`);
                        await this.cancelTrade(tradeId);
                    }
                }
                
                await this.sleep(30000); // 30 seconds
                
            } catch (error) {
                console.error('❌ Error in monitoring loop:', error);
                await this.sleep(5000);
            }
        }
    }

    printStats() {
        const winRate = this.dailyStats.trades > 0 ? 
            (this.dailyStats.wins / this.dailyStats.trades * 100).toFixed(1) : 0;
        
        console.log('\n📊 === MEME ARBITRAGE BOT STATS ===');
        console.log(`🕒 Runtime: ${moment.duration(Date.now() - this.dailyStats.startTime).humanize()}`);
        console.log(`📈 Total Trades: ${this.dailyStats.trades}`);
        console.log(`✅ Wins: ${this.dailyStats.wins || 0}`);
        console.log(`❌ Losses: ${this.dailyStats.losses || 0}`);
        console.log(`📊 Win Rate: ${winRate}%`);
        console.log(`💰 Total Profit: $${this.dailyStats.profit.toFixed(4)}`);
        console.log(`📊 Total Volume: $${this.dailyStats.totalVolume.toFixed(2)}`);
        console.log(`🎯 Active Trades: ${this.activeTrades.size}`);
        console.log('=====================================\n');
    }

    printFinalStats() {
        console.log('\n🏁 === FINAL BOT STATISTICS ===');
        this.printStats();
        
        // Print recent trades
        if (this.tradeHistory.length > 0) {
            console.log('\n📋 Recent Trades:');
            const recentTrades = this.tradeHistory.slice(-5);
            recentTrades.forEach(trade => {
                const status = trade.profit > 0 ? '✅' : '❌';
                console.log(`${status} ${trade.memeCoin}: $${trade.profit.toFixed(4)} (${trade.profitPercent.toFixed(2)}%)`);
            });
        }
        
        console.log('===============================\n');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = MemeArbitrageBot;