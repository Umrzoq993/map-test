// src/api/auth.js
import { httpGet, httpPost } from "./http";
import axios from "axios"; // proactive refresh uchun bevosita chaqiramiz

/** LocalStorage keys */
const ACCESS_KEY = "token"; // access token (JWT)
const REFRESH_KEY = "refreshToken"; // refresh token (rotation)
const ACCESS_EXP_KEY = "tokenExpAt"; // access expire time (ms since epoch)

// --- Device ID (barqaror) ---
export function getDeviceId() {
  try {
    let id = localStorage.getItem("deviceId");
    if (!id) {
      const rndBytes = (len = 16) =>
        window.crypto?.getRandomValues
          ? Array.from(window.crypto.getRandomValues(new Uint8Array(len)))
          : Array.from({ length: len }, () => Math.floor(Math.random() * 256));
      const toHex = (arr) =>
        arr.map((b) => (b & 0xff).toString(16).padStart(2, "0")).join("");
      const p1 = toHex(rndBytes(8)).slice(0, 8);
      const p2 = toHex(rndBytes(4)).slice(0, 4);
      const p3 = toHex(rndBytes(4)).slice(0, 4);
      const p4 = toHex(rndBytes(4)).slice(0, 4);
      const p5 = toHex(rndBytes(12)).slice(0, 12);
      id = `${p1}-${p2}-${p3}-${p4}-${p5}`;
      localStorage.setItem("deviceId", id);
    }
    return id;
  } catch {
    return "unknown-device";
  }
}

// --- Token helpers ---
export function setAccessToken(t) {
  try {
    if (t) localStorage.setItem(ACCESS_KEY, t);
    else localStorage.removeItem(ACCESS_KEY);
  } catch {}
}
export function setRefreshToken(t) {
  try {
    if (t) localStorage.setItem(REFRESH_KEY, t);
    else localStorage.removeItem(REFRESH_KEY);
  } catch {}
}
export function getToken() {
  try {
    return localStorage.getItem(ACCESS_KEY) || null;
  } catch {
    return null;
  }
}
export function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_KEY) || null;
  } catch {
    return null;
  }
}

/** Access token expire timestamp (ms) */
export function setAccessExpireAt(ms) {
  try {
    if (ms) localStorage.setItem(ACCESS_EXP_KEY, String(ms));
    else localStorage.removeItem(ACCESS_EXP_KEY);
  } catch {}
}
export function getAccessExpireAt() {
  try {
    const v = localStorage.getItem(ACCESS_EXP_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

/** Access tokenni refresh qilish (proaktiv yoki qo'lda).  */
let _manualRefreshing = null;
export async function refreshAccessToken() {
  if (_manualRefreshing) return _manualRefreshing; // single-flight
  const rt = getRefreshToken();
  if (!rt) throw new Error("No refresh token");

  const RAW_BASE = import.meta.env.VITE_API_BASE ?? "/api";
  const BASE = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;
  const deviceId = getDeviceId();

  _manualRefreshing = axios
    .post(
      `${BASE}/auth/refresh`,
      { refreshToken: rt, deviceId },
      { headers: { "X-Device-Id": deviceId } }
    )
    .then(({ data }) => {
      const { accessToken, refreshToken, accessExpiresAt, token } = data || {};
      const newAccess = accessToken || token;
      if (!newAccess) throw new Error("Malformed refresh response");
      setAccessToken(newAccess);
      if (refreshToken) setRefreshToken(refreshToken);
      if (accessExpiresAt) {
        const ms =
          typeof accessExpiresAt === "string"
            ? Date.parse(accessExpiresAt)
            : accessExpiresAt;
        if (ms) setAccessExpireAt(ms);
      } else {
        const payload = decodeJWT();
        if (payload?.exp) setAccessExpireAt(payload.exp * 1000);
      }
      return newAccess;
    })
    .finally(() => {
      _manualRefreshing = null;
    });
  return _manualRefreshing;
}

/** Login – backend TokenPair (accessToken, refreshToken, accessExpiresAt) */
export async function login(username, password) {
  const deviceId = getDeviceId();
  const data = await httpPost("/auth/login", { username, password, deviceId });

  const { accessToken, refreshToken, accessExpiresAt, token } = data || {};
  const access = accessToken || token;

  if (access) setAccessToken(access);
  if (refreshToken) setRefreshToken(refreshToken);
  if (accessExpiresAt) {
    const ms =
      typeof accessExpiresAt === "string"
        ? Date.parse(accessExpiresAt)
        : accessExpiresAt;
    if (ms) setAccessExpireAt(ms);
  } else {
    // fallback: from JWT exp
    const payload = decodeJWT();
    if (payload?.exp) setAccessExpireAt(payload.exp * 1000);
  }
  return !!access;
}

/** Logout – server revoke + local storage clear */
export async function logout() {
  try {
    const rt = getRefreshToken();
    if (rt) {
      await httpPost("/auth/logout", { refreshToken: rt });
    }
  } finally {
    setAccessToken(null);
    setRefreshToken(null);
    setAccessExpireAt(null);
  }
}

/** JWT mavjudligini tekshirish (access yaroqli yoki refresh bor) */
export function isAuthenticated() {
  const access = getToken();
  const refresh = getRefreshToken();
  if (access && !isExpired(access)) return true;
  if (refresh) return true;
  return false;
}

/** /auth/me – foydalanuvchini olish (Bearer’ni http.js qo‘shadi) */
export async function me() {
  return httpGet("/auth/me");
}

/** Heartbeat – real-time online */
export async function heartbeat() {
  return httpPost("/auth/heartbeat", { deviceId: getDeviceId() });
}

// --- Utility ---
export function decodeJWT() {
  const t = getToken();
  if (!t) return null;
  try {
    const [, payload] = t.split(".");
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function isExpired(jwt) {
  try {
    const [, payload] = jwt.split(".");
    const data = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (!data.exp) return false;
    return Date.now() / 1000 > data.exp;
  } catch {
    return true;
  }
}
