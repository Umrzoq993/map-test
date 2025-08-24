// src/pages/admin/AuditPage.jsx
import { useEffect, useMemo, useState } from "react";
import { listAudit } from "../../api/admin";
import { useTheme } from "../../hooks/useTheme";
import styles from "./AuditPage.module.scss";
import {
  LuListChecks,
  LuSearch,
  LuRefreshCw,
  LuCalendarClock,
  LuFilter,
} from "react-icons/lu";

const EVENTS = [
  "LOGIN_SUCCESS",
  "REFRESH_ROTATE",
  "REFRESH_REUSE",
  "LOGOUT",
  "SESSION_REVOKE",
  "SESSION_REJECTED",
];

function fmt(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(+d)) return String(v);
  return d.toLocaleString();
}

export default function AuditPage() {
  const { isDark } = useTheme();

  // Filtrlar
  const [userId, setUserId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [event, setEvent] = useState("");
  const [from, setFrom] = useState(""); // datetime-local
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");

  // Sahifalash
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [sort, setSort] = useState("ts,desc");

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState(false);

  async function load(p = page) {
    setBusy(true);
    try {
      const { content, total: t } = await listAudit({
        page: p,
        size,
        sort,
        userId: userId ? Number(userId) : undefined,
        deviceId: deviceId || undefined,
        event: event || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      });
      setRows(content);
      setTotal(t);
      setPage(p);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, sort]);

  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (!text) return rows;
    return rows.filter((r) =>
      [r.username, r.deviceId, r.ip, r.userAgent, r.event]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(text))
    );
  }, [rows, q]);

  const totalPages = Math.max(1, Math.ceil(total / size));

  return (
    <div className={styles.page} data-theme={isDark ? "dark" : "light"}>
      <div className={styles.header}>
        <div className={styles.title}>
          <LuListChecks /> Audit jurnali
        </div>
        <div className={styles.actions}>
          <button
            className={styles.btn}
            onClick={() => load(page)}
            disabled={busy}
          >
            <LuRefreshCw /> Qayta yuklash
          </button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <LuSearch />
          <input
            placeholder="Foydalanuvchi / qurilma / IP / UA / hodisa bo‘yicha qidirish..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className={styles.filters}>
          <span className={styles.fTitle}>
            <LuFilter /> Filtrlar
          </span>

          <div className={styles.field}>
            <label>Foydalanuvchi ID</label>
            <input
              className={styles.input}
              placeholder="istalgan"
              value={userId}
              onChange={(e) => setUserId(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
            />
          </div>

          <div className={styles.field}>
            <label>Qurilma ID</label>
            <input
              className={styles.input}
              placeholder="istalgan"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label>Hodisa</label>
            <select
              className={styles.input}
              value={event}
              onChange={(e) => setEvent(e.target.value)}
            >
              <option value="">istalgan</option>
              {EVENTS.map((ev) => (
                <option key={ev} value={ev}>
                  {ev}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Boshlanish (dan)</label>
            <input
              type="datetime-local"
              className={styles.input}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label>Tugash (gacha)</label>
            <input
              type="datetime-local"
              className={styles.input}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <button
            className={styles.btn}
            onClick={() => load(0)}
            disabled={busy}
            title="Filtrlarni qo‘llash"
          >
            Qo‘llash
          </button>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>№</th>
              <th>Hodisa</th>
              <th>Foydalanuvchi</th>
              <th>Qurilma</th>
              <th>IP</th>
              <th className={styles.truncate}>Brauzer (User-Agent)</th>
              <th>
                <LuCalendarClock /> Vaqt
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, idx) => (
              <tr key={r.id ?? `${r.userId}:${r.deviceId}:${r.ts}:${idx}`}>
                <td>{r.id ?? idx + 1}</td>
                <td>{r.event}</td>
                <td className={styles.truncate}>
                  {r.username ?? "(foydalanuvchi)"}{" "}
                  {r.userId != null && (
                    <small style={{ opacity: 0.7 }}>#{r.userId}</small>
                  )}
                </td>
                <td className={styles.truncate}>{r.deviceId || "-"}</td>
                <td>{r.ip || "-"}</td>
                <td className={styles.truncate} title={r.userAgent}>
                  {r.userAgent || "-"}
                </td>
                <td>{fmt(r.ts)}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td
                  colSpan={7}
                  style={{ padding: 16, textAlign: "center", opacity: 0.6 }}
                >
                  Hech narsa topilmadi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pager}>
        <div className={styles.field}>
          <label>Sahifa hajmi</label>
          <select
            className={styles.input}
            value={size}
            onChange={(e) => {
              const n = Number(e.target.value);
              setSize(n);
              setPage(0);
            }}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.pages}>
          <button
            className={styles.btn}
            disabled={page <= 0 || busy}
            onClick={() => load(0)}
          >
            « Boshiga
          </button>
          <button
            className={styles.btn}
            disabled={page <= 0 || busy}
            onClick={() => load(page - 1)}
          >
            ‹ Oldingi
          </button>
          <span className={styles.muted}>
            Sahifa {page + 1} / {Math.max(1, Math.ceil(total / size))}
          </span>
          <button
            className={styles.btn}
            disabled={page >= totalPages - 1 || busy}
            onClick={() => load(page + 1)}
          >
            Keyingi ›
          </button>
          <button
            className={styles.btn}
            disabled={page >= totalPages - 1 || busy}
            onClick={() => load(totalPages - 1)}
          >
            Oxiriga »
          </button>
        </div>
      </div>
    </div>
  );
}
