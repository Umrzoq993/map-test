// src/hooks/useTheme.js
import { useEffect, useMemo, useState } from "react";

const KEY = "theme"; // "light" | "dark" | "system"

// ---- Helpers ----
function systemPrefersDark() {
  return !!(
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}
function readStoredTheme() {
  try {
    const t = localStorage.getItem(KEY);
    if (t === "light" || t === "dark" || t === "system") return t;
  } catch {}
  // DEFAULT: dark
  return "dark";
}
function computeIsDark(theme) {
  return theme === "dark" || (theme === "system" && systemPrefersDark());
}
function applyTheme(theme) {
  const isDark = computeIsDark(theme);
  const root = document.documentElement;
  root.setAttribute("data-theme", isDark ? "dark" : "light");
  root.classList.toggle("dark", isDark);
}

// ---- Global state (pub/sub) ----
const listeners = new Set();
let currentTheme = readStoredTheme();

// Ilk qo‘llash
if (typeof document !== "undefined") {
  applyTheme(currentTheme);
}

function setThemeInternal(next) {
  if (next !== "light" && next !== "dark" && next !== "system") return;
  currentTheme = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {}
  applyTheme(next);
  // barcha obunachilarni yangilash
  listeners.forEach((fn) => {
    try {
      fn(currentTheme);
    } catch {}
  });
}

// ---- Hook API ----
export function useTheme() {
  const [theme, setThemeState] = useState(currentTheme);

  // Global o‘zgarishlarga obuna bo‘lish
  useEffect(() => {
    const handler = (t) => setThemeState(t);
    listeners.add(handler);
    return () => listeners.delete(handler);
  }, []);

  // System rejimi o‘zgarsa — darhol qo‘llash va bildirish
  useEffect(() => {
    if (theme !== "system" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyTheme("system");
      listeners.forEach((fn) => {
        try {
          fn("system");
        } catch {}
      });
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [theme]);

  // Ko‘p tab sinxron
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY) {
        const next = readStoredTheme();
        setThemeInternal(next);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const isDark = useMemo(() => computeIsDark(theme), [theme]);

  // Public actions
  const toggle = () => setThemeInternal(isDark ? "light" : "dark");
  const setSystem = () => setThemeInternal("system");
  const setTheme = (t) => setThemeInternal(t);

  return { theme, setTheme, isDark, toggle, setSystem };
}
