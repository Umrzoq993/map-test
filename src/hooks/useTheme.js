import { useEffect, useState } from "react";
const KEY = "theme"; // 'light' | 'dark' | 'system'

export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(KEY) || "system"
  );

  useEffect(() => {
    const root = document.documentElement;
    const apply = (mode) => root.setAttribute("data-theme", mode);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      apply(mq.matches ? "dark" : "light");
      const onChange = (e) => apply(e.matches ? "dark" : "light");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    } else {
      apply(theme);
    }
    localStorage.setItem(KEY, theme);
  }, [theme]);

  return { theme, setTheme };
}
