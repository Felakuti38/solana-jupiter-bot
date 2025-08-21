import fetch from 'cross-fetch';

export type Quote = {
  inAmount: string;
  outAmount: string;
  priceImpactPct?: number;
  routes: any[];
  dexes: string[];
  contextSlot?: number;
};

export async function getQuote(
  baseUrl: string,
  inputMint: string,
  outputMint: string,
  amount: string,
  slippageBps: number,
  excludeDexes?: string[],
): Promise<Quote | null> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount,
    slippageBps: String(slippageBps),
    onlyDirectRoutes: 'true',
    asLegacyTransaction: 'true',
  });
  if (excludeDexes && excludeDexes.length) params.append('excludeDexes', excludeDexes.join(','));
  const res = await fetch(`${baseUrl}/v6/quote?${params.toString()}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.data || !data.data[0]) return null;
  const route = data.data[0];
  return {
    inAmount: route.inAmount,
    outAmount: route.outAmount,
    priceImpactPct: route.priceImpactPct,
    routes: route.routePlan,
    dexes: route.routePlan.map((r: any) => r.swapInfo.label),
    contextSlot: data.contextSlot,
  };
}

