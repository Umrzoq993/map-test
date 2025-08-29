// src/components/shell/HeaderBar.jsx
import { LuMoon, LuSun, LuMenu } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import styles from "./HeaderBar.module.scss";
import appLogo from "../../assets/zamin-logo.png";

export default function HeaderBar({ dark, onToggleTheme, onHamburger }) {
  const nav = useNavigate();
  const { username, role } = useAuth();

  // E'TIBOR: bu yerda tokenni O'CHIRMAYMIZ
  const onLogout = () => {
    nav("/login", { replace: true }); // “Hisob boshqaruvi” ekraniga
  };

  return (
    <header className={styles.header} data-theme={dark ? "dark" : "light"}>
      <button className={styles.iconBtn} onClick={onHamburger}>
        <LuMenu size={18} />
      </button>

      <div
        className={styles.brand}
        onClick={() => nav("/dashboard")}
        role="button"
        tabIndex={0}
      >
        <img className={styles.brandLogoSm} src={appLogo} alt="Zamin" />
        <span>Zamin</span>
      </div>

      <div className={styles.grow} />

      <button className={styles.iconBtn} onClick={onToggleTheme}>
        {dark ? <LuSun size={18} /> : <LuMoon size={18} />}
      </button>

      <div className={styles.userbox}>
        <span className={styles.role}>{role || "USER"}</span>
        <span className={styles.username}>{username}</span>
        <button className={styles.logoutBtn} onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
