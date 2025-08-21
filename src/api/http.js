// src/api/http.js
import axios from "axios";
import { getToken, clearToken } from "../utils/auth";

// Vite dev serverida proxy ishlatayotgan bo'lsangiz baseURL bo'sh qolsin.
// Aks holda backend rootini bering, masalan: "http://localhost:8080"
export const api = axios.create({ baseURL: "http://localhost:8080" });

// Request interceptor
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Tomcat bilan mos: sort[]=... emas, bir nechta sort=
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

// Response interceptor
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      clearToken();
      window.location.assign("/login");
    }
    return Promise.reject(err);
  }
);

// Http helper funksiyalar
export async function httpGet(url, config) {
  return (await api.get(url, config)).data;
}

export async function httpPost(url, data, config) {
  return (await api.post(url, data, config)).data;
}

export async function httpPatch(url, data, config) {
  return (await api.patch(url, data, config)).data;
}

export async function httpDelete(url, config) {
  return (await api.delete(url, config)).data;
}
