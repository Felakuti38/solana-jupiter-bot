import { loadConfig } from './config.js';
import { logger } from './logger.js';
import { MEME_TOKENS, SOL_MINT } from './tokens.js';
import { getQuote } from './jupiter.js';
import Decimal from 'decimal.js';
import { computeProfit } from './arb.js';
import { buildAndSend } from './executor.js';

async function main() {
  const cfg = loadConfig(process.argv.slice(2));
  logger.info({ cfg: { paper: cfg.paper, minProfitBps: cfg.minProfitBps } }, 'starting bot');
  const sizesSol = [0.1, 0.2, cfg.maxNotionalSol].filter((v, i, a) => a.indexOf(v) === i).sort((a,b)=>a-b);

  while (true) {
    for (const token of MEME_TOKENS) {
      try {
        for (const sz of sizesSol) {
          const amountLamports = new Decimal(sz).mul(1e9).toFixed(0);
          const a = await getQuote(cfg.jupBaseUrl, SOL_MINT, token.mint, amountLamports, cfg.slippageBps);
          const b = await getQuote(cfg.jupBaseUrl, token.mint, SOL_MINT, a?.outAmount || '0', cfg.slippageBps);
          if (!a || !b) continue;
          const inAmount = new Decimal(amountLamports).div(1e9);
          const outAmount = new Decimal(b.outAmount).div(1e9);
          const { profit, profitBps } = computeProfit(inAmount, outAmount);
          if (profitBps >= cfg.minProfitBps) {
            logger.info({ token: token.symbol, sz, profitBps, inAmount: inAmount.toString(), outAmount: outAmount.toString(), dexes: { legA: a.dexes, legB: b.dexes } }, 'arb found');
            if (!cfg.paper) {
              // Execute sequentially: SOL->TOKEN then TOKEN->SOL using raw route quotes
              try {
                const sig1 = await buildAndSend(cfg.jupBaseUrl, cfg.connection, cfg.wallet, a.raw, cfg.paper);
                logger.info({ sig1 }, 'leg A sent');
                const sig2 = await buildAndSend(cfg.jupBaseUrl, cfg.connection, cfg.wallet, b.raw, cfg.paper);
                logger.info({ sig2 }, 'leg B sent');
              } catch (err) {
                logger.error({ err: String(err) }, 'execution failed');
              }
            }
            break;
          }
          await new Promise((r) => setTimeout(r, 50));
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

