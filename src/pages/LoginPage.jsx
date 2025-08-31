import { useEffect, useState, useCallback } from "react";
import {
  useLocation,
  useNavigate,
  Navigate,
  useSearchParams,
} from "react-router-dom";
import { isAuthenticated, login, logout, decodeJWT } from "../api/auth";
import { verifyCaptcha } from "../api/captcha";
import CaptchaBox from "../components/common/CaptchaBox.jsx";
import { toast } from "react-toastify";
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
          toast.info("Sessiya yakunlandi");
        } finally {
          navigate("/login", { replace: true });
        }
      })();
    }
    const reason = searchParams.get("reason");
    if (reason === "expired")
      toast.info("Sessiya muddati tugagan edi. Qayta kiring.");
    else if (reason === "revoked") toast.warn("Sessiya bekor qilingan.");
    else if (reason === "replay")
      toast.error("Xavfsizlik: qayta ishlatilgan sessiya.");
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
  // CAPTCHA state
  const [captchaId, setCaptchaId] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaNearExpiry, setCaptchaNearExpiry] = useState(false);

  const onCaptchaChange = useCallback(({ id, answer }) => {
    setCaptchaId(id || "");
    setCaptchaAnswer(answer || "");
  }, []);

  const onCaptchaExpired = useCallback(() => {
    setCaptchaNearExpiry(true);
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      // 1) Verify CAPTCHA first (today's flow)
      if (!captchaId || !captchaAnswer) {
        setBusy(false);
        setError("Iltimos, CAPTCHA javobini kiriting");
        return;
      }

      let verified = false;
      try {
        const v = await verifyCaptcha({ id: captchaId, answer: captchaAnswer });
        verified = !!v?.ok;
      } catch (err) {
        // Rate limit handling (429)
        if (err?.response?.status === 429) {
          await new Promise((r) => setTimeout(r, 1200));
          try {
            const v2 = await verifyCaptcha({
              id: captchaId,
              answer: captchaAnswer,
            });
            verified = !!v2?.ok;
          } catch (e2) {
            throw e2;
          }
        } else {
          throw err;
        }
      }

      if (!verified) {
        setError("CAPTCHA noto‘g‘ri yoki muddati tugagan");
        toast.error("CAPTCHA xato. Qaytadan urinib ko‘ring.");
        // CaptchaBox will refresh on demand via its button; we keep answer cleared via onChange on refresh
        return;
      }

      // 2) Proceed with existing login call
      const ok = await login(username.trim(), password, {
        captchaId,
        captchaAnswer,
      });
      if (ok) {
        toast.success("Muvaffaqiyatli kirildi");
        navigate(from, { replace: true });
      } else {
        setError("Login failed");
        toast.error("Login failed");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Login amalga oshmadi";
      setError(msg);
      toast.error(msg);
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

                {/* CAPTCHA */}
                <CaptchaBox
                  onChange={onCaptchaChange}
                  onExpired={onCaptchaExpired}
                />

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

                {/* CAPTCHA */}
                <CaptchaBox
                  onChange={onCaptchaChange}
                  onExpired={onCaptchaExpired}
                />

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
                    toast.info("Chiqildi");
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
