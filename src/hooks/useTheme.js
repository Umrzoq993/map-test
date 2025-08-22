import { useEffect, useMemo, useState } from "react";

const KEY = "theme"; // 'light' | 'dark' | 'system'

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
  } catch {}
  // 🔥 DEFAULT: dark
  return "dark";
}

export function useTheme() {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const resolveMode = (t) =>
      t === "system" ? (mq.matches ? "dark" : "light") : t;

    const apply = (t) => {
      const mode = resolveMode(t);
      root.setAttribute("data-theme", mode);
      // Ba’zi kutubxonalar .dark class’ni ko‘radi:
      if (mode === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
    };

    apply(theme);

    // System o‘zgarsa — jonli yangilash
    let onChange;
    if (theme === "system") {
      onChange = () => apply("system");
      mq.addEventListener("change", onChange);
    }

    try {
      localStorage.setItem(KEY, theme);
    } catch {}

    return () => {
      if (onChange) mq.removeEventListener("change", onChange);
    };
  }, [theme]);

  // Qulaylik uchun:
  const isDark = useMemo(() => {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    return (
      window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false
    );
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  const setSystem = () => setTheme("system");

  return { theme, setTheme, isDark, toggle, setSystem };
}
