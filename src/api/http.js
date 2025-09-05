// src/api/http.js
import axios from "axios";
import { debugWarn } from "../utils/debug";
import {
  getAccessToken as memGetToken,
  setAccessToken as memSetToken,
  setAccessExpireAt as memSetExp,
  clearAccessToken as memClearToken,
  clearAccessExpireAt as memClearExp,
} from "./tokenStore";
import { toast } from "react-toastify";

/* =========================
   LOCAL KEYS (auth.js bilan mos)
   ========================= */
const ACCESS_KEY = "token";
/* Token helpers (in-memory) */
function getAccessToken() {
  return memGetToken();
}
function setAccessToken(t) {
  memSetToken(t);
}
function setAccessExpireAt(ms) {
  memSetExp(ms);
}

/* =========================
   BASE URL
   ========================= */
const RAW_BASE = import.meta.env.VITE_API_BASE ?? "/api";
const BASE = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;

/* =========================
   Device ID (barqaror)
   ========================= */
function getDeviceId() {
  try {
    let id = localStorage.getItem("deviceId");
    if (!id) {
      const rnd = (n) =>
        (window.crypto?.getRandomValues
          ? Array.from(window.crypto.getRandomValues(new Uint8Array(n)))
          : Array.from({ length: n }, () => Math.floor(Math.random() * 256))
        )
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      id = `${rnd(4)}-${rnd(2)}-${rnd(2)}-${rnd(2)}-${rnd(6)}`; // 8-4-4-4-12
      localStorage.setItem("deviceId", id);
    }
    return id;
  } catch {
    return "unknown-device";
  }
}

/* =========================
   Axios instance
   ========================= */
export const api = axios.create({
  baseURL: BASE,
  timeout: 30000,
});

/* =========================
   Request ID generator (per request) 
   ========================= */
function genReqId() {
  // 12 random hex chars
  const arr = (
    window.crypto?.getRandomValues
      ? Array.from(window.crypto.getRandomValues(new Uint8Array(6)))
      : Array.from({ length: 6 }, () => Math.floor(Math.random() * 256))
  ).map((b) => b.toString(16).padStart(2, "0"));
  return arr.join("");
}

/* Yordamchi: URL pathni chiqarib olish */
function getPathname(urlLike) {
  try {
    // absolute yoki nisbiy bo'lishi mumkin
    return new URL(urlLike, BASE).pathname.replace(/\/+$/, "");
  } catch {
    return String(urlLike || "");
  }
}

/* Auth endpointmi? (Bearer qo‘ymaymiz va refresh ham qilmaymiz) */
function isAuthEndpoint(urlLike) {
  const p = getPathname(urlLike);
  return p === "/auth/login" || p === "/auth/refresh" || p === "/auth/logout";
}

/* =========================
   REQUEST INTERCEPTOR
   ========================= */
api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  // Cookie yuborish: faqat auth endpointlarida kerak
  if (isAuthEndpoint(config.url)) {
    config.withCredentials = true;
  }

  // Device header
  if (!config.headers["X-Device-Id"]) {
    config.headers["X-Device-Id"] = getDeviceId();
  }

  // Request ID (observability)
  if (!config.headers["X-Request-Id"]) {
    config.headers["X-Request-Id"] = genReqId();
  }

  // Bearer faqat auth bo'lmagan endpointlar uchun
  if (!isAuthEndpoint(config.url)) {
    const t = getAccessToken();
    if (t) config.headers.Authorization = `Bearer ${t}`;
    else delete config.headers.Authorization;
  }

  // ?sort[]=a&sort[]=b -> ?sort=a&sort=b (backend qulayligi uchun)
  if (config?.params?.sort && Array.isArray(config.params.sort)) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(config.params)) {
      if (k === "sort") {
        v.filter(Boolean).forEach((s) =>
          params.append("sort", String(s).trim())
        );
      } else if (v !== undefined && v !== null && String(v).length) {
        params.append(k, String(v));
      }
    }
    config.params = params;
  }

  return config;
});

/* =========================
   401 -> REFRESH (single-flight)
   ========================= */
let refreshing = null;

async function refreshTokens() {
  // Interceptor loopdan qochish uchun to'g'ridan-to'g'ri axios
  const deviceId = getDeviceId();
  const { data } = await axios.post(
    `${BASE}/auth/refresh`,
    { deviceId },
    {
      headers: { "X-Device-Id": deviceId },
      withCredentials: true,
    }
  );

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
  }
  return newAccess;
}

function queueRefresh() {
  if (!refreshing) {
    refreshing = refreshTokens().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

/* =========================
   RESPONSE INTERCEPTOR
   ========================= */
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const { response, config } = err || {};
    const status = response?.status;
    const original = config || {};

    // Tarmoq xatosi — foydali log
    if (err?.code === "ERR_NETWORK" && import.meta.env.DEV) {
      debugWarn("[API] Network error. Backend ishlyaptimi? baseURL=", BASE);
    }

    // 429 — to'g'ridan-to'g'ri qaytarib yuboramiz
    if (status === 429) {
      return Promise.reject(err);
    }

    // 401 — auth endpointlaridan tashqari holatlarda refresh
    if (
      status === 401 &&
      !isAuthEndpoint(original.url) &&
      !original.__isRetry
    ) {
      try {
        const newAccess = await queueRefresh();
        original.__isRetry = true;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original); // qayta so'rov
      } catch {
        // Refresh ham ishlamadi — local tokenlarni tozalaymiz
        memClearToken();
        memClearExp();
        const code = response?.data?.code;
        if (code === "REFRESH_REPLAY")
          toast.error("Sessiya takrorlandi (replay). Qayta kiring.");
        else if (code === "SESSION_REVOKED")
          toast.error("Sessiya bekor qilingan. Qayta kiring.");
        else if (code === "REFRESH_EXPIRED")
          toast.info("Seans muddati tugadi. Qaytadan kiring.");
        else if (code === "REFRESH_INVALID")
          toast.info("Seans yaroqsiz. Qaytadan kiring.");
        return Promise.reject(err);
      }
    }

    // MUHIM: 403 bo'lsa tokenlarni TOZALAMAYMIZ — haqiqiy ruxsat masalasi bo'lishi mumkin
    return Promise.reject(err);
  }
);

/* =========================
   QULAY WRAPPERLAR
   ========================= */
export async function httpGet(url, params) {
  const res = await api.get(url, { params });
  return res.data;
}
export async function httpPost(url, body) {
  const res = await api.post(url, body);
  return res.data;
}
export async function httpPatch(url, body) {
  const res = await api.patch(url, body);
  return res.data;
}
export async function httpPut(url, body) {
  const res = await api.put(url, body);
  return res.data;
}
export async function httpDelete(url) {
  const res = await api.delete(url);
  return res.data;
}
