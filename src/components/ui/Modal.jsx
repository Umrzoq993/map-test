import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Modal.module.scss";

/* --- Global dark holatini ishonchli va cheklangan tarzda aniqlash --- */
function detectGlobalDark() {
  if (typeof document === "undefined") return false;

  const hasTheme = (el, theme) =>
    !!el &&
    (el.classList?.contains(theme) ||
      el.classList?.contains(`theme-${theme}`) ||
      el.getAttribute?.("data-theme") === theme);

  // Faqat root darajasidagi elementlar (app’lar ko‘p bo‘lsa ham qamrab olamiz)
  const roots = [
    document.documentElement,
    document.body,
    document.getElementById("root"),
    document.getElementById("app"),
    document.querySelector(".appshell"),
    document.querySelector(".app-shell"),
    document.querySelector("[data-appshell]"),
  ].filter(Boolean);

  // Explicit light ustun
  if (roots.some((el) => hasTheme(el, "light"))) return false;
  if (roots.some((el) => hasTheme(el, "dark"))) return true;

  // OS pref (fallback)
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
  );
}

/**
 * Props
 * - open: boolean
 * - title?: string | ReactNode
 * - onClose?: () => void
 * - size?: "sm" | "md" | "lg" | "xl" | "full"
 * - width?: number | string
 * - dark?: boolean | "auto"   // "auto" (default) — root temadan oladi
 * - preventCloseOnBackdrop?: boolean
 * - disableEscapeClose?: boolean
 * - initialFocusRef?: React.Ref
 * - className?: string
 * - headerRight?: ReactNode
 * - children: ReactNode
 */
export default function Modal({
  open,
  title,
  onClose,
  size = "md",
  width,
  dark = "auto",
  preventCloseOnBackdrop = false,
  disableEscapeClose = false,
  initialFocusRef,
  className,
  headerRight,
  children,
}) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState("idle"); // 'enter' | 'entered' | 'exit'
  const [theme, setTheme] = useState("light");
  const cardRef = useRef(null);

  // Portal host
  const portalEl = useRef(
    typeof document !== "undefined" ? document.createElement("div") : null
  );

  // mount/unmount portal
  useEffect(() => {
    const el = portalEl.current;
    if (!el || typeof document === "undefined") return;
    const host = document.body;
    el.className = styles.portalHost;
    host.appendChild(el);
    setMounted(true);
    return () => {
      try {
        host.removeChild(el);
      } catch {}
    };
  }, []);

  // Tema: "auto" bo‘lsa faqat root darajasidagi tema flaglarini kuzatamiz
  useEffect(() => {
    const compute = () =>
      setTheme(
        dark === "auto"
          ? detectGlobalDark()
            ? "dark"
            : "light"
          : dark
          ? "dark"
          : "light"
      );

    compute();

    // OS pref o‘zgarsa
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onMq = () => dark === "auto" && compute();
    mq?.addEventListener?.("change", onMq);

    // HTML/BODY/#root/#app/.appshell dagi class/data-theme o‘zgarishini kuzatamiz
    const obs = new MutationObserver(() => {
      if (dark === "auto") compute();
    });

    const targets = [
      document.documentElement,
      document.body,
      document.getElementById("root"),
      document.getElementById("app"),
      document.querySelector(".appshell"),
      document.querySelector(".app-shell"),
      document.querySelector("[data-appshell]"),
    ].filter(Boolean);

    try {
      targets.forEach((t) =>
        obs.observe(t, {
          attributes: true,
          attributeFilter: ["class", "data-theme"],
          subtree: false, // ⚠️ ichkariga tushmaymiz — modalning o‘zi detektsiyani buzmasin
        })
      );
    } catch {}

    return () => {
      try {
        mq?.removeEventListener?.("change", onMq);
      } catch {}
      obs.disconnect();
    };
  }, [dark]);

  // open/close + scroll lock + focus
  useEffect(() => {
    if (!mounted) return;
    const body = document.body;
    if (open) {
      const prev = body.style.overflow;
      body.style.overflow = "hidden";
      setPhase("enter");
      const t = setTimeout(() => setPhase("entered"), 15);

      const focusEl =
        initialFocusRef?.current ??
        cardRef.current?.querySelector(
          "[autofocus], button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
        );
      focusEl?.focus?.();

      return () => {
        clearTimeout(t);
        body.style.overflow = prev;
      };
    } else {
      setPhase("idle");
    }
  }, [open, mounted, initialFocusRef]);

  // Escape + oddiy focus trap
  useEffect(() => {
    if (!open || disableEscapeClose) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
      if (e.key === "Tab" && cardRef.current) {
        const f = cardRef.current.querySelectorAll(
          "a[href], button, textarea, input, select, [tabindex]:not([tabindex='-1'])"
        );
        const focusables = Array.from(f).filter(
          (el) => !el.hasAttribute("disabled")
        );
        if (focusables.length) {
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            last.focus();
            e.preventDefault();
          } else if (!e.shiftKey && document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, disableEscapeClose, onClose]);

  if (!mounted || !open) return null;

  // classes
  const rootClass = [
    styles.modalRoot,
    phase === "enter" && styles.enter,
    phase === "entered" && styles.entered,
    phase === "exit" && styles.exit,
  ]
    .filter(Boolean)
    .join(" ");

  // width presets
  const cardStyle = {};
  if (width)
    cardStyle["--card-w"] = typeof width === "number" ? `${width}px` : width;
  else {
    const map = {
      sm: "420px",
      md: "520px",
      lg: "720px",
      xl: "900px",
      full: "min(96vw,1200px)",
    };
    cardStyle["--card-w"] = map[size] || map.md;
  }

  const content = (
    <div className={rootClass} data-theme={theme}>
      <div
        className={styles.backdrop}
        onClick={() => !preventCloseOnBackdrop && onClose?.()}
      />
      <section
        className={`${styles.card} ${className ?? ""}`}
        style={cardStyle}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || onClose || headerRight) && (
          <header className={styles.header}>
            <div className={styles.title} id="modal-title">
              {title}
            </div>
            <div className={styles.headerRight}>{headerRight}</div>
            {onClose && (
              <button
                className={`${styles.btn} ${styles.icon}`}
                onClick={onClose}
                aria-label="Yopish"
              >
                ×
              </button>
            )}
          </header>
        )}
        {/* body */}
        <div className={styles.body} data-dialog-body>
          {children}
        </div>
      </section>
    </div>
  );

  return createPortal(content, portalEl.current);
}
