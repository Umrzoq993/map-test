import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getNewCaptcha } from "../../api/captcha";

/**
 * CaptchaBox
 * Props:
 * - onChange: ({ id, answer }) => void
 * - onExpired: () => void (optional)
 * - className (optional)
 * - autoFocus (boolean, default false) for input
 */
export default function CaptchaBox({
  onChange,
  onExpired,
  className,
  autoFocus,
}) {
  const [captchaId, setCaptchaId] = useState("");
  const [image, setImage] = useState("");
  const [ttlSeconds, setTtlSeconds] = useState(0);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    clearInterval(timerRef.current);
    setLoading(true);
    setError("");
    try {
      let data;
      try {
        data = await getNewCaptcha();
      } catch (e) {
        if (e?.response?.status === 429) {
          await new Promise((r) => setTimeout(r, 1000));
          data = await getNewCaptcha();
        } else {
          throw e;
        }
      }
      const { id, image, ttlSeconds } = data || {};
      setCaptchaId(id);
      setImage(image);
      setTtlSeconds(Number(ttlSeconds || 0));
      setAnswer("");
      onChange?.({ id, answer: "" });
    } catch (e) {
      setError(
        e?.response?.data?.message || e?.message || "CAPTCHA olishda xatolik"
      );
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  useEffect(() => {
    load();
    return () => clearInterval(timerRef.current);
  }, [load]);

  // Countdown
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!ttlSeconds) return;
    timerRef.current = setInterval(() => {
      setTtlSeconds((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          onExpired?.();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [ttlSeconds, onExpired]);

  // Auto refresh when expired
  useEffect(() => {
    if (ttlSeconds === 0 && captchaId) {
      // auto-refresh silently
      load();
    }
  }, [ttlSeconds, captchaId, load]);

  const ttlLabel = useMemo(() => {
    if (!ttlSeconds) return "expired";
    return `${ttlSeconds}s`;
  }, [ttlSeconds]);

  const onRefresh = async (e) => {
    e?.preventDefault?.();
    await load();
  };

  const onInput = (e) => {
    const v = e.target.value;
    setAnswer(v);
    onChange?.({ id: captchaId, answer: v });
  };

  return (
    <div className={className} style={{ display: "grid", gap: 10 }}>
      <label style={{ fontSize: 13, color: "var(--am-muted, #64748b)" }}>
        CAPTCHA
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 160,
            height: 56,
            display: "grid",
            placeItems: "center",
            border: "1px solid var(--am-border, #e5e7eb)",
            borderRadius: 8,
            overflow: "hidden",
            background: "var(--am-card, #ffffff)",
          }}
        >
          {image ? (
            <img
              src={image}
              width={160}
              height={56}
              alt="Tekshiruv rasmini kiriting"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <span style={{ fontSize: 12, color: "var(--am-muted, #6b7280)" }}>
              {loading ? "Yuklanmoqda..." : error || "Rasm yo'q"}
            </span>
          )}
        </div>
        <div style={{ display: "grid", gap: 6, flex: 1, minWidth: 160 }}>
          <input
            inputMode="text"
            autoComplete="off"
            placeholder="Javobni kiriting"
            value={answer}
            onChange={onInput}
            aria-label="CAPTCHA javobi"
            autoFocus={autoFocus}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--am-border, #e5e7eb)",
              background: "transparent",
              color: "var(--am-text, #0f172a)",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={onRefresh}
              aria-label="CAPTCHA yangilash"
              title="CAPTCHA yangilash"
              style={{
                border: "1px solid var(--am-border, #e5e7eb)",
                background:
                  "color-mix(in srgb, var(--am-card, #ffffff) 96%, var(--am-text, #0f172a) 4%)",
                color: "var(--am-text, #0f172a)",
                padding: "8px 10px",
                borderRadius: 10,
                cursor: "pointer",
              }}
              disabled={loading}
            >
              Yangilash
            </button>
            <span style={{ fontSize: 12, color: "var(--am-muted, #6b7280)" }}>
              Qolgan vaqt: {ttlLabel}
            </span>
          </div>
        </div>
      </div>
      {error && (
        <div style={{ fontSize: 12, color: "var(--danger-2, #b91c1c)" }}>
          {error}
        </div>
      )}
    </div>
  );
}
