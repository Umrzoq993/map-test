import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { setToken, decodeJWT } from "../utils/auth";
import styles from "./LoginPage.module.scss"; // <-- MODUL

function LeafLogo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#22c55e" />
          <stop offset="1" stopColor="#16a34a" />
        </linearGradient>
      </defs>
      <path
        d="M56 8C36 9 22 16 14 28S6 52 8 56c4 2 20 0 32-8s19-22 16-40z"
        fill="url(#g)"
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

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const navigate = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from?.pathname || "/";

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!username.trim() || !password) {
      setErr("Login va parolni kiriting");
      return;
    }
    setLoading(true);
    try {
      const { token } = await login(username.trim(), password);
      setToken(token);
      decodeJWT(); // kerak bo‘lsa ishlatasiz
      navigate(from, { replace: true });
    } catch (e) {
      setErr(
        e?.response?.status === 401
          ? "Login yoki parol noto‘g‘ri"
          : "Server xatosi."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.auth}>
      <div className={styles.decor1} />
      <div className={styles.decor2} />

      <div className={styles.card}>
        <div className={styles.brand}>
          <LeafLogo size={30} />
          <div className={styles.brandText}>
            <h1>AgriMap</h1>
            <p className={styles.muted}>Fermer xo‘jaliklari uchun geoxizmat</p>
          </div>
        </div>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.field}>
            <label>Login</label>
            <input
              type="text"
              autoFocus
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className={styles.field}>
            <label>Parol</label>
            <div className={styles.pwd}>
              <input
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.toggle}
                onClick={() => setShowPwd((s) => !s)}
                aria-label={
                  showPwd ? "Parolni yashirish" : "Parolni ko‘rsatish"
                }
              >
                {showPwd ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          {err && <div className={styles.error}>{err}</div>}

          <button
            className={`${styles.btn} ${styles.primary} ${styles.full}`}
            disabled={loading}
          >
            {loading ? "Kutilmoqda..." : "Kirish"}
          </button>
        </form>

        <div className={styles.foot}>
          <small className={styles.muted}>
            © {new Date().getFullYear()} AgriMap
          </small>
        </div>
      </div>
    </div>
  );
}
