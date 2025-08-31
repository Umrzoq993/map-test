// src/api/auth.js
import { httpGet, httpPost } from "./http";
import axios from "axios"; // proactive refresh uchun bevosita chaqiramiz
import {
  setAccessToken as memSetToken,
  getAccessToken as memGetToken,
  setAccessExpireAt as memSetExp,
  getAccessExpireAt as memGetExp,
} from "./tokenStore";

/** LocalStorage keys */
const ACCESS_KEY = "token"; // access token (JWT)
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
  memSetToken(t || null);
}
export function getToken() {
  return memGetToken();
}
// refresh token endi HttpOnly cookie’da, front o‘qimaydi

/** Access token expire timestamp (ms) */
export function setAccessExpireAt(ms) {
  memSetExp(ms ?? null);
}
export function getAccessExpireAt() {
  return memGetExp();
}

/** Access tokenni refresh qilish (proaktiv yoki qo'lda).  */
let _manualRefreshing = null;
export async function refreshAccessToken() {
  if (_manualRefreshing) return _manualRefreshing; // single-flight

  const RAW_BASE = import.meta.env.VITE_API_BASE ?? "/api";
  const BASE = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;
  const deviceId = getDeviceId();

  _manualRefreshing = axios
    .post(
      `${BASE}/auth/refresh`,
      { deviceId },
      { headers: { "X-Device-Id": deviceId }, withCredentials: true }
    )
    .then(({ data }) => {
      const { accessToken, accessExpiresAt, token } = data || {};
      const newAccess = accessToken || token;
      if (!newAccess) throw new Error("Malformed refresh response");
      setAccessToken(newAccess);
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
export async function login(username, password, extra = {}) {
  const deviceId = getDeviceId();
  const RAW_BASE = import.meta.env.VITE_API_BASE ?? "/api";
  const BASE = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;
  const { data } = await axios.post(
    `${BASE}/auth/login`,
    { username, password, deviceId, ...pickCaptcha(extra) },
    { withCredentials: true, headers: { "X-Device-Id": deviceId } }
  );

  const { accessToken, accessExpiresAt, token } = data || {};
  const access = accessToken || token;

  if (access) setAccessToken(access);
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

function pickCaptcha(obj) {
  if (!obj) return {};
  const out = {};
  if (obj.captchaId) out.captchaId = obj.captchaId;
  if (obj.captchaAnswer) out.captchaAnswer = obj.captchaAnswer;
  return out;
}

/** Logout – server revoke + local storage clear */
export async function logout() {
  try {
    const RAW_BASE = import.meta.env.VITE_API_BASE ?? "/api";
    const BASE = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;
    const deviceId = getDeviceId();
    await axios.post(
      `${BASE}/auth/logout`,
      { deviceId },
      { withCredentials: true, headers: { "X-Device-Id": deviceId } }
    );
  } finally {
    setAccessToken(null);
    setAccessExpireAt(null);
  }
}

/** JWT mavjudligini tekshirish (access yaroqli yoki refresh bor) */
export function isAuthenticated() {
  const access = getToken();
  if (access && !isExpired(access)) return true;
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
