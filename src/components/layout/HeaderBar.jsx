import { LuMoon, LuSun, LuMenu } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../../utils/auth";
import { useAuth } from "../../hooks/useAuth";
import styles from "./HeaderBar.module.scss";

function LeafLogo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="g2" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#22c55e" />
          <stop offset="1" stopColor="#16a34a" />
        </linearGradient>
      </defs>
      <path
        d="M56 8C36 9 22 16 14 28S6 52 8 56c4 2 20 0 32-8s19-22 16-40z"
        fill="url(#g2)"
      />
      <path
        d="M10 52C30 50 50 30 54 10"
        stroke="#0f5132"
        strokeOpacity=".3"
        strokeWidth="3"
        fill="none"
      />
    </svg>
  );
}

/**
 * Props:
 *  - dark: boolean
 *  - onToggleTheme: () => void
 *  - onHamburger: () => void
 */
export default function HeaderBar({ dark, onToggleTheme, onHamburger }) {
  const nav = useNavigate();
  const { username, role } = useAuth();

  const onLogout = () => {
    clearToken();
    nav("/login", { replace: true });
  };

  return (
    // data-theme berib qo'yamiz: body.da .theme-dark bo'lmasa ham ishlaydi
    <header className={styles.header} data-theme={dark ? "dark" : "light"}>
      <button
        className={styles.iconBtn}
        onClick={onHamburger}
        aria-label="Toggle sidebar"
        title="Menyuni ochish/yopish"
      >
        <LuMenu size={18} />
      </button>

      <div className={styles.brand}>
        <LeafLogo />
        <span>Agro Map</span>
      </div>

      <div className={styles.grow} />

      <button
        className={styles.iconBtn}
        onClick={onToggleTheme}
        aria-label="Toggle theme"
        title={dark ? "Light mode" : "Dark mode"}
      >
        {dark ? <LuSun size={18} /> : <LuMoon size={18} />}
      </button>

      <div className={styles.userbox}>
        <span className={styles.role}>{role || "USER"}</span>
        <span className={styles.username}>{username}</span>
        <button className={styles.logoutBtn} onClick={onLogout} title="Chiqish">
          Logout
        </button>
      </div>
    </header>
  );
}
