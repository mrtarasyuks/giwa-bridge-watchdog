import { scanAddress } from './bridge.js';
import { fetchNetworkWithdrawalStats } from './networkStats.js';
import { L2_EXPLORER_BASE, L1_EXPLORER_BASE, EXAMPLE_ADDRESSES, APPROX_CHALLENGE_PERIOD_DAYS } from './constants.js';

const form = document.getElementById('search-form');
const input = document.getElementById('address-input');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const withdrawalsListEl = document.getElementById('withdrawals-list');
const depositsListEl = document.getElementById('deposits-list');
const examplesEl = document.getElementById('examples');
const networkStatsEl = document.getElementById('network-stats');

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

async function runScan(rawAddress) {
  resultsEl.hidden = true;
  if (!/^0x[0-9a-fA-F]{40}$/.test(rawAddress.trim())) {
    setStatus('Це не схоже на адресу кошелька (очікується 0x... з 40 hex-символів).', 'error');
    return;
  }
  setStatus('Шукаємо транзакції на GIWA Sepolia та Ethereum Sepolia…', 'loading');

  let data;
  try {
    data = await scanAddress(rawAddress.trim());
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
    setStatus('Транзакцій мосту для цієї адреси не знайдено (перевірено останні 150 вихідних tx на L2 і 80 на L1).', 'info');
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
  networkStatsEl.innerHTML = `
    <p>
      📊 По всій мережі GIWA Sepolia (з логів OptimismPortal2 на L1, від запуску мережі):
      <b>${stats.provenTotal}</b> виведень пройшли prove, <b>${stats.finalizedTotal}</b> з них finalized →
      <b>${stats.pendingCount}</b> ще очікують finalize, і з них
      <b>${stats.overdueCount}</b> вже минули орієнтовний ${APPROX_CHALLENGE_PERIOD_DAYS}-денний challenge-період —
      тобто технічно готові й застрягли, бо ніхто не викликав finalize.
    </p>
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
