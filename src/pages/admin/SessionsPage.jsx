// src/pages/admin/SessionsPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  listSessions,
  revokeAllForUser,
  getOnlineCount,
} from "../../api/admin";
import { useTheme } from "../../hooks/useTheme";
import styles from "./SessionsPage.module.scss";
import {
  LuActivity,
  LuShieldAlert,
  LuRefreshCw,
  LuTrash2,
  LuMonitorSmartphone,
  LuCalendarClock,
  LuSearch,
} from "react-icons/lu";

function fmt(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return String(d);
  }
}

export default function SessionsPage() {
  const { isDark } = useTheme(); // <— App’dagi theme bilan bir xil manba
  const [rows, setRows] = useState([]);
  const [online, setOnline] = useState(0);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState({ key: "lastSeenAt", dir: "desc" });
  const [forbidden, setForbidden] = useState(false);

  async function load() {
    setBusy(true);
    setForbidden(false);
    try {
      const [sess, oc] = await Promise.all([listSessions(), getOnlineCount()]);
      setRows(sess);
      setOnline(oc?.online ?? 0);
    } catch (e) {
      if (e?.response?.status === 403) {
        setForbidden(true);
      } else {
        console.error("Sessions load error:", e);
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    let r = rows;
    if (q) {
      r = rows.filter((x) =>
        [x.username, x.deviceId, x.ip, x.userAgent]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    const { key, dir } = sortBy;
    const mul = dir === "asc" ? 1 : -1;
    r = [...r].sort((a, b) => {
      const va = a[key],
        vb = b[key];
      if (va === vb) return 0;
      return (va > vb ? 1 : -1) * mul;
    });
    return r;
  }, [rows, filter, sortBy]);

  function changeSort(key) {
    setSortBy((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "desc" }
    );
  }

  if (forbidden) {
    return (
      <div
        className={`${styles.page} ${isDark ? styles.dark : ""}`}
        data-theme={isDark ? "dark" : "light"}
      >
        <div className={styles.header}>
          <div className={styles.title}>
            <LuShieldAlert size={22} />
            <div>
              <h2>Active Sessions</h2>
              <div className={styles.muted}>
                Access denied — ADMIN role required
              </div>
            </div>
          </div>
          <div className={styles.actions}>
            <button
              className={styles.btn}
              onClick={() => window.history.back()}
            >
              Go back
            </button>
          </div>
        </div>
        <div className={styles.card} style={{ padding: 20 }}>
          Ushbu sahifaga faqat <b>ADMIN</b> foydalanuvchilar kira oladi.
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.page} ${isDark ? styles.dark : ""}`}
      data-theme={isDark ? "dark" : "light"}
    >
      <div className={styles.header}>
        <div className={styles.title}>
          <LuShieldAlert size={22} />
          <div>
            <h2>Active Sessions</h2>
            <div className={styles.muted}>
              Device-based login & rotation monitoring
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.btn} onClick={load} disabled={busy}>
            <LuRefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      <div className={styles.kpis}>
        <div className={styles.card}>
          <div className={styles.kpiTitle}>Online (last 60s)</div>
          <div className={styles.kpiValue}>
            <span className={styles.badge}>
              <LuActivity /> {online}
            </span>
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.kpiTitle}>Active sessions</div>
          <div className={styles.kpiValue}>{rows.length}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.kpiTitle}>Filters</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <LuSearch
                style={{ position: "absolute", left: 10, top: 9, opacity: 0.6 }}
              />
              <input
                className={styles.input}
                style={{ paddingLeft: 30, width: "100%" }}
                placeholder="Search (user, device, IP, UA)…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <button
              className={styles.btn}
              onClick={() => setFilter("")}
              disabled={!filter}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => changeSort("id")}>ID</th>
              <th>User</th>
              <th>Device</th>
              <th className={styles.truncate}>User-Agent</th>
              <th>IP</th>
              <th onClick={() => changeSort("createdAt")}>
                <LuCalendarClock /> Created
              </th>
              <th onClick={() => changeSort("lastSeenAt")}>
                <LuCalendarClock /> Last seen
              </th>
              <th onClick={() => changeSort("expiresAt")}>
                <LuCalendarClock /> Expires
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td className={styles.truncate}>
                  <span className={styles.badge}>
                    {r.username}{" "}
                    <small style={{ opacity: 0.7 }}>#{r.userId}</small>
                  </span>
                </td>
                <td className={styles.truncate}>
                  <span className={styles.badge}>
                    <LuMonitorSmartphone /> {r.deviceId}
                  </span>
                </td>
                <td className={styles.truncate} title={r.userAgent}>
                  {r.userAgent || "-"}
                </td>
                <td>{r.ip || "-"}</td>
                <td>{fmt(r.createdAt)}</td>
                <td>{fmt(r.lastSeenAt)}</td>
                <td>{fmt(r.expiresAt)}</td>
                <td>
                  <button
                    className={`${styles.btn} ${styles.btnDanger}`}
                    title="Revoke all sessions for this user"
                    onClick={async () => {
                      if (!confirm(`Revoke ALL sessions for ${r.username}?`))
                        return;
                      await revokeAllForUser(r.userId);
                      await load();
                    }}
                  >
                    <LuTrash2 size={16} /> Revoke user all
                  </button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td
                  colSpan={9}
                  style={{ padding: 16, textAlign: "center", opacity: 0.6 }}
                >
                  Hech narsa topilmadi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
