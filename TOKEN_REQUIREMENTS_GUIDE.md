# 💰 Token Requirements Guide

## 🎯 **What Tokens Do You Need in Your Wallet?**

### **📋 Quick Answer:**
**You only need the tokens you want to trade with!** The bot will automatically handle the trading pairs you configure.

## 🔄 **Trading Strategy Requirements:**

### **1. PingPong Strategy (Token A ↔ Token B):**
```
You need BOTH tokens in your wallet:
- Token A (e.g., USDC)
- Token B (e.g., SOL)

The bot will swap back and forth between them.
```

### **2. Arbitrage Strategy (Token A → Token A):**
```
You only need ONE token in your wallet:
- Token A (e.g., USDC)

The bot will trade the same token through different routes/DEXes.
```

## 💡 **Recommended Token Pairs for $1 Trading:**

### **High-Liquidity Pairs (Best for Beginners):**

#### **USDC/SOL Pair:**
```
Wallet Requirements:
- USDC (for trading)
- SOL (for transaction fees + trading)

Trading Strategy: PingPong
- USDC → SOL → USDC → SOL...
```

#### **USDC/USDT Pair:**
```
Wallet Requirements:
- USDC (for trading)
- SOL (for transaction fees only)

Trading Strategy: PingPong
- USDC → USDT → USDC → USDT...
```

#### **SOL/USDT Pair:**
```
Wallet Requirements:
- SOL (for trading + transaction fees)
- USDT (for trading)

Trading Strategy: PingPong
- SOL → USDT → SOL → USDT...
```

### **Arbitrage Examples:**

#### **USDC Arbitrage:**
```
Wallet Requirements:
- USDC (for trading)
- SOL (for transaction fees only)

Trading Strategy: Arbitrage
- USDC → USDC (through different DEXes)
```

#### **SOL Arbitrage:**
```
Wallet Requirements:
- SOL (for trading + transaction fees)

Trading Strategy: Arbitrage
- SOL → SOL (through different DEXes)
```

## 🏦 **Minimum Balance Requirements:**

### **For $1 Trading:**

#### **PingPong Strategy:**
```
Token A: $1.00 minimum
Token B: $1.00 minimum
SOL: 0.01 SOL (~$0.20) for transaction fees
Total: ~$2.20 minimum
```

#### **Arbitrage Strategy:**
```
Token A: $1.00 minimum
SOL: 0.01 SOL (~$0.20) for transaction fees
Total: ~$1.20 minimum
```

### **Recommended Starting Balances:**

#### **Conservative ($1 trades):**
```
USDC: $10.00
SOL: 0.05 SOL (~$1.00)
Total: ~$11.00
```

#### **Balanced ($1 trades):**
```
USDC: $25.00
SOL: 0.1 SOL (~$2.00)
Total: ~$27.00
```

#### **Aggressive ($1 trades):**
```
USDC: $50.00
SOL: 0.2 SOL (~$4.00)
Total: ~$54.00
```

## 🔧 **Bot Configuration Examples:**

### **USDC/SOL PingPong Setup:**
```javascript
{
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
    "value": 1000000  // $1.00 in USDC (6 decimals)
  }
}
```

### **USDC Arbitrage Setup:**
```javascript
{
  "strategy": "arbitrage",
  "tokens": {
    "tokenA": {
      "symbol": "USDC",
      "address": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    }
  },
  "tradeSize": {
    "strategy": "fixed",
    "value": 1000000  // $1.00 in USDC (6 decimals)
  }
}
```

## 💰 **Token Addresses (Mainnet):**

### **Major Tokens:**
```
USDC: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
USDT: Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
SOL: So11111111111111111111111111111111111111112
```

### **Popular Trading Tokens:**
```
BONK: DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263
JUP: JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN
RAY: 4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R
```

## 🚀 **Getting Started Steps:**

### **1. Choose Your Strategy:**
- **PingPong**: Good for volatile pairs, need both tokens
- **Arbitrage**: Good for stable pairs, need only one token

### **2. Select Your Token Pair:**
- **USDC/SOL**: High liquidity, good volatility
- **USDC/USDT**: Very low fees, stable
- **SOL/USDT**: Good liquidity, moderate volatility

### **3. Fund Your Wallet:**
```
Minimum Requirements:
- Trading tokens: $1.00 each (for pingpong)
- SOL: 0.01 SOL for transaction fees

Recommended:
- Trading tokens: $10-50 each
- SOL: 0.05-0.2 SOL for fees
```

### **4. Configure the Bot:**
- Run the configuration wizard
- Select your strategy and tokens
- Set trade size to $1.00
- Configure safety settings

## ⚠️ **Important Notes:**

### **Transaction Fees:**
- **SOL is always needed** for transaction fees
- **Minimum 0.01 SOL** recommended for fees
- **Fees are ~$0.0003 per transaction**

### **Token Decimals:**
- **USDC**: 6 decimals ($1.00 = 1000000)
- **USDT**: 6 decimals ($1.00 = 1000000)
- **SOL**: 9 decimals ($1.00 = 1000000000)

### **Liquidity Requirements:**
- **High-liquidity pairs** have better success rates
- **Avoid low-liquidity tokens** for $1 trading
- **Check token liquidity** before trading

## 🎯 **Recommended Starting Setup:**

### **For Beginners (PingPong):**
```
Wallet Balance:
- USDC: $10.00
- SOL: 0.05 SOL (~$1.00)

Configuration:
- Strategy: PingPong
- Token A: USDC
- Token B: SOL
- Trade Size: $1.00
- Safety Level: BALANCED
```

### **For Beginners (Arbitrage):**
```
Wallet Balance:
- USDC: $10.00
- SOL: 0.05 SOL (~$1.00)

Configuration:
- Strategy: Arbitrage
- Token A: USDC
- Trade Size: $1.00
- Safety Level: BALANCED
```

## 💡 **Pro Tips:**

1. **Start with USDC/SOL** - highest liquidity and success rate
2. **Keep extra SOL** for transaction fees
3. **Use high-liquidity pairs** for better execution
4. **Monitor your balances** to ensure sufficient funds
5. **Start small** and scale up as you gain confidence

**Remember: You only need the tokens you want to trade with, plus SOL for transaction fees!** 🚀