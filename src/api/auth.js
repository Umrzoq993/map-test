// src/api/auth.js
import { httpPost } from "./http";

export async function login(username, password) {
  const { token } = await httpPost("/api/auth/login", { username, password });
  if (token) {
    localStorage.setItem("token", token);
  }
  return token;
}

export function logout() {
  localStorage.removeItem("token");
}

export function getToken() {
  return localStorage.getItem("token");
}

export function isAuthenticated() {
  const t = getToken();
  if (!t) return false;
  try {
    const [, payload] = t.split(".");
    const data = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (data.exp && Date.now() / 1000 > data.exp) {
      logout();
      return false;
    }
    return true;
  } catch {
    logout();
    return false;
  }
}
