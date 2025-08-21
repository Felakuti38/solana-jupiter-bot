import 'dotenv/config';
import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import invariant from 'tiny-invariant';

export type BotConfig = {
  connection: Connection;
  wallet: Keypair;
  jupBaseUrl: string;
  paper: boolean;
  minProfitBps: number;
  maxNotionalSol: number;
  slippageBps: number;
  cooldownMs: number;
};

export function loadConfig(argv: string[]): BotConfig {
  const paper = argv.includes('--paper');
  const rpcUrl = process.env.RPC_URL || clusterApiUrl('mainnet-beta');
  const jupBaseUrl = process.env.JUP_BASE_URL || 'https://quote-api.jup.ag';
  const minProfitBps = Number(process.env.MIN_PROFIT_BPS || 30);
  const maxNotionalSol = Number(process.env.MAX_NOTIONAL_SOL || 0.5);
  const slippageBps = Number(process.env.SLIPPAGE_BPS || 100);
  const cooldownMs = Number(process.env.COOLDOWN_MS || 800);

  let wallet: Keypair;
  if (paper) {
    wallet = Keypair.generate();
  } else {
    const secret = process.env.WALLET_SECRET_KEY;
    invariant(secret, 'WALLET_SECRET_KEY must be set or run with --paper');
    const arr = JSON.parse(secret!);
    wallet = Keypair.fromSecretKey(Uint8Array.from(arr));
  }

  const connection = new Connection(rpcUrl, { commitment: 'confirmed' });
  return { connection, wallet, jupBaseUrl, paper, minProfitBps, maxNotionalSol, slippageBps, cooldownMs };
}
