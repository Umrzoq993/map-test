// src/pages/admin/SessionsPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  listSessions,
  revokeAllForUser,
  revokeDevice,
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
  LuChevronsUpDown,
  LuSearch,
  LuSmartphoneNfc,
} from "react-icons/lu";

function fmt(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(+d)) return String(v);
  return d.toLocaleString();
}

export default function SessionsPage() {
  const { isDark } = useTheme();

  // Jadval ma’lumotlari
  const [rows, setRows] = useState([]);

  // Server paginatsiya holati
  const [page, setPage] = useState(0); // zero-based
  const [size, setSize] = useState(10); // default 10
  const [total, setTotal] = useState(0);
  const [totalPagesState, setTotalPagesState] = useState(1);
  const [sortStr, setSortStr] = useState("lastSeenAt,desc");

  // UI holatlar
  const [online, setOnline] = useState(0);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState({ key: "lastSeenAt", dir: "desc" });

  // Admin uchun filtrlar
  const [userId, setUserId] = useState("");
  const [includeRevoked, setIncludeRevoked] = useState(false);
  const [includeExpired, setIncludeExpired] = useState(false);

  const [forbidden, setForbidden] = useState(false);

  const effectiveTotalPages =
    typeof totalPagesState === "number" && totalPagesState > 0
      ? totalPagesState
      : Math.max(1, Math.ceil(total / Math.max(1, size)));

  const fromRow = total ? page * size + (rows.length ? 1 : 0) : 0;
  const toRow = total ? page * size + rows.length : 0;

  async function load(p = page) {
    setBusy(true);
    setForbidden(false);
    try {
      const [
        { content, page: rp, size: rs, total: tt, totalPages: tpages },
        oc,
      ] = await Promise.all([
        listSessions({
          userId: userId ? Number(userId) : undefined,
          includeRevoked,
          includeExpired,
          page: p,
          size,
          sort: sortStr,
        }),
        getOnlineCount(),
      ]);

      setRows(Array.isArray(content) ? content : []);
      setPage(typeof rp === "number" ? rp : p);
      setSize(typeof rs === "number" ? rs : size);
      setTotal(typeof tt === "number" ? tt : 0);
      setTotalPagesState(
        typeof tpages === "number" && tpages > 0
          ? tpages
          : Math.max(
              1,
              Math.ceil(
                (typeof tt === "number" ? tt : 0) /
                  Math.max(1, typeof rs === "number" ? rs : size)
              )
            )
      );
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
    load(0); // ilk yuklash
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // server filtrlari/size/sort o'zgarsa 1-sahifadan qayta yuklash
  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, sortStr, includeRevoked, includeExpired]);

  const filtered = useMemo(() => {
    let r = rows;
    const q = filter.trim().toLowerCase();
    if (q) {
      r = r.filter((x) =>
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
      if (va == null) return -1 * mul;
      if (vb == null) return 1 * mul;
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
    // Agar serverni ham shu sort bo'yicha yuritmoqchi bo'lsangiz:
    // const nextDir = (sortBy.key === key && sortBy.dir === "asc") ? "desc" : "asc";
    // setSortStr(`${key},${nextDir}`);
  }

  return (
    <div className={styles.page} data-theme={isDark ? "dark" : "light"}>
      <div className={styles.header}>
        <div className={styles.title}>
          <LuMonitorSmartphone /> Sessiyalar
          <span
            className={styles.badge}
            title="Taxminiy onlayn foydalanuvchilar soni"
          >
            <LuActivity /> {online}
          </span>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.btn}
            onClick={() => load(page)}
            disabled={busy}
            title="Qayta yuklash"
          >
            <LuRefreshCw />
            Qayta yuklash
          </button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <LuSearch />
          <input
            placeholder="Foydalanuvchi / qurilma / IP / UA bo‘yicha qidirish..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <div className={styles.filters}>
          <div className={styles.fieldInline}>
            <label>Foydalanuvchi ID</label>
            <input
              className={styles.input}
              placeholder="(joriy)"
              value={userId}
              onChange={(e) => setUserId(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
            />
          </div>

          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={includeRevoked}
              onChange={(e) => setIncludeRevoked(e.target.checked)}
            />
            <span>Bekor qilinganlarni ham ko‘rsat</span>
          </label>

          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={includeExpired}
              onChange={(e) => setIncludeExpired(e.target.checked)}
            />
            <span>Muddati o‘tganlarni ham ko‘rsat</span>
          </label>

          <button
            className={styles.btn}
            onClick={() => load(0)}
            disabled={busy}
            title="Filtrlarni qo‘llash"
          >
            <LuChevronsUpDown /> Qo‘llash
          </button>
        </div>
      </div>

      {forbidden && (
        <div className={styles.alert}>
          <LuShieldAlert /> Sizda bu sahifani ko‘rish uchun ruxsat yo‘q (403).
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => changeSort("id")}>№</th>
              <th>Foydalanuvchi</th>
              <th>Qurilma</th>
              <th className={styles.truncate}>Brauzer (User-Agent)</th>
              <th>IP</th>
              <th onClick={() => changeSort("createdAt")}>Yaratilgan</th>
              <th onClick={() => changeSort("lastSeenAt")}>Oxirgi ko‘rildi</th>
              <th onClick={() => changeSort("expiresAt")}>Tugash vaqti</th>
              <th>Harakatlar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={`${r.userId ?? "me"}:${r.deviceId}:${r.tokenSuffix ?? ""}`}
              >
                <td>{r.id}</td>
                <td className={styles.truncate}>
                  <span className={styles.badge}>
                    {r.username ?? "(foydalanuvchi)"}{" "}
                    {r.userId != null && (
                      <small style={{ opacity: 0.7 }}>#{r.userId}</small>
                    )}
                  </span>
                </td>
                <td className={styles.truncate} title={r.deviceId}>
                  <span className={styles.badgeOutline}>
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
                <td className={styles.rowActions}>
                  <button
                    className={`${styles.btn} ${styles.btnWarn}`}
                    title="Ushbu qurilma sessiyasini bekor qilish"
                    onClick={async () => {
                      if (
                        !confirm(
                          `Qurilma sessiyasi bekor qilinsinmi?\n\nDevice ID: ${r.deviceId}`
                        )
                      )
                        return;
                      await revokeDevice(r.userId, r.deviceId);
                      await load(page);
                    }}
                  >
                    <LuSmartphoneNfc size={16} /> Qurilmani bekor qilish
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnDanger}`}
                    title="Ushbu foydalanuvchining joriy qurilmadan tashqari barcha sessiyalarini bekor qilish"
                    onClick={async () => {
                      const effectiveUserId =
                        r.userId ?? (userId ? Number(userId) : undefined);
                      if (
                        !confirm(
                          `Foydalanuvchining barcha sessiyalari bekor qilinsinmi? (joriy qurilma saqlanadi)\n\nFoydalanuvchi ID: ${
                            effectiveUserId ?? "(joriy)"
                          }`
                        )
                      )
                        return;
                      await revokeAllForUser(effectiveUserId);
                      await load(0);
                    }}
                  >
                    <LuTrash2 size={16} /> Hammasini bekor qilish
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

      {/* Pager */}
      <div className={styles.pager}>
        <div className={styles.field}>
          <label>Sahifa hajmi</label>
          <select
            className={styles.input}
            value={size}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (n !== size) {
                setSize(n);
                setPage(0);
              }
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
            Sahifa {page + 1} / {effectiveTotalPages} · Ko‘rsatilmoqda {fromRow}
            –{toRow} / {total}
          </span>
          <button
            className={styles.btn}
            disabled={page >= effectiveTotalPages - 1 || busy}
            onClick={() => load(page + 1)}
          >
            Keyingi ›
          </button>
          <button
            className={styles.btn}
            disabled={page >= effectiveTotalPages - 1 || busy}
            onClick={() => load(effectiveTotalPages - 1)}
          >
            Oxiriga »
          </button>
        </div>
      </div>
    </div>
  );
}
