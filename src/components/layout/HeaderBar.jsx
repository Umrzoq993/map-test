import { LuMoon, LuSun, LuMenu } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { clearToken } from "../../utils/auth";
import { useAuth } from "../../hooks/useAuth";
import styles from "./HeaderBar.module.scss";

// App logosi
import appLogo from "../../assets/zamin-logo.png";

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
    <header className={styles.header} data-theme={dark ? "dark" : "light"}>
      <button
        className={styles.iconBtn}
        onClick={onHamburger}
        aria-label="Toggle sidebar"
        title="Menyuni ochish/yopish"
      >
        <LuMenu size={18} />
      </button>

      <div
        className={styles.brand}
        onClick={() => nav("/dashboard")}
        title="Zamin"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && nav("/dashboard")}
      >
        <img className={styles.brandLogoSm} src={appLogo} alt="Zamin logo" />
        <span>Zamin</span>
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
