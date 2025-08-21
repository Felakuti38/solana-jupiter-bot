import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import fetch from 'cross-fetch';

export async function buildAndSend(
  baseUrl: string,
  connection: Connection,
  wallet: Keypair,
  quoteResponse: any,
  paper: boolean,
): Promise<string | null> {
  const res = await fetch(`${baseUrl}/v6/swap`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey: wallet.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      asLegacyTransaction: false,
    }),
  });
  if (!res.ok) return null;
  const { swapTransaction } = await res.json();
  const txBuf = Buffer.from(swapTransaction, 'base64');
  const tx = VersionedTransaction.deserialize(txBuf);
  if (paper) return 'paper-tx';
  tx.sign([wallet]);
  const sig = await connection.sendTransaction(tx, { skipPreflight: true, maxRetries: 3 });
  return sig;
}

