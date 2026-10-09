import { scanAddress } from './bridge.js';
import { fetchNetworkWithdrawalStats } from './networkStats.js';
import { icon } from './icons.js';
import { initTheme, getTheme, toggleTheme } from './theme.js';
import { initLang, setLang, getLang, t, LANGS, LANG_LABELS, LOCALE_MAP } from './i18n.js';
import {
  L2_EXPLORER_BASE,
  L1_EXPLORER_BASE,
  APPROX_CHALLENGE_PERIOD_DAYS,
  L1_RPC_FALLBACK_WINDOW_BLOCKS,
  L2_SCAN_DEEP,
  L1_SCAN_DEEP,
} from './constants.js';

const form = document.getElementById('search-form');
const input = document.getElementById('address-input');
const searchButton = document.getElementById('search-button');
const statusEl = document.getElementById('status');
const progressEl = document.getElementById('progress');
const resultsEl = document.getElementById('results');
const withdrawalsListEl = document.getElementById('withdrawals-list');
const depositsListEl = document.getElementById('deposits-list');
const scanDeeperEl = document.getElementById('scan-deeper');
const networkStatsEl = document.getElementById('network-stats');
const statsSourceEl = document.getElementById('stats-source');
const statsGridEl = document.getElementById('stats-grid');
const statsExtraEl = document.getElementById('stats-extra');
const langSwitchEl = document.getElementById('lang-switch');
const themeToggleEl = document.getElementById('theme-toggle');
const footerDataEl = document.getElementById('footer-data');
const footerLinksEl = document.getElementById('footer-links');

let lastStats = null;
let lastStatus = null;
let lastScanData = null;
let resultsShown = false;

const STATUS_KEY = {
  'needs-prove': 'needsProve',
  challenge: 'challenge',
  ready: 'ready',
  done: 'done',
  failed: 'failed',
  unknown: 'unknown',
};

const VERDICT_BY_CODE = {
  done: 'done',
  ready: 'stuck',
  'needs-prove': 'stuck',
  failed: 'stuck',
  challenge: 'pending',
  unknown: 'unknown',
};

const VERDICT_ICON = { done: 'checkCircle', stuck: 'alertTriangle', pending: 'clock', unknown: 'helpCircle' };
const STEP_ICON = { done: 'checkCircle', active: 'clock', stuck: 'alertTriangle', failed: 'xCircle', pending: '', unknown: 'helpCircle' };
const PROGRESS_STEPS = ['l2', 'l1', 'match'];

function locale() {
  return LOCALE_MAP[getLang()] ?? 'en-US';
}

function applyIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon);
  });
}

function applyStaticTranslations() {
  document.title = `${t('app.title')} — find stuck ETH withdrawals`;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
  });
  applyIcons();
}

function renderLangSwitch() {
  langSwitchEl.innerHTML = LANGS.map(
    (l) => `<button type="button" data-lang="${l}" class="${l === getLang() ? 'active' : ''}">${LANG_LABELS[l]}</button>`
  ).join('');
  langSwitchEl.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => changeLang(btn.dataset.lang));
  });
}

function changeLang(lang) {
  setLang(lang);
  const url = new URL(window.location.href);
  url.searchParams.set('lang', lang);
  window.history.replaceState({}, '', url);
  rerenderAll();
}

function renderThemeToggleIcon() {
  const current = getTheme();
  themeToggleEl.innerHTML = icon(current === 'dark' ? 'sun' : 'moon');
  themeToggleEl.setAttribute('aria-label', t(current === 'dark' ? 'controls.themeToLight' : 'controls.themeToDark'));
}

function renderFooter() {
  const l2link = `<a href="${L2_EXPLORER_BASE}" target="_blank" rel="noopener">${t('footer.l2linkLabel')}</a>`;
  const l1link = `<a href="${L1_EXPLORER_BASE}" target="_blank" rel="noopener">${t('footer.l1linkLabel')}</a>`;
  footerDataEl.innerHTML = t('footer.data', { l2link, l1link });
  footerLinksEl.innerHTML = `
    <a href="https://github.com/giwa-io" target="_blank" rel="noopener">${t('footer.github')}</a> ·
    <a href="https://docs.giwa.io/" target="_blank" rel="noopener">${t('footer.docs')}</a>
  `;
}

function rerenderAll() {
  applyStaticTranslations();
  renderLangSwitch();
  renderThemeToggleIcon();
  renderFooter();
  if (lastStats) renderNetworkStats(lastStats, { animate: false });
  if (lastStatus) setStatus(lastStatus.kind, lastStatus.key, lastStatus.vars);
  else setStatus(null, null);
  if (lastScanData) {
    renderResults(lastScanData);
    resultsEl.hidden = false;
  }
}

function shortHash(hash) {
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
}

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(locale());
}

function formatEth(ethStr) {
  const n = Number(ethStr);
  if (n > 0) return `${n.toPrecision(6).replace(/\.?0+$/, '')} ETH`;
  return t('card.messageOnly');
}

function animateCount(el, target, { duration = 900 } = {}) {
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const fmt = (n) => Math.round(n).toLocaleString(locale());
  if (reduceMotion || !target) {
    el.textContent = fmt(target);
    return;
  }
  const start = performance.now();
  function tick(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - progress) ** 3;
    el.textContent = fmt(target * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function buildStepper(code) {
  let proveState = 'done';
  let finalizeState = 'pending';
  if (code === 'needs-prove') {
    proveState = 'stuck';
  } else if (code === 'unknown') {
    proveState = 'unknown';
    finalizeState = 'unknown';
  } else if (code === 'challenge') {
    finalizeState = 'active';
  } else if (code === 'ready') {
    finalizeState = 'stuck';
  } else if (code === 'done') {
    finalizeState = 'done';
  } else if (code === 'failed') {
    finalizeState = 'failed';
  }
  const states = ['done', proveState, finalizeState];
  const lines = [
    states[1] === 'done' ? 'line-done' : states[1] === 'stuck' ? 'line-stuck' : '',
    states[2] === 'done' ? 'line-done' : states[2] === 'stuck' || states[2] === 'failed' ? 'line-stuck' : '',
  ];
  return { states, lines };
}

function stepperHtml(code) {
  const { states, lines } = buildStepper(code);
  const keys = ['initiate', 'prove', 'finalize'];
  const parts = [];
  keys.forEach((key, i) => {
    const iconName = STEP_ICON[states[i]];
    parts.push(
      `<div class="step state-${states[i]}"><span class="node">${iconName ? icon(iconName) : ''}</span><span class="label">${t('stepper.' + key)}</span></div>`
    );
    if (i < keys.length - 1) parts.push(`<div class="step-line ${lines[i]}"></div>`);
  });
  return `<div class="stepper">${parts.join('')}</div>`;
}

function withdrawalCard(w) {
  const code = w.status.code;
  const statusKey = STATUS_KEY[code];
  const verdict = VERDICT_BY_CODE[code];
  const vars = code === 'challenge' ? { days: w.status.daysLeft.toFixed(1) } : {};
  const label = t(`status.${statusKey}.label`, vars);
  const action = t(`status.${statusKey}.action`, vars);

  const proofRow = w.proof
    ? `<div>${t('card.proveRow')}: <a href="${w.proof.l1TxUrl}" target="_blank" rel="noopener">${shortHash(w.proof.l1TxHash)}</a> · ${formatTime(w.proof.timestamp)}</div>`
    : '';
  const finalizeRow = w.finalize
    ? `<div>${t('card.finalizeRow')}: <a href="${w.finalize.l1TxUrl}" target="_blank" rel="noopener">${shortHash(w.finalize.l1TxHash)}</a> · ${formatTime(w.finalize.timestamp)}</div>`
    : '';

  return `
    <div class="card">
      <div class="card-head">
        <span class="verdict verdict-${verdict}">${icon(VERDICT_ICON[verdict])}${t('verdict.' + verdict)}</span>
        <span class="value">${formatEth(w.valueEth)}</span>
      </div>
      ${stepperHtml(code)}
      <div class="detail-rows">
        <div>${t('card.initiateRow')}: <a href="${w.l2TxUrl}" target="_blank" rel="noopener">${shortHash(w.l2TxHash)}</a> · ${formatTime(w.timestamp)}</div>
        ${proofRow}
        ${finalizeRow}
      </div>
      <div class="action-box">${icon('info')}<span><b>${label}.</b> ${action}</span></div>
      <div class="hash">${t('card.hash')}: <code>${w.withdrawalHash}</code></div>
    </div>
  `;
}

function depositCard(d) {
  const linkLabel = t('card.depositActionLinkLabel');
  const link = `<a href="${L2_EXPLORER_BASE}/address/${d.address ?? ''}" target="_blank" rel="noopener">${linkLabel}</a>`;
  return `
    <div class="card">
      <div class="card-head">
        <span class="badge-info">${icon('checkCircle')}${t('card.depositBadge')}</span>
        <span class="value">${formatEth(d.valueEth)}</span>
      </div>
      <div class="detail-rows">
        <div>${t('card.l1TxRow')}: <a href="${d.l1TxUrl}" target="_blank" rel="noopener">${shortHash(d.l1TxHash)}</a> · ${formatTime(d.timestamp)}</div>
      </div>
      <div class="action-box">${icon('info')}<span>${t('card.depositAction', { link })}</span></div>
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
    <p>${t('scanDeeper.note', {
      l2scanned: data.scan.l2Scanned,
      l2max: data.scan.l2Max,
      l1scanned: data.scan.l1Scanned,
      l1max: data.scan.l1Max,
    })}</p>
    <button type="button" id="scan-deeper-btn">${icon('plusCircle')}${t('scanDeeper.button', { l2: L2_SCAN_DEEP, l1: L1_SCAN_DEEP })}</button>
  `;
  document.getElementById('scan-deeper-btn').addEventListener('click', () => runScan(data.address, { deep: true }));
}

function renderResults(data) {
  lastScanData = data;
  withdrawalsListEl.innerHTML = data.withdrawals.length
    ? data.withdrawals.map(withdrawalCard).join('')
    : `<p class="empty">${t('sections.emptyWithdrawals')}</p>`;
  depositsListEl.innerHTML = data.deposits.length
    ? data.deposits.map((d) => depositCard({ ...d, address: data.address })).join('')
    : `<p class="empty">${t('sections.emptyDeposits')}</p>`;
  renderScanDeeper(data);
}

function renderProgress(activeKey) {
  progressEl.hidden = false;
  const activeIdx = PROGRESS_STEPS.indexOf(activeKey);
  progressEl.innerHTML = PROGRESS_STEPS.map((key, i) => {
    const state = activeKey === 'done' || i < activeIdx ? 'done' : i === activeIdx ? 'active' : '';
    const label = t(`search.step${i + 1}`);
    const dot = state === 'done' ? icon('checkCircle') : '';
    return `<div class="progress-step ${state}"><span class="dot">${dot}</span><span>${label}</span></div>`;
  }).join('');
}

function hideProgress() {
  progressEl.hidden = true;
  progressEl.innerHTML = '';
}

function setStatus(kind, key, vars) {
  lastStatus = key ? { kind, key, vars } : null;
  if (!key) {
    statusEl.hidden = true;
    statusEl.innerHTML = '';
    return;
  }
  const text = t(key, vars);
  const iconName = kind === 'error' ? 'alertTriangle' : kind === 'warning' ? 'warning' : 'info';
  statusEl.hidden = false;
  statusEl.className = `status-msg ${kind}`;
  statusEl.innerHTML = `${icon(iconName)}<span>${text}</span>`;
}

async function runScan(rawAddress, { deep = false } = {}) {
  if (!resultsShown) resultsEl.hidden = true;
  scanDeeperEl.hidden = true;
  setStatus(null, null);

  if (!/^0x[0-9a-fA-F]{40}$/.test(rawAddress.trim())) {
    setStatus('error', 'search.invalidAddress');
    return;
  }

  searchButton.disabled = true;
  renderProgress('l2');

  let data;
  try {
    data = await scanAddress(rawAddress.trim(), { deep, onProgress: renderProgress });
  } catch (err) {
    hideProgress();
    searchButton.disabled = false;
    setStatus('error', 'search.scanFailed', { message: err.message });
    return;
  }
  hideProgress();
  searchButton.disabled = false;

  const url = new URL(window.location.href);
  url.searchParams.set('address', data.address);
  window.history.replaceState({}, '', url);

  if (data.l1Unavailable) {
    setStatus('warning', 'search.l1Unavailable', { base: L1_EXPLORER_BASE, message: data.l1Unavailable });
  } else if (data.withdrawals.length === 0 && data.deposits.length === 0) {
    setStatus('info', 'search.noTx', { l2: data.scan.l2Scanned, l1: data.scan.l1Scanned });
  } else {
    setStatus(null, null);
  }

  resultsEl.hidden = false;
  resultsShown = true;
  renderResults(data);
}

function renderNetworkStats(stats, { animate = true } = {}) {
  lastStats = stats;
  statsSourceEl.textContent = stats.isFallback
    ? t('stats.sourceWindow', { days: Math.round((L1_RPC_FALLBACK_WINDOW_BLOCKS * 12) / 86400) })
    : t('stats.sourceAll');

  const cells = [
    { key: 'proven', value: stats.provenTotal, cls: '' },
    { key: 'finalized', value: stats.finalizedTotal, cls: '' },
    { key: 'pending', value: stats.pendingCount, cls: '' },
    { key: 'overdue', value: stats.overdueCount, cls: 'overdue' },
  ];
  statsGridEl.innerHTML = cells
    .map(
      (c, i) =>
        `<div class="stat-cell ${c.cls}"><div class="stat-value" data-count="${i}">0</div><div class="stat-label">${t('stats.' + c.key)}</div></div>`
    )
    .join('');

  cells.forEach((c, i) => {
    const el = statsGridEl.querySelector(`[data-count="${i}"]`);
    if (animate) animateCount(el, c.value);
    else el.textContent = Math.round(c.value).toLocaleString(locale());
  });

  const extras = [];
  if (stats.isFallback) {
    extras.push(`<div class="note-box warn">${icon('warning')}<span>${t('stats.fallbackNote')}</span></div>`);
  }
  extras.push(`<div class="note-box">${icon('info')}<span>${t('stats.footnote', { days: APPROX_CHALLENGE_PERIOD_DAYS })}</span></div>`);
  statsExtraEl.innerHTML = extras.join('');
}

async function loadNetworkStats() {
  try {
    const stats = await fetchNetworkWithdrawalStats();
    renderNetworkStats(stats);
  } catch (err) {
    statsGridEl.innerHTML = `<p class="loading-line">${t('stats.error', { message: err.message })}</p>`;
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value.trim()) runScan(input.value.trim());
});

themeToggleEl.addEventListener('click', () => {
  toggleTheme();
  renderThemeToggleIcon();
});

initTheme();
initLang();
applyStaticTranslations();
renderLangSwitch();
renderThemeToggleIcon();
renderFooter();
loadNetworkStats();

const initialAddress = new URL(window.location.href).searchParams.get('address');
if (initialAddress) {
  input.value = initialAddress;
  runScan(initialAddress);
}
