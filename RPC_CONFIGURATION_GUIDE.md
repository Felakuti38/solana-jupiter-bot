# 🌐 RPC Configuration Guide

## 📋 **Current RPC Setup in the Bot**

The bot now includes a comprehensive list of RPC endpoints built into the configuration. Here's what's currently available and how to configure it.

## 🔧 **RPC Configuration Structure:**

### **Environment Variables:**
The bot uses two main environment variables for RPC configuration:

```bash
DEFAULT_RPC=https://your-primary-rpc-endpoint.com
ALT_RPC_LIST=https://backup-rpc1.com,https://backup-rpc2.com,https://backup-rpc3.com
```

### **Built-in RPC Endpoints:**
The bot now includes these RPC endpoints directly in the configuration:

#### **Premium RPCs (Recommended for Trading):**
```
1. Helius: https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
2. GS Node: https://rpc.gsnode.io
3. Chainstack: https://solana-mainnet.chainstacklabs.com
4. QuickNode: https://solana-mainnet.rpc.quicknode.com
```

#### **Free/Public RPCs:**
```
5. Ankr: https://rpc.ankr.com/solana
6. dRPC: https://solana.drpc.org/
7. LeoRPC: https://solana.leorpc.com/?api_key=FREE
8. Solana Foundation: https://api.mainnet-beta.solana.com
```

#### **Custom RPCs:**
```
9. Additional RPCs from ALT_RPC_LIST environment variable
```

## 🚀 **Recommended RPC Configurations:**

### **For $1 Trading (Recommended):**
```bash
# Primary RPC (DEFAULT_RPC)
DEFAULT_RPC=https://api.mainnet-beta.solana.com

# Alternative RPCs (ALT_RPC_LIST)
ALT_RPC_LIST=https://rpc.ankr.com/solana,https://solana.drpc.org/
```

### **For High-Frequency Trading (Premium):**
```bash
# Primary RPC (DEFAULT_RPC)
DEFAULT_RPC=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Alternative RPCs (ALT_RPC_LIST)
ALT_RPC_LIST=https://rpc.gsnode.io,https://solana-mainnet.chainstacklabs.com
```

### **For Testing/Learning (Free):**
```bash
# Primary RPC (DEFAULT_RPC)
DEFAULT_RPC=https://api.mainnet-beta.solana.com

# Alternative RPCs (ALT_RPC_LIST)
ALT_RPC_LIST=https://solana-api.projectserum.com,https://rpc.ankr.com/solana
```

## 📁 **Configuration Files:**

### **1. Environment File (.env):**
```bash
# Required: Your wallet private key
SOLANA_WALLET_PRIVATE_KEY=your_private_key_here

# Required: Primary RPC endpoint
DEFAULT_RPC=https://api.mainnet-beta.solana.com

# Optional: Additional custom RPC endpoints (comma-separated)
ALT_RPC_LIST=https://rpc.ankr.com/solana,https://solana.drpc.org/

# Optional: Skip intro
SKIP_INTRO=false
```

### **2. Configuration Wizard:**
The bot automatically loads all RPCs and presents them in the configuration wizard:

```javascript
// From src/constants/index.js
rpc: {
    value: [],
    isSet: false,
    state: {
        items: [
            // Primary RPC from environment variable
            {
                label: process.env.DEFAULT_RPC || "https://api.mainnet-beta.solana.com",
                value: process.env.DEFAULT_RPC || "https://api.mainnet-beta.solana.com",
                isSelected: true,
            },
            // Built-in RPC list
            {
                label: "Helius (Premium) - https://mainnet.helius-rpc.com/?api-key=YOUR_KEY",
                value: "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY",
                isSelected: false,
            },
            // ... more RPCs
        ],
    },
},
```

## 🔄 **RPC Fallback System:**

### **Primary Fallback:**
```javascript
// From src/utils/transaction.js
const rpc_main = cache.config.rpc[0];
const rpc_backup = 'https://api.mainnet-beta.solana.com';

// Main RPC
const connection = new Connection(rpc_main, {
    disableRetryOnRateLimit: true,
    commitment: 'confirmed',
});

// Backup RPC
const connection_backup = new Connection(rpc_backup, {
    disableRetryOnRateLimit: false,
    commitment: 'confirmed',
});
```

### **Transaction Lookup Fallback:**
The bot automatically falls back to the backup RPC if the primary RPC fails.

## 📊 **RPC Performance Comparison:**

### **Premium RPCs:**
| RPC | Speed | Rate Limit | Reliability | Cost | Setup |
|-----|-------|------------|-------------|------|-------|
| **Helius** | Very Fast | High | Very High | $99+/month | API Key Required |
| **GS Node** | Very Fast | High | Very High | $99+/month | Direct Access |
| **Chainstack** | Very Fast | High | Very High | $99+/month | Direct Access |
| **QuickNode** | Very Fast | High | Very High | $49+/month | Direct Access |

### **Free/Public RPCs:**
| RPC | Speed | Rate Limit | Reliability | Cost | Setup |
|-----|-------|------------|-------------|------|-------|
| **Ankr** | Fast | Medium | High | Free | Direct Access |
| **dRPC** | Fast | Medium | High | Free | Direct Access |
| **LeoRPC** | Fast | Medium | High | Free | API Key Required |
| **Solana Foundation** | Medium | Low | Medium | Free | Direct Access |

## 🛠️ **Setup Instructions:**

### **Step 1: Create .env File**
```bash
# Copy the example file
cp .env.example .env

# Edit the .env file
nano .env
```

### **Step 2: Configure RPCs**
```bash
# Add your wallet private key
SOLANA_WALLET_PRIVATE_KEY=your_private_key_here

# Set primary RPC
DEFAULT_RPC=https://api.mainnet-beta.solana.com

# Set alternative RPCs (comma-separated)
ALT_RPC_LIST=https://rpc.ankr.com/solana,https://solana.drpc.org/
```

### **Step 3: Test RPC Connection**
```bash
# Run the configuration wizard
yarn wizard

# Select your RPC from the dropdown
# The bot will test the connection automatically
```

## 🎯 **RPC Selection Strategy:**

### **For $1 Trading:**
```
Recommended RPC Setup:
- Primary: Solana Foundation (Free) or Ankr (Free)
- Backup: dRPC (Free)
- Alternatives: LeoRPC (Free)
```

### **For High-Frequency Trading:**
```
Recommended RPC Setup:
- Primary: Helius (Premium) or QuickNode (Premium)
- Backup: GS Node (Premium) or Chainstack (Premium)
- Alternatives: Multiple premium RPCs for redundancy
```

### **For Testing/Learning:**
```
Recommended RPC Setup:
- Primary: Solana Foundation (Free)
- Backup: Ankr (Free) or dRPC (Free)
- Alternatives: LeoRPC (Free)
```

## ⚠️ **Important Notes:**

### **Rate Limits:**
- **Public RPCs**: Limited requests per second
- **Premium RPCs**: Higher rate limits
- **429 Errors**: Indicate rate limit exceeded

### **Latency:**
- **Public RPCs**: 100-500ms latency
- **Premium RPCs**: 10-50ms latency
- **Impact**: Lower latency = better trading performance

### **Reliability:**
- **Public RPCs**: May have downtime
- **Premium RPCs**: 99.9%+ uptime
- **Backup**: Always have multiple RPCs configured

## 💡 **Pro Tips:**

1. **Start with free RPCs** for testing and learning
2. **Upgrade to premium RPCs** for serious trading
3. **Configure multiple RPCs** for redundancy
4. **Test RPC performance** before trading
5. **Monitor for 429 errors** and switch RPCs if needed
6. **Keep backup RPCs** ready for emergencies

## 🔧 **Troubleshooting:**

### **Common Issues:**
```
1. 429 Rate Limit Errors:
   - Switch to a different RPC
   - Increase minInterval in config
   - Use premium RPC with higher limits

2. Connection Timeouts:
   - Check RPC endpoint URL
   - Try backup RPC
   - Verify network connectivity

3. Transaction Failures:
   - RPC may be behind
   - Switch to faster RPC
   - Check transaction status manually
```

### **RPC Health Check:**
```bash
# Test RPC response time
curl -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
  https://api.mainnet-beta.solana.com
```

## 🚀 **Getting Started:**

### **Quick Start (Free RPCs):**
```bash
# 1. Clone the repository
git clone https://github.com/Felakuti38/solana-jupiter-bot.git
cd solana-jupiter-bot

# 2. Install dependencies
yarn install

# 3. Set up .env file
cp .env.example .env
# Edit .env with your wallet private key

# 4. Run the configuration wizard
yarn wizard
# Select RPC from the dropdown menu
```

### **Premium Setup:**
```bash
# 1. Get API keys from premium providers
# 2. Update .env file with premium RPCs
# 3. Run configuration wizard
# 4. Select premium RPC from dropdown
```

**The bot now includes a comprehensive list of RPC endpoints built-in, making it easy to select the best option for your trading needs!** 🚀