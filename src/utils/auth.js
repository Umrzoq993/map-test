// src/utils/auth.js
export const TOKEN_KEY = "token";

const b64urlDecode = (s) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const isAuthenticated = () => {
  const t = getToken();
  if (!t) return false;
  try {
    const [, payload] = t.split(".");
    const data = JSON.parse(b64urlDecode(payload));
    if (data?.exp && Date.now() / 1000 > data.exp) {
      clearToken();
      return false;
    }
    return true;
  } catch {
    clearToken();
    return false;
  }
};

export const decodeJWT = () => {
  const t = getToken();
  if (!t) return null;
  try {
    const [, payload] = t.split(".");
    return JSON.parse(b64urlDecode(payload));
  } catch {
    return null;
  }
};
