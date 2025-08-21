# Solana Arbitrage Trading Bot

A sophisticated arbitrage trading bot for Solana meme coins using micro trading strategies. The bot monitors multiple DEXes for price discrepancies and executes profitable trades automatically.

## Features

### Core Functionality
- **Multi-DEX Support**: Integrates with Raydium, Orca, and Jupiter
- **Real-time Arbitrage Detection**: Continuously scans for price discrepancies
- **Automated Trade Execution**: Executes trades with slippage protection
- **Meme Coin Focus**: Specialized filters for meme coin trading

### Risk Management
- **Dynamic Position Sizing**: Kelly Criterion-based position sizing
- **Stop Loss Protection**: Automatic stop-loss implementation
- **Daily Loss Limits**: Prevents excessive daily losses
- **Circuit Breakers**: Stops trading after consecutive losses
- **Rate Limiting**: Controls trade frequency

### Monitoring & Analytics
- **Real-time Dashboard**: Terminal-based UI with live metrics
- **Performance Tracking**: P&L tracking and win rate analysis
- **Trade History**: Complete execution history logging
- **Risk Metrics**: Drawdown and risk exposure monitoring

## Installation

1. Clone the repository:
```bash
cd /workspace/solana-arbitrage-bot
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Build the project:
```bash
npm run build
```

## Configuration

### Required Settings

Edit `.env` file with your settings:

```env
# Solana Network
SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
SOLANA_WS_ENDPOINT=wss://api.mainnet-beta.solana.com

# Wallet (NEVER commit real private keys!)
WALLET_PRIVATE_KEY=your_wallet_private_key_here

# Trading Parameters
MIN_PROFIT_THRESHOLD=0.005  # Minimum 0.5% profit
MAX_SLIPPAGE=0.02           # Maximum 2% slippage
MAX_POSITION_SIZE=100       # Maximum position in SOL
MIN_LIQUIDITY=1000          # Minimum liquidity in USD
```

### Supported Meme Tokens

The bot comes pre-configured with popular meme tokens:
- BONK
- WIF (dogwifhat)
- MYRO
- POPCAT

Add more tokens in `src/config/config.ts`.

## Usage

### Start the Bot

```bash
# Production mode
npm start

# Development mode with auto-reload
npm run dev

# With dashboard
npm run monitor
```

### Commands

- `q` or `ESC`: Quit the bot
- `r`: Refresh dashboard
- `Ctrl+C`: Graceful shutdown

## Architecture

### Component Structure

```
src/
├── core/           # Core functionality
│   ├── wallet.ts   # Wallet management
│   ├── executor.ts # Trade execution
│   └── risk-manager.ts # Risk management
├── dex/            # DEX integrations
│   ├── base.ts     # Base DEX interface
│   ├── raydium.ts  # Raydium integration
│   └── jupiter.ts  # Jupiter aggregator
├── strategies/     # Trading strategies
│   └── arbitrage.ts # Arbitrage detection
├── monitoring/     # Monitoring tools
│   └── dashboard.ts # Terminal dashboard
├── types/          # TypeScript types
├── utils/          # Utilities
└── config/         # Configuration
```

### Trading Flow

1. **Token Monitoring**: Continuously monitors configured meme tokens
2. **Price Discovery**: Fetches prices from multiple DEXes
3. **Opportunity Detection**: Identifies profitable arbitrage opportunities
4. **Risk Assessment**: Evaluates opportunities against risk parameters
5. **Trade Execution**: Executes buy and sell orders atomically
6. **Performance Tracking**: Records results and updates metrics

## Risk Management

### Safety Features

1. **Position Limits**: Never exceeds maximum position size
2. **Liquidity Checks**: Ensures sufficient liquidity before trading
3. **Slippage Protection**: Cancels trades exceeding slippage tolerance
4. **Balance Monitoring**: Maintains minimum SOL for gas fees
5. **Error Recovery**: Handles network errors gracefully

### Risk Parameters

- **Daily Loss Limit**: Stops trading after reaching daily loss threshold
- **Consecutive Loss Circuit Breaker**: Pauses after multiple losses
- **Dynamic Position Sizing**: Reduces size during drawdowns
- **Kelly Criterion**: Optimal position sizing based on win rate

## Performance Optimization

### Micro Trading Strategies

1. **High-Frequency Scanning**: 2-second scan intervals
2. **Low-Latency Execution**: Parallel transaction processing
3. **Smart Routing**: Finds optimal paths through DEX aggregators
4. **Gas Optimization**: Batches transactions when possible

### Best Practices

1. **Use dedicated RPC endpoints** for better performance
2. **Monitor gas prices** and adjust during congestion
3. **Start with small positions** to test the system
4. **Keep sufficient SOL** for transaction fees
5. **Regular profit taking** to secure gains

## Security Considerations

⚠️ **IMPORTANT SECURITY NOTES**:

1. **Never share your private key**
2. **Use a dedicated trading wallet**
3. **Start with small amounts**
4. **Test on devnet first**
5. **Monitor the bot actively**
6. **Set conservative risk limits**

## Monitoring

### Dashboard Metrics

- **P&L Tracking**: Real-time profit/loss
- **Trade History**: Recent executions
- **Win Rate**: Success percentage
- **Risk Metrics**: Drawdown and exposure
- **Opportunity Feed**: Live arbitrage opportunities

### Logging

Logs are stored in:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

## Troubleshooting

### Common Issues

1. **Insufficient Balance**
   - Ensure wallet has enough SOL for fees
   - Check token balances match position sizes

2. **No Opportunities Found**
   - Verify RPC endpoint is working
   - Check DEX configurations
   - Adjust profit thresholds

3. **Failed Transactions**
   - Check network congestion
   - Increase slippage tolerance
   - Verify token accounts exist

4. **Dashboard Not Loading**
   - Ensure terminal supports blessed
   - Try running without dashboard

## Development

### Adding New DEXes

1. Create new DEX class extending `BaseDEX`
2. Implement required methods
3. Add to DEX configuration
4. Register in main bot

### Custom Strategies

1. Create strategy in `src/strategies/`
2. Implement opportunity detection
3. Add to arbitrage detector
4. Configure risk parameters

## Disclaimer

⚠️ **TRADING DISCLAIMER**:

This bot is for educational purposes. Cryptocurrency trading carries significant risk:

- You can lose your entire investment
- Arbitrage opportunities may be unprofitable after fees
- Smart contract risks exist
- Network congestion can cause losses
- Past performance doesn't guarantee future results

**USE AT YOUR OWN RISK**

## Support

For issues and questions:
1. Check the logs in `logs/` directory
2. Review configuration settings
3. Ensure all dependencies are installed
4. Verify network connectivity

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

---

**Remember**: Start small, test thoroughly, and never invest more than you can afford to lose!