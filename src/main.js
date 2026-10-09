import { scanAddress } from './bridge.js';
import { fetchNetworkWithdrawalStats } from './networkStats.js';
import {
  L2_EXPLORER_BASE,
  L1_EXPLORER_BASE,
  EXAMPLE_ADDRESSES,
  APPROX_CHALLENGE_PERIOD_DAYS,
  L1_RPC_FALLBACK_WINDOW_BLOCKS,
  L2_SCAN_DEEP,
  L1_SCAN_DEEP,
} from './constants.js';

const form = document.getElementById('search-form');
const input = document.getElementById('address-input');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const withdrawalsListEl = document.getElementById('withdrawals-list');
const depositsListEl = document.getElementById('deposits-list');
const examplesEl = document.getElementById('examples');
const networkStatsEl = document.getElementById('network-stats');
const scanDeeperEl = document.getElementById('scan-deeper');

function setStatus(message, kind = 'info') {
  if (!message) {
    statusEl.hidden = true;
    statusEl.textContent = '';
    return;
  }
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.className = `status ${kind}`;
}

function shortHash(hash) {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('uk-UA');
}

function withdrawalCard(w) {
  const proofRow = w.proof
    ? `<div class="row">Prove: <a href="${w.proof.l1TxUrl}" target="_blank" rel="noopener">${shortHash(w.proof.l1TxHash)}</a> · ${formatTime(w.proof.timestamp)}</div>`
    : '';
  const finalizeRow = w.finalize
    ? `<div class="row">Finalize: <a href="${w.finalize.l1TxUrl}" target="_blank" rel="noopener">${shortHash(w.finalize.l1TxHash)}</a> · ${formatTime(w.finalize.timestamp)}</div>`
    : '';
  const actionRow = w.status.action ? `<div class="action">💡 ${w.status.action}</div>` : '';

  return `
    <div class="card status-${w.status.code}">
      <div class="card-head">
        <span class="badge badge-${w.status.code}">${w.status.label}</span>
        <span class="value">${w.valueEth > 0 ? `${Number(w.valueEth).toPrecision(6).replace(/\.?0+$/, '')} ETH` : 'повідомлення (0 ETH)'}</span>
      </div>
      <div class="row">Initiate: <a href="${w.l2TxUrl}" target="_blank" rel="noopener">${shortHash(w.l2TxHash)}</a> · ${formatTime(w.timestamp)}</div>
      ${proofRow}
      ${finalizeRow}
      ${actionRow}
      <div class="hash">withdrawalHash: <code>${w.withdrawalHash}</code></div>
    </div>
  `;
}

function depositCard(d) {
  return `
    <div class="card">
      <div class="card-head">
        <span class="badge badge-info">Депозит ініційовано на L1</span>
        <span class="value">${d.valueEth > 0 ? `${Number(d.valueEth).toPrecision(6).replace(/\.?0+$/, '')} ETH` : '—'}</span>
      </div>
      <div class="row">L1 tx: <a href="${d.l1TxUrl}" target="_blank" rel="noopener">${shortHash(d.l1TxHash)}</a> · ${formatTime(d.timestamp)}</div>
      <div class="action">💡 Зазвичай зараховується на L2 за 1–3 хв. Перевірте адресу на <a href="${L2_EXPLORER_BASE}/address/${d.address ?? ''}" target="_blank" rel="noopener">GIWA Sepolia explorer</a>, якщо довше.</div>
    </div>
  `;
}

function renderScanDeeper(data) {
  const canGoDeeper = !data.deep && (data.scan.l2Truncated || data.scan.l1Truncated);
  if (!canGoDeeper) {
    scanDeeperEl.hidden = true;
    scanDeeperEl.innerHTML = '';
    return;
  }
  scanDeeperEl.hidden = false;
  scanDeeperEl.innerHTML = `
    <p>
      У цієї адреси є ще старіші транзакції за межами звичайного вікна сканування
      (${data.scan.l2Scanned}/${data.scan.l2Max} на L2, ${data.scan.l1Scanned}/${data.scan.l1Max} на L1 — ліміт досягнуто,
      історія продовжується далі) — можливо, там є ще застряглі виведення великого фарм-кошелька.
    </p>
    <button type="button" id="scan-deeper-btn">🔎 Сканувати глибше (до ${L2_SCAN_DEEP}/${L1_SCAN_DEEP} tx, повільніше)</button>
  `;
  document.getElementById('scan-deeper-btn').addEventListener('click', () => runScan(data.address, { deep: true }));
}

async function runScan(rawAddress, { deep = false } = {}) {
  resultsEl.hidden = true;
  scanDeeperEl.hidden = true;
  if (!/^0x[0-9a-fA-F]{40}$/.test(rawAddress.trim())) {
    setStatus('Це не схоже на адресу кошелька (очікується 0x... з 40 hex-символів).', 'error');
    return;
  }
  setStatus(
    deep
      ? `Глибоке сканування (до ${L2_SCAN_DEEP} tx на L2, ${L1_SCAN_DEEP} на L1) — може зайняти хвилину…`
      : 'Шукаємо транзакції на GIWA Sepolia та Ethereum Sepolia…',
    'loading'
  );

  let data;
  try {
    data = await scanAddress(rawAddress.trim(), { deep });
  } catch (err) {
    setStatus(`Не вдалося отримати дані: ${err.message}`, 'error');
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set('address', data.address);
  window.history.replaceState({}, '', url);

  if (data.l1Unavailable) {
    setStatus(
      `Дані L2 (GIWA Sepolia) отримано. L1-джерело (${L1_EXPLORER_BASE}) недоступне: ${data.l1Unavailable}. Статус prove/finalize показати не можемо.`,
      'warning'
    );
  } else if (data.withdrawals.length === 0 && data.deposits.length === 0) {
    setStatus(
      `Транзакцій мосту для цієї адреси не знайдено (перевірено останні ${data.scan.l2Scanned} вихідних tx на L2 і ${data.scan.l1Scanned} на L1).`,
      'info'
    );
  } else {
    setStatus(null);
  }

  resultsEl.hidden = false;
  withdrawalsListEl.innerHTML = data.withdrawals.length
    ? data.withdrawals.map(withdrawalCard).join('')
    : '<p class="empty">Виведень не знайдено для цієї адреси.</p>';
  depositsListEl.innerHTML = data.deposits.length
    ? data.deposits.map((d) => depositCard({ ...d, address: data.address })).join('')
    : '<p class="empty">Депозитів не знайдено для цієї адреси.</p>';

  renderScanDeeper(data);
}

function renderExamples() {
  const links = EXAMPLE_ADDRESSES.map(
    (ex) => `<a href="#" data-example="${ex.address}">${ex.label}</a>`
  ).join(', ');
  examplesEl.innerHTML = `Приклад: ${links}
    <span class="hint">(вставте будь-яку адресу, що бриджила ETH на GIWA Sepolia)</span>`;

  examplesEl.querySelectorAll('[data-example]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      input.value = el.dataset.example;
      runScan(el.dataset.example);
    });
  });
}

function renderNetworkStats(stats) {
  const scope = stats.isFallback
    ? `за останні ~${Math.round((L1_RPC_FALLBACK_WINDOW_BLOCKS * 12) / 86400)} днів`
    : 'від запуску мережі';
  const fallbackNote = stats.isFallback
    ? '<p class="note">⚠️ Основний RPC (Tenderly) недоступний. Показано дані з резервного публічного RPC лише за недавнє вікно блоків (а не всю історію) — повна історія тимчасово не показується, числа нижче стосуються лише цього вікна.</p>'
    : '';
  networkStatsEl.innerHTML = `
    <p>
      📊 По всій мережі GIWA Sepolia (з логів OptimismPortal2 на L1, ${scope}):
      <b>${stats.provenTotal}</b> виведень пройшли prove, <b>${stats.finalizedTotal}</b> з них finalized →
      <b>${stats.pendingCount}</b> ще очікують finalize, і з них
      <b>${stats.overdueCount}</b> вже минули орієнтовний ${APPROX_CHALLENGE_PERIOD_DAYS}-денний challenge-період —
      тобто технічно готові й застрягли, бо ніхто не викликав finalize.
    </p>
    ${fallbackNote}
    <p class="note">Це не враховує виведення, які ще навіть не зробили prove на L1 (справжнє число застряглих ще більше) — ${APPROX_CHALLENGE_PERIOD_DAYS}-денний поріг не підтверджений офіційно, див. README.</p>
  `;
}

async function loadNetworkStats() {
  try {
    const stats = await fetchNetworkWithdrawalStats();
    renderNetworkStats(stats);
  } catch (err) {
    networkStatsEl.innerHTML = `<p class="note">Мережева статистика тимчасово недоступна: ${err.message}</p>`;
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value.trim()) runScan(input.value.trim());
});

renderExamples();
loadNetworkStats();

const initialAddress = new URL(window.location.href).searchParams.get('address');
if (initialAddress) {
  input.value = initialAddress;
  runScan(initialAddress);
}
