// src/components/ui/Modal.jsx
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Modal.module.scss";

/**
 * Props
 * - open: boolean
 * - title?: string | ReactNode
 * - onClose?: () => void
 * - size?: "sm" | "md" | "lg" | "xl" | "full"
 * - width?: number | string
 * - dark?: boolean
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
  dark,
  preventCloseOnBackdrop = false,
  disableEscapeClose = false,
  initialFocusRef,
  className,
  headerRight,
  children,
}) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState("idle"); // 'enter' | 'entered' | 'exit'
  const cardRef = useRef(null);

  // Portal root
  const portalEl = useRef(
    typeof document !== "undefined" ? document.createElement("div") : null
  );

  // mount/unmount portal
  useEffect(() => {
    if (!portalEl.current || typeof document === "undefined") return;
    const host = document.body;
    portalEl.current.className = styles.portalHost;
    host.appendChild(portalEl.current);
    setMounted(true);
    return () => {
      try {
        host.removeChild(portalEl.current);
      } catch {}
    };
  }, []);

  // open/close phases + scroll lock
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
      if (focusEl && focusEl.focus) focusEl.focus();

      return () => {
        clearTimeout(t);
        body.style.overflow = prev;
      };
    } else {
      setPhase("idle");
    }
  }, [open, mounted, initialFocusRef]);

  // Escape key + primitiv focus trap
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

  const rootClass = [
    styles.modalRoot,
    phase === "enter" && styles.enter,
    phase === "entered" && styles.entered,
    phase === "exit" && styles.exit,
  ]
    .filter(Boolean)
    .join(" ");

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

  const dataTheme = dark === undefined ? undefined : dark ? "dark" : "light";

  const content = (
    <div className={rootClass} data-theme={dataTheme}>
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
                className={styles.close}
                onClick={onClose}
                aria-label="Yopish"
              >
                ×
              </button>
            )}
          </header>
        )}
        {/* OrgUnitSelect menyusi scroll-ni kuzatishi uchun atribut */}
        <div className={styles.body} data-dialog-body>
          {children}
        </div>
      </section>
    </div>
  );

  return createPortal(content, portalEl.current);
}
