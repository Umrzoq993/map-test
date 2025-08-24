import { useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
  Navigate,
  useSearchParams,
} from "react-router-dom";
import { isAuthenticated, login, logout, decodeJWT } from "../api/auth";
import styles from "./LoginPage.module.scss";

// ⚠️ Logoni shu yo‘lga qo‘ying: src/assets/zamin-logo.png
import appLogo from "../assets/zamin-logo.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const authed = isAuthenticated();
  const from = location.state?.from?.pathname || "/dashboard";

  // /login?logout=1 -> darhol chiqish
  useEffect(() => {
    if (searchParams.get("logout") === "1") {
      (async () => {
        try {
          await logout();
        } finally {
          navigate("/login", { replace: true });
        }
      })();
    }
  }, [searchParams, navigate]);

  // Agar foydalanuvchi login sahifasini ko‘rmoqchi bo‘lsa:
  // /login?switch=1 bo‘lsa — majburan formani ko‘rsatamiz (authed bo‘lsa ham)
  const forceSwitch = searchParams.get("switch") === "1";

  // UI: login form holati
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  // 1) Agar login bo‘lmagan bo‘lsa — oddiy login formani ko‘rsatamiz
  if (!authed) {
    return (
      <div className={styles.auth}>
        <div className={styles.decor1} />
        <div className={styles.decor2} />

        <div className={styles.split}>
          {/* Chap — Hero */}
          <div className={styles.left}>
            <div className={styles.hero}>
              <div className={styles.logoWrap}>
                <img
                  className={styles.logo}
                  src={appLogo}
                  alt="Agro Map logo"
                />
              </div>

              <h1 className={styles.heroTitle}>
                Avtomatlashtirilgan axborot tizimi
              </h1>
              <p className={styles.tagline}>
                Qishloq xo‘jaligi va yordamchi xo‘jalik resurslarini{" "}
                <span>interaktiv xarita</span> orqali kuzatish, boshqarish va
                tahlil qilish.
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
                <p className={styles.muted}>
                  © {new Date().getFullYear()} Zamin
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2) Agar login bo‘lgan bo‘lsa va switch=1 bo‘lsa — majburan formani ko‘rsatamiz (akkaunt almashtirish)
  if (authed && forceSwitch) {
    return (
      <div className={styles.auth}>
        <div className={styles.decor1} />
        <div className={styles.decor2} />

        <div className={styles.split}>
          {/* Chap — Hero */}
          <div className={styles.left}>
            <div className={styles.hero}>
              <div className={styles.logoWrap}>
                <img
                  className={styles.logo}
                  src={appLogo}
                  alt="Agro Map logo"
                />
              </div>

              <h1 className={styles.heroTitle}>Akkaunt almashtirish</h1>
              <p className={styles.tagline}>
                Hozirgi sessiyani o‘chirmasdan boshqa foydalanuvchi sifatida
                kirishingiz mumkin.
              </p>
            </div>
          </div>

          {/* O‘ng — Forma */}
          <div className={styles.right}>
            <div className={styles.card}>
              <div className={styles.brandSmall}>
                <span className={styles.brandTextSmall}>Yangi login</span>
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <form className={styles.form} onSubmit={onSubmit}>
                <div className={styles.field}>
                  <label>Username</label>
                  <input
                    autoFocus
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
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
                  >
                    {showPwd ? "🙈" : "👁️"}
                  </button>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    className={`${styles.btn}`}
                    onClick={() => navigate(from, { replace: true })}
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    className={`${styles.btn} ${styles.primary}`}
                    disabled={busy}
                  >
                    {busy ? "Kutilmoqda..." : "Kirish"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3) Agar login bo‘lgan bo‘lsa va switch=1 YO‘Q — "allaqachon tizimdasiz" ekrani (logout / continue / switch)
  const payload = decodeJWT();
  const who =
    payload?.username || payload?.sub || payload?.name || "foydalanuvchi";

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

            <h1 className={styles.heroTitle}>Siz tizimdasiz</h1>
            <p className={styles.tagline}>
              Hozir <b>{who}</b> sifatida tizimdasiz. Davom etishingiz yoki
              boshqa akkaunt bilan kirishingiz mumkin.
            </p>
          </div>
        </div>

        {/* O‘ng — Tanlovlar */}
        <div className={styles.right}>
          <div className={styles.card}>
            <div className={styles.brandSmall}>
              <span className={styles.brandTextSmall}>Hisob boshqaruvi</span>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <button
                className={`${styles.btn} ${styles.primary}`}
                onClick={() => navigate(from, { replace: true })}
              >
                Davom etish (Dashboard)
              </button>

              <button
                className={styles.btn}
                onClick={() => navigate("/login?switch=1", { replace: true })}
              >
                Boshqa akkaunt bilan kirish
              </button>

              <button
                className={`${styles.btn} ${styles.danger || ""}`}
                onClick={async () => {
                  try {
                    await logout();
                  } finally {
                    navigate("/login", { replace: true });
                  }
                }}
              >
                Chiqish
              </button>
            </div>

            <div className={styles.foot}>
              <p className={styles.muted}>© {new Date().getFullYear()} Zamin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
