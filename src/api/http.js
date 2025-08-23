// src/api/http.js
import axios from "axios";
import { getToken, logout } from "./auth";

// Dev: "/api" (Vite proxy orqali)
// Prod: VITE_API_BASE (masalan, https://api.example.com/api)
const BASE = import.meta.env.VITE_API_BASE ?? "/api";

export const api = axios.create({ baseURL: `${BASE}/api` });

// Har bir so'rovga JWT qo'shish + sort[] ni takroriy ?sort= ga aylantirish
api.interceptors.request.use((config) => {
  const t = typeof getToken === "function" ? getToken() : null;
  if (t) config.headers.Authorization = `Bearer ${t}`;

  if (config.params?.sort && Array.isArray(config.params.sort)) {
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

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.code === "ERR_NETWORK") {
      console.warn("[API] Network error. Backend ishlayaptimi? baseURL=", BASE);
    }
    if (err?.response?.status === 401) {
      try {
        logout?.();
      } catch {}
      // ixtiyoriy: sahifaga qayta yo'naltirish
      // window.location.assign("/login");
    }
    return Promise.reject(err);
  }
);

// Qulay helperlar (ixtiyoriy)
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
