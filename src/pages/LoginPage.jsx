import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { isAuthenticated, login } from "../api/auth";
import styles from "./LoginPage.module.scss";

// ⚠️ Logoni shu yo‘lga qo‘ying: src/assets/app-logo.png
// Agar nomi boshqacha bo‘lsa, import yo‘lini moslang.
import appLogo from "../assets/zamin-logo.png";

export default function LoginPage() {
  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/dashboard";

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const ok = await login(username.trim(), password);
      if (ok) navigate(from, { replace: true });
      else setError("Login failed");
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.message || "Login amalga oshmadi"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.auth}>
      <div className={styles.decor1} />
      <div className={styles.decor2} />

      <div className={styles.split}>
        {/* Chap — Hero */}
        <div className={styles.left}>
          <div className={styles.hero}>
            <div className={styles.logoWrap}>
              <img className={styles.logo} src={appLogo} alt="Agro Map logo" />
            </div>

            <h1 className={styles.heroTitle}>
              Avtomatlashtirilgan axborot tizimi
            </h1>
            <p className={styles.tagline}>
              Qishloq xo‘jaligi va yordamchi xo‘jalik resurslarini{" "}
              <span>interaktiv xarita</span> orqali kuzating, boshqaring va
              tahlil qiling.
            </p>
          </div>
        </div>

        {/* O‘ng — Forma */}
        <div className={styles.right}>
          <div className={styles.card}>
            <div className={styles.brandSmall}>
              <span className={styles.brandTextSmall}>Tizimga kirish</span>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <form className={styles.form} onSubmit={onSubmit}>
              <div className={styles.field}>
                <label>Username</label>
                <input
                  autoFocus
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  inputMode="email"
                  spellCheck={false}
                  autoCapitalize="none"
                />
              </div>

              <div className={`${styles.field} ${styles.pwd}`}>
                <label>Password</label>
                <input
                  placeholder="••••••••"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.toggle}
                  onClick={() => setShowPwd((s) => !s)}
                  aria-label={showPwd ? "Yopish" : "Ko‘rsatish"}
                  title={showPwd ? "Yopish" : "Ko‘rsatish"}
                >
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>

              <button
                type="submit"
                className={`${styles.btn} ${styles.primary} ${styles.full}`}
                disabled={busy}
              >
                {busy ? "Kutilmoqda..." : "Kirish"}
              </button>
            </form>

            <div className={styles.foot}>
              <p className={styles.muted}>© {new Date().getFullYear()} Zamin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
