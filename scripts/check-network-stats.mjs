#!/usr/bin/env node
// Runs the same network-wide eth_getLogs query the live page's banner uses, appends the
// result to a small history file, and flags a run where pendingCount drops sharply since
// the last snapshot. On a live testnet, proven-but-not-finalized withdrawals should only
// grow or hold steady day over day — a sharp drop almost always means a bad RPC response
// (fallback window, partial logs) rather than a real improvement, so it's worth a loud
// failure in CI rather than silently showing a wrong number to the next visitor.
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fetchNetworkWithdrawalStats } from '../src/networkStats.js';

const HISTORY_PATH = fileURLToPath(new URL('../ci/network-stats-history.json', import.meta.url));
const HISTORY_DIR = fileURLToPath(new URL('../ci/', import.meta.url));
const MAX_ENTRIES = 180; // ~6 months of daily snapshots
const PENDING_DROP_ALERT_RATIO = 0.2; // flag a >20% drop in pendingCount run-to-run

function loadHistory() {
  if (!existsSync(HISTORY_PATH)) return [];
  try {
    return JSON.parse(readFileSync(HISTORY_PATH, 'utf8'));
  } catch {
    return [];
  }
}

async function main() {
  const stats = await fetchNetworkWithdrawalStats();
  const entry = { ...stats, checkedAt: new Date().toISOString() };

  const history = loadHistory();
  const previous = history.length > 0 ? history[history.length - 1] : null;

  history.push(entry);
  const trimmed = history.slice(-MAX_ENTRIES);

  mkdirSync(HISTORY_DIR, { recursive: true });
  writeFileSync(HISTORY_PATH, JSON.stringify(trimmed, null, 2) + '\n');

  console.log(
    `network stats: proven=${entry.provenTotal} finalized=${entry.finalizedTotal} ` +
      `pending=${entry.pendingCount} overdue=${entry.overdueCount} source=${entry.isFallback ? 'fallback' : 'primary'}`
  );

  if (entry.isFallback) {
    console.log(
      'note: primary RPC unreachable, this snapshot came from a fallback RPC and only covers a recent window — skipping the drop check for this run.'
    );
    return;
  }

  if (!previous || previous.isFallback || previous.pendingCount === 0) {
    console.log('ok: no comparable previous snapshot, nothing to compare against yet.');
    return;
  }

  const drop = (previous.pendingCount - entry.pendingCount) / previous.pendingCount;
  if (drop > PENDING_DROP_ALERT_RATIO) {
    console.error(
      `ANOMALY: pendingCount dropped ${(drop * 100).toFixed(1)}% since the last snapshot ` +
        `(${previous.pendingCount} -> ${entry.pendingCount}, checked ${previous.checkedAt} -> ${entry.checkedAt}). ` +
        'Pending withdrawals should only grow or stay flat on a live testnet over a day — treat this number as suspect until investigated.'
    );
    process.exitCode = 1;
    return;
  }

  console.log('ok: no anomaly detected.');
}

main().catch((err) => {
  console.error('network stats check failed:', err.message);
  process.exitCode = 1;
});
