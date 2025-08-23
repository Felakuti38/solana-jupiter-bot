# 🚀 **Bot Startup Guide - After Wizard Completion**

## 🎯 **How to Start Your Enhanced Bot**

After completing the wizard configuration, here's exactly how to start your meme coin arbitrage bot:

## 📋 **Step-by-Step Startup Process**

### **Step 1: Complete the Wizard**
```bash
cd /mnt/c/solana-jupiter-bot
npm run wizard
```

**Follow the wizard prompts:**
1. Select strategy (🎭 Meme Coin Arbitrage or ⚡ Micro Trading recommended)
2. Choose tokens (SOL/AUTO_DETECT for meme coins)
3. Set trade size ($1.00 recommended for testing)
4. Configure profit targets (0.8-2%)
5. Set risk limits

### **Step 2: Wizard Completion**

When wizard finishes, you'll see:
```
✅ Configuration saved to config.json
🎉 Setup complete!
```

### **Step 3: Start the Bot**

The wizard **may auto-start** the bot. If not, use one of these methods:

#### **Method A: Standard Start (Recommended)**
```bash
npm run start
```

#### **Method B: Direct Trading Mode**
```bash
npm run trade
```

#### **Method C: Node Direct**
```bash
node src/bot/index.js
```

## 🎭 **Strategy-Specific Startup**

### **For Meme Coin Arbitrage:**
```bash
# If you configured meme coin arbitrage in wizard
npm run trade

# Or force meme coin strategy
TRADING_STRATEGY=memecoin-arbitrage npm run trade
```

**Expected output:**
```
🎭 Setting up memecoin-arbitrage strategy
💰 Trade size: $1.00
🚀 Starting MEMECOIN-ARBITRAGE strategy
⚡ Min interval: 200ms
🎯 Min profit: 0.8%
🎭 Starting meme coin arbitrage strategy...
🔍 Token SOL: Regular token
🎯 Token BONK meme score: 5/6 (MEME)
🔍 Searching for arbitrage opportunities...
```

### **For Micro Trading:**
```bash
# If you configured micro trading in wizard  
npm run trade

# Or force micro trading strategy
TRADING_STRATEGY=micro-trading npm run trade
```

**Expected output:**
```
⚡ Setting up micro-trading strategy
💰 Trade size: $1.00
🚀 Starting MICRO-TRADING strategy
⚡ Min interval: 100ms
🎯 Min profit: 0.5%
⚡ Starting micro trading strategy...
💰 Calculated trade size: $1.00
🔄 Executing micro arbitrage: $1.00
```

## 🛡️ **CLMM Issue Protection (FIXED!)**

I've fixed the **Jupiter CLMM loop route issue** you mentioned:

### **What Was Fixed:**
- ✅ **Excluded Raydium CLMM** from default FAST strategy
- ✅ **Added `onlyDirectRoutes: true`** to prevent loops
- ✅ **Added `enforceSingleTx: true`** to avoid complex routing
- ✅ **Reduced `filterTopNResult`** to minimize problematic routes
- ✅ **Created CLMM protection utility** with error handling

### **Protection Features:**
- **Automatic retry** with safer settings on CLMM errors
- **Route filtering** to remove problematic combinations
- **Fallback to ultra-safe mode** if errors persist
- **Error detection** for CLMM-related issues

## 📊 **Successful Startup Indicators**

### **You'll know it's working when you see:**
```
✅ RPC Connected: Solana 2.3.7
🔑 Wallet loaded: [your_address]
💰 Balance: X.XXXX SOL
🚀 Starting [STRATEGY] strategy
🔍 Scanning for opportunities...
[STRATEGY] 🚀 TRADE: 1.234% | Buy
[STRATEGY] ✅ SUCCESS: [transaction_hash]
```

### **Performance Logs:**
```
📊 Stats: 10 trades, 90.0% success, 15.2 trades/min
✅ Successful micro trade: +1.456%
🎯 Meme coin arbitrage successful: 2.123% profit
```

## ⚠️ **Common Startup Issues & Solutions**

### **Issue 1: "Config file not found"**
```bash
# Solution: Run wizard again
npm run wizard
```

### **Issue 2: "Insufficient balance"**
```bash
# Check wallet balance
node -e "
require('dotenv').config();
const { Connection, Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const connection = new Connection(process.env.RPC_ENDPOINT);
const wallet = Keypair.fromSecretKey(bs58.decode(process.env.SOLANA_WALLET_PRIVATE_KEY));
connection.getBalance(wallet.publicKey).then(b => 
  console.log('Need at least 0.1 SOL, you have:', (b/1000000000).toFixed(4), 'SOL')
);
"

# Fund wallet if needed
```

### **Issue 3: "bn.js Assertion failed" (CLMM Issue)**
```bash
# This should now be fixed with my updates
# If you still see this, force ultra-safe mode:
TRADING_STRATEGY=micro-trading AMM_STRATEGY=ULTRA_SAFE npm run trade
```

### **Issue 4: RPC Connection Issues**
```bash
# Test RPC connection
node -e "
require('dotenv').config();
const { Connection } = require('@solana/web3.js');
const connection = new Connection(process.env.RPC_ENDPOINT);
connection.getVersion().then(v => console.log('✅ RPC OK:', v.solana-core));
"
```

## 🎯 **Bot Control Commands**

### **While Bot is Running:**
- **Stop**: Press `Ctrl + C` (graceful shutdown)
- **Force Stop**: Press `Ctrl + C` twice
- **View Logs**: Bot shows real-time trading activity

### **Restart Bot:**
```bash
# Stop current bot (Ctrl + C)
# Then restart
npm run trade
```

### **Change Strategy:**
```bash
# Stop bot, run wizard again to change strategy
npm run wizard
```

## 📊 **Monitoring Your Bot**

### **Key Metrics to Watch:**
- **Success Rate**: Should be >85%
- **Average Profit**: 0.5-2% per trade
- **Error Rate**: Should be <10%
- **Balance Changes**: Monitor SOL balance

### **Warning Signs:**
- **Many "SKIP" messages**: Increase slippage or reduce min profit
- **"Insufficient balance"**: Fund wallet or reduce trade size
- **"No routes found"**: Check RPC connection or token liquidity
- **Repeated errors**: May need to adjust strategy settings

## 🎉 **You're Ready to Trade!**

1. **✅ CLMM issues fixed**
2. **✅ Enhanced strategies integrated**  
3. **✅ Wizard configured**
4. **✅ Startup methods provided**

**Run the wizard, complete the configuration, then start trading with your enhanced meme coin arbitrage bot!** 🎭⚡💰

---

**Next:** Complete wizard → Run `npm run trade` → Monitor performance → Adjust as needed!