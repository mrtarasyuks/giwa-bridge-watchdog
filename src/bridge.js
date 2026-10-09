import { decodeEventLog, formatEther, getAddress } from 'viem';
import {
  L2_EXPLORER_BASE,
  L1_EXPLORER_BASE,
  L2_TO_L1_MESSAGE_PASSER,
  L2_STANDARD_BRIDGE,
  L2_CROSS_DOMAIN_MESSENGER,
  DEPOSIT_TX_TYPE,
  APPROX_CHALLENGE_PERIOD_DAYS,
} from './constants.js';
import {
  MessagePassedEvent,
  WithdrawalProvenEvent,
  WithdrawalProvenExtension1Event,
  WithdrawalFinalizedEvent,
  TransactionDepositedEvent,
  TOPIC,
} from './bridgeAbi.js';
import { fetchSentTransactions, fetchTxLogs, mapWithConcurrency } from './blockscout.js';

const WITHDRAWAL_ENTRYPOINTS = new Set(
  [L2_TO_L1_MESSAGE_PASSER, L2_STANDARD_BRIDGE, L2_CROSS_DOMAIN_MESSENGER].map((a) => a.toLowerCase())
);

export function decodeLog(item, eventAbi) {
  try {
    const topics = (item.topics ?? []).filter(Boolean);
    return decodeEventLog({ abi: [eventAbi], data: item.data, topics });
  } catch {
    return null;
  }
}

function l2TxUrl(hash) {
  return `${L2_EXPLORER_BASE}/tx/${hash}`;
}
function l1TxUrl(hash) {
  return `${L1_EXPLORER_BASE}/tx/${hash}`;
}

/** Step 1 (L2): find WithdrawalInitiated-equivalent MessagePassed events sent by this address. */
async function findInitiatedWithdrawals(address) {
  const sentTxs = await fetchSentTransactions(L2_EXPLORER_BASE, address, 150);
  const candidates = sentTxs.filter((tx) => {
    const to = tx.to?.hash?.toLowerCase();
    return to && WITHDRAWAL_ENTRYPOINTS.has(to);
  });

  const perTx = await mapWithConcurrency(candidates, 5, async (tx) => {
    let logs = [];
    try {
      logs = await fetchTxLogs(L2_EXPLORER_BASE, tx.hash);
    } catch {
      return [];
    }
    return logs
      .filter((log) => log.address?.hash?.toLowerCase() === L2_TO_L1_MESSAGE_PASSER.toLowerCase())
      .filter((log) => (log.topics?.[0] ?? '').toLowerCase() === TOPIC.MessagePassed.toLowerCase())
      .map((log) => decodeLog(log, MessagePassedEvent))
      .filter(Boolean)
      .map((decoded) => ({
        withdrawalHash: decoded.args.withdrawalHash,
        nonce: decoded.args.nonce,
        valueWei: decoded.args.value,
        l2TxHash: tx.hash,
        timestamp: tx.timestamp,
      }));
  });

  return perTx.flat();
}

/** Step 2 (L1): scan this address's L1 txs for WithdrawalProven(Extension1)/WithdrawalFinalized/TransactionDeposited. */
async function scanL1Activity(address) {
  const sentTxs = await fetchSentTransactions(L1_EXPLORER_BASE, address, 80);

  const perTx = await mapWithConcurrency(sentTxs, 5, async (tx) => {
    let logs = [];
    try {
      logs = await fetchTxLogs(L1_EXPLORER_BASE, tx.hash);
    } catch {
      return { proven: [], provenExt1: [], finalized: [], deposited: [] };
    }
    const proven = [];
    const provenExt1 = [];
    const finalized = [];
    const deposited = [];

    for (const log of logs) {
      const topic0 = (log.topics?.[0] ?? '').toLowerCase();
      if (topic0 === TOPIC.WithdrawalProven.toLowerCase()) {
        const d = decodeLog(log, WithdrawalProvenEvent);
        if (d) proven.push({ withdrawalHash: d.args.withdrawalHash, l1TxHash: tx.hash, timestamp: tx.timestamp });
      } else if (topic0 === TOPIC.WithdrawalProvenExtension1.toLowerCase()) {
        const d = decodeLog(log, WithdrawalProvenExtension1Event);
        if (d) provenExt1.push({ withdrawalHash: d.args.withdrawalHash, l1TxHash: tx.hash, timestamp: tx.timestamp });
      } else if (topic0 === TOPIC.WithdrawalFinalized.toLowerCase()) {
        const d = decodeLog(log, WithdrawalFinalizedEvent);
        if (d)
          finalized.push({
            withdrawalHash: d.args.withdrawalHash,
            success: d.args.success,
            l1TxHash: tx.hash,
            timestamp: tx.timestamp,
          });
      } else if (topic0 === TOPIC.TransactionDeposited.toLowerCase()) {
        const d = decodeLog(log, TransactionDepositedEvent);
        if (d) deposited.push({ l1TxHash: tx.hash, timestamp: tx.timestamp, valueWei: tx.value });
      }
    }
    return { proven, provenExt1, finalized, deposited };
  });

  return {
    proven: perTx.flatMap((r) => r.proven),
    provenExt1: perTx.flatMap((r) => r.provenExt1),
    finalized: perTx.flatMap((r) => r.finalized),
    deposited: perTx.flatMap((r) => r.deposited),
  };
}

function withdrawalStatus(proof, finalize, l1Unavailable) {
  const now = Date.now();
  if (!proof && !finalize && l1Unavailable) {
    return {
      code: 'unknown',
      label: 'Статус на L1 невідомий (джерело недоступне)',
      action: 'Не вдалось прочитати L1 explorer — перевірте вручну, чи зроблено prove/finalize.',
    };
  }
  if (finalize) {
    return finalize.success
      ? { code: 'done', label: 'Завершено', action: null }
      : { code: 'failed', label: 'Finalize виконано, але L2-виклик провалився', action: 'Перевірте деталі транзакції на L1 explorer — можливо, потрібно повторити finalize.' };
  }
  if (proof) {
    const provenAt = new Date(proof.timestamp).getTime();
    const readyAt = provenAt + APPROX_CHALLENGE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
    if (now < readyAt) {
      const daysLeft = Math.max(0, (readyAt - now) / (24 * 60 * 60 * 1000));
      return {
        code: 'challenge',
        label: `У challenge-періоді (≈${daysLeft.toFixed(1)} дн. лишилось)`,
        action: 'Нічого робити не треба — зачекайте завершення періоду, потім викличте finalize.',
      };
    }
    return {
      code: 'ready',
      label: 'Готове до finalize',
      action: 'Challenge-період минув — викличте finalize withdrawal на L1, інакше кошти застрягнуть.',
    };
  }
  return {
    code: 'needs-prove',
    label: 'Потребує prove на L1',
    action: 'Виведення ініційоване на L2, але ще не підтверджене (proven) на L1 — без цього кроку воно застрягне назавжди.',
  };
}

export async function scanAddress(address) {
  const normalized = getAddress(address);

  let initiated;
  try {
    initiated = await findInitiatedWithdrawals(normalized);
  } catch (err) {
    throw new ScanError('l2', err);
  }

  let l1Activity = { proven: [], provenExt1: [], finalized: [], deposited: [] };
  let l1Unavailable = null;
  try {
    l1Activity = await scanL1Activity(normalized);
  } catch (err) {
    l1Unavailable = err.message;
  }

  const provenByHash = new Map();
  for (const p of l1Activity.proven) provenByHash.set(p.withdrawalHash, p);
  for (const p of l1Activity.provenExt1) if (!provenByHash.has(p.withdrawalHash)) provenByHash.set(p.withdrawalHash, p);
  const finalizedByHash = new Map(l1Activity.finalized.map((f) => [f.withdrawalHash, f]));

  const withdrawals = initiated
    .map((w) => {
      const proof = provenByHash.get(w.withdrawalHash) ?? null;
      const finalize = finalizedByHash.get(w.withdrawalHash) ?? null;
      return {
        ...w,
        valueEth: formatEther(w.valueWei ?? 0n),
        l2TxUrl: l2TxUrl(w.l2TxHash),
        proof: proof && { ...proof, l1TxUrl: l1TxUrl(proof.l1TxHash) },
        finalize: finalize && { ...finalize, l1TxUrl: l1TxUrl(finalize.l1TxHash) },
        status: withdrawalStatus(proof, finalize, l1Unavailable),
      };
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const deposits = l1Activity.deposited
    .map((d) => ({
      ...d,
      valueEth: formatEther(BigInt(d.valueWei ?? 0)),
      l1TxUrl: l1TxUrl(d.l1TxHash),
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return { address: normalized, withdrawals, deposits, l1Unavailable };
}

export class ScanError extends Error {
  constructor(source, cause) {
    super(`scan failed (${source}): ${cause.message}`);
    this.source = source;
    this.cause = cause;
  }
}
