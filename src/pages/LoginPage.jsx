// src/pages/LoginPage.jsx
import { useState } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { isAuthenticated, login } from "../api/auth";
import { LuLeaf } from "react-icons/lu";
import styles from "./LoginPage.module.scss";

export default function LoginPage() {
  // Agar allaqachon login bo‘lsa — dashboardga
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
  // Qayerdan kelganini olamiz — bo‘lmasa /dashboard
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

      <div className={styles.card}>
        <div className={styles.brand}>
          <LuLeaf size={22} />
          <div className={styles.brandText}>
            <h1>Agro Map</h1>
            <p className={styles.muted}>Tizimga kirish</p>
          </div>
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
            />
          </div>

          <div className={`${styles.field} ${styles.pwd}`}>
            <label>Password</label>
            <input
              placeholder="••••••••"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
          <p className={styles.muted}>© {new Date().getFullYear()} Agro Map</p>
        </div>
      </div>
    </div>
  );
}
