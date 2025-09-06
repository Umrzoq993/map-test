// src/pages/admin/OnlineUsersPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  LuChevronsUpDown,
  LuRefreshCw,
  LuSearch,
  LuUsers,
} from "react-icons/lu";
import { listOnlineUsers } from "../../api/admin";
import { useTheme } from "../../hooks/useTheme";
import styles from "./OnlineUsersPage.module.scss";

export default function OnlineUsersPage() {
  const { isDark } = useTheme();

  // Server pagination state
  const [page, setPage] = useState(0); // zero-based
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Server sort "field,dir"
  const [sortStr, setSortStr] = useState("id,desc");

  // Data + UI
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [filter, setFilter] = useState("");

  async function load(p = page) {
    setBusy(true);
    setForbidden(false);
    try {
      const {
        content,
        page: rp,
        size: rs,
        total: tt,
        totalPages: tp,
      } = await listOnlineUsers({ page: p, size, sort: sortStr });

      setRows(Array.isArray(content) ? content : []);
      setPage(typeof rp === "number" ? rp : p);
      setSize(typeof rs === "number" ? rs : size);
      setTotal(typeof tt === "number" ? tt : 0);
      setTotalPages(
        typeof tp === "number" && tp > 0
          ? tp
          : Math.max(
              1,
              Math.ceil(
                (typeof tt === "number" ? tt : 0) /
                  Math.max(1, typeof rs === "number" ? rs : size)
              )
            )
      );
    } catch (e) {
      if (e?.response?.status === 403) {
        setForbidden(true);
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // server size/sort yangilansa — boshidan yuklash
  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, sortStr]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [
        r.fullName,
        r.username,
        r.role,
        r.status,
        r.orgName,
        r.department,
        r.position,
        r.phone,
        r.title,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, filter]);

  const fromRow = total ? page * size + (filtered.length ? 1 : 0) : 0;
  const toRow = total ? page * size + filtered.length : 0;

  function toggleServerSort(field) {
    const [curField, curDir] = String(sortStr).split(",");
    const isSame = curField === field;
    const nextDir = isSame ? (curDir === "asc" ? "desc" : "asc") : "asc";
    setSortStr(`${field},${nextDir}`);
  }

  return (
    <div className={styles.page} data-theme={isDark ? "dark" : "light"}>
      <div className={styles.header}>
        <div className={styles.title}>
          <LuUsers /> Onlayn foydalanuvchilar
          <span className={styles.badge} title="Onlayn foydalanuvchilar soni">
            {total}
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
            placeholder="fullName / username / orgName / department / telefon / lavozim…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </div>

      {forbidden && (
        <div className={styles.alert}>
          Bu sahifani ko‘rish uchun ruxsat yo‘q (403).
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th onClick={() => toggleServerSort("id")}>
                № <LuChevronsUpDown />
              </th>
              <th onClick={() => toggleServerSort("fullName")}>
                F.I.Sh <LuChevronsUpDown />
              </th>
              <th onClick={() => toggleServerSort("username")}>
                Username <LuChevronsUpDown />
              </th>
              <th onClick={() => toggleServerSort("role")}>
                Role <LuChevronsUpDown />
              </th>
              <th onClick={() => toggleServerSort("status")}>
                Status <LuChevronsUpDown />
              </th>
              <th onClick={() => toggleServerSort("orgName")}>
                Tashkilot <LuChevronsUpDown />
              </th>
              <th onClick={() => toggleServerSort("department")}>
                Bo‘lim <LuChevronsUpDown />
              </th>
              <th onClick={() => toggleServerSort("phone")}>
                Telefon <LuChevronsUpDown />
              </th>
              <th onClick={() => toggleServerSort("position")}>
                Lavozim <LuChevronsUpDown />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const phone = (u.phone && String(u.phone).trim()) || "";
              return (
                <tr key={u.id ?? `${u.username}:${u.rowNo}`}>
                  <td>{u.rowNo}</td>
                  <td className={styles.truncate} title={u.fullName || ""}>
                    {u.fullName || "-"}
                  </td>
                  <td className={styles.truncate} title={u.username || ""}>
                    {u.username || "-"}
                  </td>
                  <td>{u.role || "-"}</td>
                  <td>{u.status || "-"}</td>
                  <td className={styles.truncate} title={u.orgName || ""}>
                    {u.orgName || "-"}
                  </td>
                  <td className={styles.truncate} title={u.department || ""}>
                    {u.department || "-"}
                  </td>
                  <td className={styles.truncate} title={phone}>
                    {phone ? (
                      <a href={`tel:${phone}`} style={{ color: "inherit" }}>
                        {phone}
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className={styles.truncate} title={u.position || ""}>
                    {u.position || "-"}
                  </td>
                </tr>
              );
            })}
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
            Sahifa {page + 1} / {totalPages} · Ko‘rsatilmoqda {fromRow}–{toRow}{" "}
            / {total}
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
