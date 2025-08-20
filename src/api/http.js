import axios from "axios";
import { getToken, clearToken } from "../utils/auth";

// Vite dev serverida proxy ishlatayotgan bo'lsangiz baseURL bo'sh qolsin.
// Aks holda backend rootini bering, masalan: "http://localhost:8080"
export const api = axios.create({ baseURL: "http://localhost:8080" });

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

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      clearToken();
      // Login sahifasiga qaytaramiz
      window.location.assign("/login");
    }
    return Promise.reject(err);
  }
);
