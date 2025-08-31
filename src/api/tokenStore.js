// In-memory token store (no localStorage)
// Dispatches a window event 'auth:token-changed' on updates.

let accessToken = null;
let accessExpireAt = null; // ms epoch

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
  emitChange();
}
export function getAccessToken() {
  return accessToken;
}
export function clearAccessToken() {
  accessToken = null;
  emitChange();
}

export function setAccessExpireAt(ms) {
  accessExpireAt = typeof ms === "number" && Number.isFinite(ms) ? ms : null;
  emitChange();
}
export function getAccessExpireAt() {
  return accessExpireAt;
}
export function clearAccessExpireAt() {
  accessExpireAt = null;
  emitChange();
}
