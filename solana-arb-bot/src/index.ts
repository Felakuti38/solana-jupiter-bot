import { loadConfig } from './config.js';
import { logger } from './logger.js';
import { MEME_TOKENS, SOL_MINT } from './tokens.js';
import { getQuote } from './jupiter.js';
import Decimal from 'decimal.js';
import { computeProfit } from './arb.js';

async function main() {
  const cfg = loadConfig(process.argv.slice(2));
  logger.info({ cfg: { paper: cfg.paper, minProfitBps: cfg.minProfitBps } }, 'starting bot');
  const tradeSizeSol = new Decimal(cfg.maxNotionalSol);
  const amountLamports = tradeSizeSol.mul(1e9).toFixed(0);

  while (true) {
    for (const token of MEME_TOKENS) {
      try {
        const a = await getQuote(cfg.jupBaseUrl, SOL_MINT, token.mint, amountLamports, cfg.slippageBps);
        const b = await getQuote(cfg.jupBaseUrl, token.mint, SOL_MINT, a?.outAmount || '0', cfg.slippageBps);
        if (!a || !b) continue;
        const inAmount = new Decimal(amountLamports).div(1e9);
        const outAmount = new Decimal(b.outAmount).div(1e9);
        const { profit, profitBps } = computeProfit(inAmount, outAmount);
        if (profitBps >= cfg.minProfitBps) {
          logger.info({ token: token.symbol, profitBps, inAmount: inAmount.toString(), outAmount: outAmount.toString() }, 'arb found');
        }
        await new Promise((r) => setTimeout(r, cfg.cooldownMs));
      } catch (e) {
        logger.warn({ err: String(e), token: token.symbol }, 'quote error');
      }
    }
  }
}

main().catch((e) => {
  logger.error({ err: e }, 'fatal');
  process.exit(1);
});

