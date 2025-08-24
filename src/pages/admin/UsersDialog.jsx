import { useEffect, useRef } from "react";
import styles from "./UsersDialog.module.scss";
import { LuX } from "react-icons/lu";

/**
 * Faqat UsersPage uchun mo‘ljallangan dialog (modal).
 * Dropdown’lar portal bilan ishlashi uchun body’ga data-dialog-body atributi qo‘yildi.
 */
export default function UsersDialog({
  open,
  title,
  children,
  onClose,
  footer = null,
  size = "md", // sm | md | lg
  closeOnBackdrop = true,
}) {
  const ref = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (!open) return;
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function onBackdrop(e) {
    if (closeOnBackdrop && e.target === ref.current) onClose?.();
  }

  return (
    <div className={styles.overlay} ref={ref} onMouseDown={onBackdrop}>
      <div
        className={`${styles.dialog} ${styles[size]}`}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          <div className={styles.title}>{title}</div>
          <button
            className={styles.iconBtn}
            onClick={onClose}
            aria-label="Yopish"
          >
            <LuX />
          </button>
        </div>
        {/* ❗ Dropdown pozitsiyalashi uchun belgi */}
        <div className={styles.body} data-dialog-body="">
          {children}
        </div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}
