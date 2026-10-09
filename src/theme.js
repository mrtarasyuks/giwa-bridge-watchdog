import { safeGet, safeSet } from './storage.js';

const STORAGE_KEY = 'giwa-watchdog-theme';

function systemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function getTheme() {
  const saved = safeGet(STORAGE_KEY);
  return saved === 'light' || saved === 'dark' ? saved : systemTheme();
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function setTheme(theme) {
  safeSet(STORAGE_KEY, theme);
  applyTheme(theme);
}

export function initTheme() {
  applyTheme(getTheme());
  // Follow the system until the visitor picks explicitly.
  window.matchMedia?.('(prefers-color-scheme: light)').addEventListener?.('change', (e) => {
    if (safeGet(STORAGE_KEY)) return;
    applyTheme(e.matches ? 'light' : 'dark');
  });
}

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
