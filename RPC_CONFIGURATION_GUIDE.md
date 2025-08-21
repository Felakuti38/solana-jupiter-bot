# 🌐 RPC Configuration Guide

## 📋 **Current RPC Setup in the Bot**

The bot uses environment variables to configure RPC endpoints. Here's what's currently set up and how to configure it.

## 🔧 **RPC Configuration Structure:**

### **Environment Variables:**
The bot uses two main environment variables for RPC configuration:

```bash
DEFAULT_RPC=https://your-primary-rpc-endpoint.com
ALT_RPC_LIST=https://backup-rpc1.com,https://backup-rpc2.com,https://backup-rpc3.com
```

### **Current Default Configuration:**
Based on the code analysis, the bot currently has:

#### **Primary RPC:**
- **Default**: Set via `DEFAULT_RPC` environment variable
- **Fallback**: `https://api.mainnet-beta.solana.com` (hardcoded backup)

#### **Alternative RPCs:**
- **List**: Set via `ALT_RPC_LIST` environment variable (comma-separated)
- **Usage**: Used as backup options in the configuration wizard

## 🚀 **Recommended RPC Endpoints:**

### **Free Public RPCs:**
```bash
# Primary RPC (DEFAULT_RPC)
DEFAULT_RPC=https://api.mainnet-beta.solana.com

# Alternative RPCs (ALT_RPC_LIST)
ALT_RPC_LIST=https://solana-api.projectserum.com,https://rpc.ankr.com/solana,https://solana.public-rpc.com
```

### **Premium RPCs (Recommended for Trading):**
```bash
# Primary RPC (DEFAULT_RPC)
DEFAULT_RPC=https://your-premium-rpc-endpoint.com

# Alternative RPCs (ALT_RPC_LIST)
ALT_RPC_LIST=https://backup-premium-rpc1.com,https://backup-premium-rpc2.com
```

### **Popular RPC Providers:**
```
1. QuickNode (Premium)
2. Alchemy (Premium)
3. Helius (Premium)
4. GenesysGo (Premium)
5. Ankr (Free/Premium)
6. Project Serum (Free)
7. Solana Labs (Free)
```

## 📁 **Configuration Files:**

### **1. Environment File (.env):**
```bash
# Required: Your wallet private key
SOLANA_WALLET_PRIVATE_KEY=your_private_key_here

# Required: Primary RPC endpoint
DEFAULT_RPC=https://api.mainnet-beta.solana.com

# Optional: Alternative RPC endpoints (comma-separated)
ALT_RPC_LIST=https://solana-api.projectserum.com,https://rpc.ankr.com/solana

# Optional: Skip intro
SKIP_INTRO=false
```

### **2. Configuration Wizard:**
The bot automatically loads RPCs from environment variables and presents them in the configuration wizard:

```javascript
// From src/constants/index.js
rpc: {
    value: [],
    isSet: false,
    state: {
        items: [
            {
                label: process.env.DEFAULT_RPC,
                value: process.env.DEFAULT_RPC,
                isSelected: true,
            },
            ...String(process.env.ALT_RPC_LIST)
                .split(",")
                .map((item) => ({
                    label: item,
                    value: item,
                    isSelected: false,
                })),
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
The bot automatically falls back to the backup RPC if the primary RPC fails:

```javascript
const checkTransactionStatus = async (transaction, wallet_address) => {
    try {
        const primaryTransaction = await fetchTransaction(connection, transaction);
        
        if (!primaryTransaction) {
            // If primary RPC fails, try backup RPC
            return await fetchTransaction(connection_backup, transaction);
        }

        return primaryTransaction;
    } catch (error) {
        console.error("Error checking transaction status:", error);
        return null;
    }
};
```

## 🎯 **RPC Selection Strategy:**

### **For $1 Trading:**
```
Recommended RPC Setup:
- Primary: Premium RPC (QuickNode, Alchemy, Helius)
- Backup: Public RPC (api.mainnet-beta.solana.com)
- Alternatives: 2-3 additional premium RPCs
```

### **For High-Frequency Trading:**
```
Recommended RPC Setup:
- Primary: Premium RPC with high rate limits
- Backup: Premium RPC with different provider
- Alternatives: Multiple premium RPCs for redundancy
```

### **For Testing/Learning:**
```
Recommended RPC Setup:
- Primary: Public RPC (api.mainnet-beta.solana.com)
- Backup: Public RPC (solana-api.projectserum.com)
- Alternatives: Free RPCs for testing
```

## 📊 **RPC Performance Comparison:**

### **Free Public RPCs:**
| RPC | Speed | Rate Limit | Reliability | Cost |
|-----|-------|------------|-------------|------|
| **api.mainnet-beta.solana.com** | Medium | Low | Medium | Free |
| **solana-api.projectserum.com** | Fast | Medium | High | Free |
| **rpc.ankr.com/solana** | Fast | Medium | High | Free |
| **solana.public-rpc.com** | Medium | Low | Medium | Free |

### **Premium RPCs:**
| RPC | Speed | Rate Limit | Reliability | Cost |
|-----|-------|------------|-------------|------|
| **QuickNode** | Very Fast | High | Very High | $49+/month |
| **Alchemy** | Very Fast | High | Very High | $49+/month |
| **Helius** | Very Fast | High | Very High | $99+/month |
| **GenesysGo** | Fast | High | High | $99+/month |

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
ALT_RPC_LIST=https://solana-api.projectserum.com,https://rpc.ankr.com/solana
```

### **Step 3: Test RPC Connection**
```bash
# Run the configuration wizard
yarn wizard

# Select your RPC from the dropdown
# The bot will test the connection automatically
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

1. **Use Premium RPCs** for serious trading
2. **Configure multiple RPCs** for redundancy
3. **Test RPC performance** before trading
4. **Monitor for 429 errors** and switch RPCs if needed
5. **Keep backup RPCs** ready for emergencies

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

**The bot automatically handles RPC fallbacks, but using premium RPCs will significantly improve your trading performance!** 🚀