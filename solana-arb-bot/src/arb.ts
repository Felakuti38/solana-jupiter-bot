import Decimal from 'decimal.js';
import { Quote } from './jupiter.js';

export type ArbOpportunity = {
  label: string;
  inputMint: string;
  middleMint: string;
  amountIn: Decimal;
  amountOut: Decimal;
  profit: Decimal;
  profitBps: number;
  sourceDex: string;
  destDex: string;
  routeA: Quote;
  routeB: Quote;
};

export function computeProfit(inAmount: Decimal, outAmount: Decimal): { profit: Decimal; profitBps: number } {
  const profit = outAmount.sub(inAmount);
  const profitBps = profit.div(inAmount).mul(10000).toDecimalPlaces(2).toNumber();
  return { profit, profitBps };
}

