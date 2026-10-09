// Thin wrapper around localStorage: private-browsing modes and some embedded webviews
// throw on access rather than just no-op, so every call is guarded. Preferences (theme,
// language) silently fall back to defaults instead of crashing the page.

export function safeGet(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore — preference just won't persist
  }
}
