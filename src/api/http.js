// src/api/http.js
import axios from "axios";
import {
  getToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  setAccessExpireAt,
} from "./auth";

// BASE aniqlash ("/api" yoki VITE_API_BASE)
const RAW_BASE = import.meta.env.VITE_API_BASE ?? "/api";
const BASE = RAW_BASE.endsWith("/api") ? RAW_BASE : `${RAW_BASE}/api`;

// Barqaror deviceId (duplicated small helper to avoid circular imports)
function getDeviceId() {
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

// Single axios instance
export const api = axios.create({ baseURL: BASE });

// Request interceptor: X-Device-Id + Bearer + sort[]= flatten
api.interceptors.request.use((config) => {
  config.headers = config.headers || {};

  // device header
  if (!config.headers["X-Device-Id"]) {
    config.headers["X-Device-Id"] = getDeviceId();
  }

  // Bearer — LOGIN/REFRESH/LOGOUT dan tashqari
  const url = config.url || "";
  const addBearer =
    url !== "/auth/login" && url !== "/auth/refresh" && url !== "/auth/logout";
  const t = typeof getToken === "function" ? getToken() : null;
  if (t && addBearer) {
    config.headers.Authorization = `Bearer ${t}`;
  }

  // sort[]= -> ?sort=a&sort=b
  if (config?.params?.sort && Array.isArray(config.params.sort)) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(config.params)) {
      if (k === "sort") {
        v.filter(Boolean).forEach((s) => p.append("sort", String(s).trim()));
      } else if (v !== undefined && v !== null && String(v).length) {
        p.append(k, String(v));
      }
    }
    config.params = p;
  }
  return config;
});

// ---- 401 -> auto refresh (single-flight) ----
let isRefreshing = false;
let refreshPromise = null;

async function doRefresh() {
  const rt = getRefreshToken();
  if (!rt) throw new Error("No refresh token");
  const deviceId = getDeviceId();

  // Interceptor loop'idan qochish uchun to'g'ridan-to'g'ri axios
  const { data } = await axios.post(
    `${BASE}/auth/refresh`,
    { refreshToken: rt, deviceId },
    { headers: { "X-Device-Id": deviceId } }
  );

  const {
    accessToken: newAccess,
    refreshToken: newRefresh,
    accessExpiresAt,
  } = data || {};
  if (!newAccess || !newRefresh) throw new Error("Malformed refresh response");

  setAccessToken(newAccess);
  setRefreshToken(newRefresh);
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
  if (!isRefreshing) {
    isRefreshing = true;
    refreshPromise = doRefresh().finally(() => {
      isRefreshing = false;
    });
  }
  return refreshPromise;
}

// Response: 429 bubble, 401 auto-refresh (login/refresh/logout uchun emas)
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const { response, config } = err || {};
    const status = response?.status;
    const original = config || {};
    const url = original.url || "";
    const refreshExcluded =
      url === "/auth/login" ||
      url === "/auth/refresh" ||
      url === "/auth/logout";

    if (err?.code === "ERR_NETWORK") {
      console.warn("[API] Network error. BACKEND running? baseURL=", BASE);
    }

    if (status === 429) {
      return Promise.reject(err);
    }

    if (status === 401 && !refreshExcluded) {
      try {
        const newAccess = await queueRefresh();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch {
        try {
          // Logout helper imported where needed; here we only clear tokens
          setAccessToken(null);
          setRefreshToken(null);
          setAccessExpireAt(null);
        } catch {}
      }
    }
    return Promise.reject(err);
  }
);

// Qulay helpers
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
export async function httpDelete(url) {
  const res = await api.delete(url);
  return res.data;
}
