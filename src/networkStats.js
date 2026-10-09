import {
  L1_RPC_URLS,
  L1_RPC_FALLBACK_WINDOW_BLOCKS,
  L1_OPTIMISM_PORTAL,
  APPROX_CHALLENGE_PERIOD_DAYS,
} from './constants.js';
import { TOPIC } from './bridgeAbi.js';

// Sepolia targets ~12s blocks; used only to turn the challenge-period estimate into a
// block-count cutoff so "overdue" withdrawals can be found without an extra request per
// withdrawal to fetch its exact timestamp.
const SECONDS_PER_BLOCK = 12;

async function rpcCallAt(url, method, params) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'RPC error');
  return json.result;
}

// Tries the primary L1 RPC for the portal's full log history first; if it's unreachable,
// falls through the remaining RPCs asking only for a recent block window each (see
// L1_RPC_FALLBACK_WINDOW_BLOCKS — the fallbacks are live-tested to reject a full-range
// query outright, see constants.js), so a primary-RPC outage degrades to "recent window"
// stats instead of no stats at all.
async function fetchLogsWithFallback() {
  let lastError;
  for (const [index, url] of L1_RPC_URLS.entries()) {
    const isFallback = index > 0;
    try {
      const latestHex = await rpcCallAt(url, 'eth_blockNumber', []);
      const fromBlock = isFallback
        ? `0x${Math.max(0, parseInt(latestHex, 16) - L1_RPC_FALLBACK_WINDOW_BLOCKS).toString(16)}`
        : '0x0';
      const logs = await rpcCallAt(url, 'eth_getLogs', [
        {
          address: L1_OPTIMISM_PORTAL,
          topics: [[TOPIC.WithdrawalProven, TOPIC.WithdrawalProvenExtension1, TOPIC.WithdrawalFinalized]],
          fromBlock,
          toBlock: 'latest',
        },
      ]);
      return { url, latestHex, logs, isFallback };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError ?? new Error('Усі публічні L1 RPC недоступні');
}

/**
 * Network-wide snapshot of every withdrawal that ever went through OptimismPortal2 on
 * L1: queried directly from the contract's own event log (not from any one address), so
 * it reflects the whole network rather than a sample of recent transactions.
 */
export async function fetchNetworkWithdrawalStats() {
  const { latestHex, logs, isFallback } = await fetchLogsWithFallback();

  const latestBlock = parseInt(latestHex, 16);
  const provenByHash = new Map();
  const finalizedHashes = new Set();

  for (const log of logs) {
    const topic0 = (log.topics?.[0] ?? '').toLowerCase();
    const withdrawalHash = log.topics?.[1];
    if (!withdrawalHash) continue;
    const blockNumber = parseInt(log.blockNumber, 16);
    if (topic0 === TOPIC.WithdrawalProven.toLowerCase() || topic0 === TOPIC.WithdrawalProvenExtension1.toLowerCase()) {
      if (!provenByHash.has(withdrawalHash)) provenByHash.set(withdrawalHash, blockNumber);
    } else if (topic0 === TOPIC.WithdrawalFinalized.toLowerCase()) {
      finalizedHashes.add(withdrawalHash);
    }
  }

  const challengeBlocks = Math.round((APPROX_CHALLENGE_PERIOD_DAYS * 24 * 60 * 60) / SECONDS_PER_BLOCK);
  let pendingCount = 0;
  let overdueCount = 0;
  for (const [hash, blockNumber] of provenByHash) {
    if (finalizedHashes.has(hash)) continue;
    pendingCount++;
    if (blockNumber < latestBlock - challengeBlocks) overdueCount++;
  }

  return {
    provenTotal: provenByHash.size,
    finalizedTotal: finalizedHashes.size,
    pendingCount,
    overdueCount,
    isFallback,
  };
}
