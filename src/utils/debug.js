// Unified lightweight debug utilities.
// Enable if either: build is dev OR localStorage['debug'] === '1'.
// Usage: import { debugLog, debugWarn, debugError, debugEnabled } from '../utils/debug';

export const debugEnabled = (() => {
  if (typeof window === "undefined") return import.meta.env.DEV;
  try {
    return import.meta.env.DEV || window.localStorage.getItem("debug") === "1";
  } catch {
    return import.meta.env.DEV;
  }
})();

function emit(fn, args) {
  if (!debugEnabled) return;
  // eslint-disable-next-line no-console
  fn(...args);
}

export function debugLog(...args) {
  emit(console.log, args);
}
export function debugWarn(...args) {
  emit(console.warn, args);
}
export function debugError(...args) {
  emit(console.error, args);
}
