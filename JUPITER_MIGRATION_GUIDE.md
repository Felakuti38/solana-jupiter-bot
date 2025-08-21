# Jupiter Migration Guide

## Overview
This guide helps migrate from the deprecated `@jup-ag/core` to the new `@jup-ag/api` v6.

## Key Changes Required

### 1. Import Changes
```javascript
// OLD (deprecated)
const { Jupiter } = require("@jup-ag/core");

// NEW
const { Jupiter } = require("@jup-ag/api");
```

### 2. API Changes

#### Route Computation
```javascript
// OLD
const routes = await jupiter.computeRoutes({
  inputMint: new PublicKey(inputToken.address),
  outputMint: new PublicKey(outputToken.address),
  amount: amountInJSBI,
  slippageBps: slippage,
  forceFetch: false,
  onlyDirectRoutes: false,
  filterTopNResult: 2,
});

// NEW
const routes = await jupiter.v6().quote({
  inputMint: inputToken.address,
  outputMint: outputToken.address,
  amount: amountInJSBI.toString(),
  slippageBps: slippage,
  onlyDirectRoutes: false,
  maxAccounts: 64,
});
```

#### Transaction Execution
```javascript
// OLD
const { execute } = await jupiter.exchange({
  routeInfo: route,
  computeUnitPriceMicroLamports: priority,
});
const result = await execute();

// NEW
const { transactions } = await jupiter.v6().swap({
  quoteResponse: route,
  userPublicKey: wallet.publicKey.toString(),
  computeUnitPriceMicroLamports: priority,
});

const result = await transactions.execute();
```

### 3. File Updates Required

#### `src/bot/setup.js`
- Update Jupiter import
- Modify route computation logic
- Update transaction execution

#### `src/bot/index.js`
- Update route computation calls
- Modify transaction handling
- Update error handling for new API responses

#### `src/wizard/Pages/Tokens.js`
- Update token list fetching if needed

## Migration Steps

1. **Install new dependency:**
   ```bash
   yarn add @jup-ag/api@^6.0.0
   yarn remove @jup-ag/core
   ```

2. **Update imports in all files**

3. **Test with small amounts first**

4. **Update error handling for new response formats**

## Benefits of Migration

- ✅ Better performance
- ✅ Improved reliability
- ✅ Latest features and bug fixes
- ✅ Reduced security vulnerabilities
- ✅ Active maintenance and support

## Testing Checklist

- [ ] Route computation works
- [ ] Transaction execution succeeds
- [ ] Error handling works properly
- [ ] Slippage calculations are correct
- [ ] Balance updates work correctly
- [ ] All trading strategies function

## Rollback Plan

If issues arise:
1. Keep old `@jup-ag/core` dependency
2. Create feature flag to switch between APIs
3. Test thoroughly before removing old code