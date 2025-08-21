// src/api/http.js
import axios from "axios";
import { getToken, logout } from "./auth";

const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

// Bitta axios instance
export const api = axios.create({ baseURL: BASE });

// Har bir so'rovga JWT qo'shib yuboramiz
api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;

  // (ixtiyoriy) ?sort[]=... o‘rniga bir nechta ?sort=... ga aylantirish:
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

// 401 bo‘lsa tokenni tozalab, login sahifasiga
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      logout();
      window.location.assign("/login");
    }
    return Promise.reject(err);
  }
);

// Kichik helperlar (login va boshqalar qulay ishlatishi uchun)
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
