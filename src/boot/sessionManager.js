// Session manager: proactive token refresh & idle auto-logout
// Config via env:
//   VITE_IDLE_MINUTES=10 (default 5)
//   VITE_TOKEN_REFRESH_LEEWAY_SEC=90 (buffer before exp to refresh, default 90s)

import {
  getAccessExpireAt,
  isAuthenticated,
  logout,
  refreshAccessToken,
  decodeJWT,
} from "../api/auth";

let started = false;
let refreshTimer = null; // setTimeout id
let idleTimer = null; // setTimeout id
let lastActivity = Date.now();
let refreshRetryTimer = null;

function getIdleMinutesCfg() {
  const v = import.meta.env.VITE_IDLE_MINUTES;
  const n = Number(v);
  if (!v) return 5; // default
  return Number.isFinite(n) && n > 0 ? n : 5;
}
function getRefreshLeewaySec() {
  const v = import.meta.env.VITE_TOKEN_REFRESH_LEEWAY_SEC;
  const n = Number(v);
  if (!v) return 90; // 1.5 min default
  return Number.isFinite(n) && n > 0 ? n : 90;
}

function scheduleProactiveRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  if (!isAuthenticated()) return;
  const expAt = getAccessExpireAt();
  if (!expAt) return; // unknown exp
  const leewayMs = getRefreshLeewaySec() * 1000;
  const now = Date.now();
  let delay = expAt - leewayMs - now;
  if (delay < 5000) delay = 5000; // kamida 5s
  refreshTimer = setTimeout(async () => {
    // Hali ham yaqinlashgan bo'lsa va refresh token mavjud bo'lsa
    try {
      const beforeExp = getAccessExpireAt() - Date.now();
      if (beforeExp < leewayMs + 30000) {
        await refreshAccessToken();
      }
    } catch (e) {
      // Bir martalik kechiktirilgan retry (2s) – tarmoq flakeni yumshatish
      if (!refreshRetryTimer) {
        refreshRetryTimer = setTimeout(async () => {
          refreshRetryTimer = null;
          try {
            await refreshAccessToken();
          } catch (_) {}
        }, 2000);
      }
    } finally {
      scheduleProactiveRefresh(); // keyingi sikl
    }
  }, delay);
}

function resetIdleTimer() {
  lastActivity = Date.now();
  const idleMs = getIdleMinutesCfg() * 60 * 1000;
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    // Agar shu orada activity bo'lsa qaytaramiz
    const diff = Date.now() - lastActivity;
    if (diff < idleMs - 1000) {
      resetIdleTimer();
      return;
    }
    if (isAuthenticated()) {
      await logout().catch(() => {});
      // Hard redirect to login to reset state
      window.location.replace("/login");
    }
  }, idleMs);
}

function onUserActivity() {
  resetIdleTimer();
}

function attachActivityListeners() {
  const events = [
    "mousemove",
    "mousedown",
    "keydown",
    "scroll",
    "touchstart",
    "visibilitychange",
  ];
  events.forEach((ev) =>
    window.addEventListener(ev, onUserActivity, { passive: true })
  );
  return () =>
    events.forEach((ev) => window.removeEventListener(ev, onUserActivity));
}

export function startSessionManager() {
  if (started) return () => {};
  started = true;
  // initial schedule
  scheduleProactiveRefresh();
  resetIdleTimer();
  const detach = attachActivityListeners();

  // Storage o'zgarishi (token rotate) bo'lsa — qayta schedule
  const onStorage = (e) => {
    if (
      e.key === "token" ||
      e.key === "tokenExpAt" ||
      e.key === "refreshToken"
    ) {
      scheduleProactiveRefresh();
      resetIdleTimer();
    }
  };
  window.addEventListener("storage", onStorage);

  // Sahifa fokus / uyg'onish
  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      scheduleProactiveRefresh();
    }
  };
  window.addEventListener("visibilitychange", onVisibility);
  const onTokenChanged = () => {
    scheduleProactiveRefresh();
    resetIdleTimer();
  };
  window.addEventListener("auth:token-changed", onTokenChanged);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("auth:token-changed", onTokenChanged);
    detach();
    if (refreshTimer) clearTimeout(refreshTimer);
    if (idleTimer) clearTimeout(idleTimer);
    if (refreshRetryTimer) clearTimeout(refreshRetryTimer);
    started = false;
  };
}

// Debug helper (browser console): window.__authPayload()
if (typeof window !== "undefined") {
  window.__authPayload = () => decodeJWT();
  window.__authCountdown = () => {
    const exp = getAccessExpireAt();
    if (!exp) return null;
    const ms = exp - Date.now();
    if (ms <= 0) return { expired: true, ms: 0, text: "expired" };
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return { expired: false, ms, text: `${m}:${String(rem).padStart(2, "0")}` };
  };
}
