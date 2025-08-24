// src/api/auth.js
import { httpPost } from "./http";

const ACCESS_KEY = "token"; // access token (JWT)
const REFRESH_KEY = "refreshToken"; // refresh token (rotation bilan)

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

      // UUID-ga yaqin format: 8-4-4-4-12 (hex uzunliklari)
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

// --- Token helpers (http.js ham ishlatadi) ---
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
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}
export function getRefreshToken() {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

// --- Auth APIs ---
/** Login – POST /auth/login  (returns: { tokenType, accessToken, refreshToken, ... } ) */
export async function login(username, password) {
  const deviceId = getDeviceId();
  const data = await httpPost("/auth/login", { username, password, deviceId });

  // Yangi backend
  const { accessToken, refreshToken } = data || {};
  // Orqa moslik (eski backend { token } qaytargan bo‘lsa)
  const access = accessToken || data?.token;

  if (access) setAccessToken(access);
  if (refreshToken) setRefreshToken(refreshToken);

  return !!access;
}

/** Logout – refresh tokenni serverda revoke qiladi, storage tozalanadi */
export async function logout() {
  try {
    const rt = getRefreshToken();
    if (rt) await httpPost("/auth/logout", { refreshToken: rt });
  } catch {}
  setAccessToken(null);
  setRefreshToken(null);
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
  const { httpGet } = await import("./http");
  return httpGet("/auth/me");
}

/** Heartbeat – real-time online */
export async function heartbeat() {
  const { httpPost } = await import("./http");
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
