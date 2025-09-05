// Lightweight debug logger. In production (NODE_ENV==='production') it no-ops.
// Usage: import { debugLog, debugWarn, debugError } from './utils/debug';
// Prefer replacing scattered console.* calls with these to satisfy lint rules while keeping dev insight.

const enabled = import.meta.env.DEV;

export function debugLog(...args) {
  if (enabled) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}
export function debugWarn(...args) {
  if (enabled) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
}
export function debugError(...args) {
  if (enabled) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
}
