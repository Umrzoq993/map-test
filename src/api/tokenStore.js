// Token store with optional sessionStorage persistence.
// Opt-in via VITE_PERSIST_ACCESS=1
// Dispatches a window event 'auth:token-changed' on updates.

const PERSIST =
  String(import.meta.env.VITE_PERSIST_ACCESS || "").trim() === "1";
const KEY_T = "token";
const KEY_E = "tokenExpAt";

function readPersisted() {
  try {
    if (!PERSIST || typeof window === "undefined") return { t: null, e: null };
    const t = sessionStorage.getItem(KEY_T);
    const eStr = sessionStorage.getItem(KEY_E);
    const e = eStr ? Number(eStr) : null;
    return { t: t || null, e: Number.isFinite(e) ? e : null };
  } catch {
    return { t: null, e: null };
  }
}

let { t: accessToken, e: accessExpireAt } = readPersisted(); // ms epoch

function emitChange() {
  if (typeof window !== "undefined" && window.dispatchEvent) {
    const ev = new CustomEvent("auth:token-changed", {
      detail: { token: accessToken, expAt: accessExpireAt },
    });
    window.dispatchEvent(ev);
  }
}

export function setAccessToken(token) {
  accessToken = token || null;
  if (PERSIST) {
    try {
      if (accessToken) sessionStorage.setItem(KEY_T, accessToken);
      else sessionStorage.removeItem(KEY_T);
    } catch {}
  }
  emitChange();
}
export function getAccessToken() {
  return accessToken;
}
export function clearAccessToken() {
  accessToken = null;
  if (PERSIST) {
    try {
      sessionStorage.removeItem(KEY_T);
    } catch {}
  }
  emitChange();
}

export function setAccessExpireAt(ms) {
  accessExpireAt = typeof ms === "number" && Number.isFinite(ms) ? ms : null;
  if (PERSIST) {
    try {
      if (accessExpireAt != null)
        sessionStorage.setItem(KEY_E, String(accessExpireAt));
      else sessionStorage.removeItem(KEY_E);
    } catch {}
  }
  emitChange();
}
export function getAccessExpireAt() {
  return accessExpireAt;
}
export function clearAccessExpireAt() {
  accessExpireAt = null;
  if (PERSIST) {
    try {
      sessionStorage.removeItem(KEY_E);
    } catch {}
  }
  emitChange();
}
