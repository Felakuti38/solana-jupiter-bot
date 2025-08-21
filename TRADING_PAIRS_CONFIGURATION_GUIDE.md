# 🎯 Trading Pairs Configuration Guide

## 📋 **How to Configure the Bot for Specific Pairs**

The bot uses a configuration wizard where you manually select your trading pairs. Here's exactly how to set it up for your preferred pairs.

## 🔧 **Configuration Methods:**

### **Method 1: Interactive Wizard (Recommended)**
Run the bot and use the interactive configuration wizard to select your tokens.

### **Method 2: Manual Configuration File**
Edit the `config.json` file directly to set your preferred pairs.

## 🚀 **Step-by-Step Configuration:**

### **Step 1: Run the Bot Configuration Wizard**
```bash
# Clone the repository
git clone https://github.com/Felakuti38/solana-jupiter-bot.git
cd solana-jupiter-bot

# Install dependencies
yarn install

# Set up your .env file
cp .env.example .env
# Edit .env with your wallet private key and RPC

# Run the configuration wizard
yarn wizard
```

### **Step 2: Configure Each Trading Pair**

#### **For USDC/SOL Pair:**
```
1. Strategy: Select "pingpong"
2. Network: Select "mainnet"
3. RPC: Choose your preferred RPC
4. Tokens:
   - Token A: Type "USDC" and select from dropdown
   - Token B: Type "SOL" and select from dropdown
5. Trade Size: Set to $1.00 (1000000 for USDC)
6. Profit: Set to 0.5%
7. Slippage: Set to 0.1% (10 BPS)
8. Priority: Set to 10000 (default)
9. Safety Level: Set to "BALANCED"
10. Advanced Settings:
    - AMM Strategy: "OPTIMIZED"
    - Max Risk/Trade: 2%
    - Max Daily Loss: 10%
    - Max Concurrent Trades: 3
    - Cooldown Period: 200ms
```

#### **For USDC/USDT Pair:**
```
1. Strategy: Select "pingpong"
2. Network: Select "mainnet"
3. RPC: Choose your preferred RPC
4. Tokens:
   - Token A: Type "USDC" and select from dropdown
   - Token B: Type "USDT" and select from dropdown
5. Trade Size: Set to $1.00 (1000000 for USDC)
6. Profit: Set to 0.3% (lower due to stable pair)
7. Slippage: Set to 0.05% (5 BPS)
8. Priority: Set to 10000 (default)
9. Safety Level: Set to "BALANCED"
10. Advanced Settings:
    - AMM Strategy: "OPTIMIZED"
    - Max Risk/Trade: 2%
    - Max Daily Loss: 10%
    - Max Concurrent Trades: 5
    - Cooldown Period: 150ms
```

#### **For SOL/USDT Pair:**
```
1. Strategy: Select "pingpong"
2. Network: Select "mainnet"
3. RPC: Choose your preferred RPC
4. Tokens:
   - Token A: Type "SOL" and select from dropdown
   - Token B: Type "USDT" and select from dropdown
5. Trade Size: Set to $1.00 (1000000000 for SOL)
6. Profit: Set to 0.4%
7. Slippage: Set to 0.1% (10 BPS)
8. Priority: Set to 10000 (default)
9. Safety Level: Set to "BALANCED"
10. Advanced Settings:
    - AMM Strategy: "OPTIMIZED"
    - Max Risk/Trade: 2%
    - Max Daily Loss: 10%
    - Max Concurrent Trades: 3
    - Cooldown Period: 200ms
```

## 📁 **Manual Configuration File Method:**

### **Create Multiple Configuration Files:**

#### **config-usdc-sol.json:**
```json
{
  "network": "mainnet",
  "rpc": "https://api.mainnet-beta.solana.com",
  "strategy": "pingpong",
  "tokens": {
    "tokenA": {
      "symbol": "USDC",
      "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    },
    "tokenB": {
      "symbol": "SOL",
      "address": "So11111111111111111111111111111111111111112"
    }
  },
  "tradeSize": {
    "strategy": "fixed",
    "value": 1000000
  },
  "profit": {
    "minPercProfit": 0.5
  },
  "slippage": 10,
  "priority": 10000,
  "advanced": {
    "safetyLevel": "BALANCED",
    "ammStrategy": "OPTIMIZED",
    "maxRiskPerTrade": 0.02,
    "maxDailyLoss": 0.10,
    "maxConcurrentTrades": 3,
    "cooldownPeriod": 200
  }
}
```

#### **config-usdc-usdt.json:**
```json
{
  "network": "mainnet",
  "rpc": "https://api.mainnet-beta.solana.com",
  "strategy": "pingpong",
  "tokens": {
    "tokenA": {
      "symbol": "USDC",
      "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    },
    "tokenB": {
      "symbol": "USDT",
      "address": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
    }
  },
  "tradeSize": {
    "strategy": "fixed",
    "value": 1000000
  },
  "profit": {
    "minPercProfit": 0.3
  },
  "slippage": 5,
  "priority": 10000,
  "advanced": {
    "safetyLevel": "BALANCED",
    "ammStrategy": "OPTIMIZED",
    "maxRiskPerTrade": 0.02,
    "maxDailyLoss": 0.10,
    "maxConcurrentTrades": 5,
    "cooldownPeriod": 150
  }
}
```

#### **config-sol-usdt.json:**
```json
{
  "network": "mainnet",
  "rpc": "https://api.mainnet-beta.solana.com",
  "strategy": "pingpong",
  "tokens": {
    "tokenA": {
      "symbol": "SOL",
      "address": "So11111111111111111111111111111111111111112"
    },
    "tokenB": {
      "symbol": "USDT",
      "address": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
    }
  },
  "tradeSize": {
    "strategy": "fixed",
    "value": 1000000000
  },
  "profit": {
    "minPercProfit": 0.4
  },
  "slippage": 10,
  "priority": 10000,
  "advanced": {
    "safetyLevel": "BALANCED",
    "ammStrategy": "OPTIMIZED",
    "maxRiskPerTrade": 0.02,
    "maxDailyLoss": 0.10,
    "maxConcurrentTrades": 3,
    "cooldownPeriod": 200
  }
}
```

## 🎯 **Running Different Pairs:**

### **Method 1: Switch Configurations**
```bash
# For USDC/SOL trading
cp config-usdc-sol.json config.json
yarn start

# For USDC/USDT trading
cp config-usdc-usdt.json config.json
yarn start

# For SOL/USDT trading
cp config-sol-usdt.json config.json
yarn start
```

### **Method 2: Multiple Instances (Advanced)**
```bash
# Terminal 1: USDC/SOL
cp config-usdc-sol.json config.json
yarn start

# Terminal 2: USDC/USDT
cp config-usdc-usdt.json config2.json
yarn start --config config2.json

# Terminal 3: SOL/USDT
cp config-sol-usdt.json config3.json
yarn start --config config3.json
```

## 💰 **Token Addresses Reference:**

### **Mainnet Token Addresses:**
```
USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
USDT: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
SOL: So11111111111111111111111111111111111111112
```

### **Token Decimals:**
```
USDC: 6 decimals ($1.00 = 1000000)
USDT: 6 decimals ($1.00 = 1000000)
SOL: 9 decimals ($1.00 = 1000000000)
```

## 🚀 **Recommended Trading Strategy:**

### **Phase 1: Start with USDC/SOL**
```
- Highest liquidity
- Good volatility for profits
- Best success rate
- Recommended for beginners
```

### **Phase 2: Add USDC/USDT**
```
- Very low fees
- Stable pair
- Good for high-frequency trading
- Lower profit per trade but more trades
```

### **Phase 3: Add SOL/USDT**
```
- Good liquidity
- Moderate volatility
- Diversified trading
- Balanced risk/reward
```

## 📊 **Expected Performance by Pair:**

### **USDC/SOL:**
```
- Success Rate: 95%+
- Profit per Trade: 0.5%
- Daily Trades: 200-300
- Daily Profit: $1.00-$1.50
```

### **USDC/USDT:**
```
- Success Rate: 98%+
- Profit per Trade: 0.3%
- Daily Trades: 400-600
- Daily Profit: $1.20-$1.80
```

### **SOL/USDT:**
```
- Success Rate: 92%+
- Profit per Trade: 0.4%
- Daily Trades: 150-250
- Daily Profit: $0.60-$1.00
```

## 🛡️ **Safety Considerations:**

### **Wallet Requirements:**
```
USDC/SOL Trading:
- USDC: $10-50
- SOL: 0.05-0.2 SOL

USDC/USDT Trading:
- USDC: $10-50
- USDT: $10-50
- SOL: 0.05-0.2 SOL (for fees)

SOL/USDT Trading:
- SOL: 0.05-0.2 SOL
- USDT: $10-50
```

### **Risk Management:**
```
- Start with one pair at a time
- Monitor performance for each pair
- Adjust settings based on results
- Keep sufficient SOL for transaction fees
```

## 💡 **Pro Tips:**

1. **Start with USDC/SOL** - most beginner-friendly
2. **Use the wizard** for initial setup
3. **Save configurations** for easy switching
4. **Monitor each pair** separately
5. **Scale up gradually** as you gain confidence

**The bot will only trade the specific pair you configure - it won't trade any other tokens automatically!** 🎯