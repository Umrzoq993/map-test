import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LuFilter,
  LuKeyRound,
  LuMoveRight,
  LuPencil,
  LuPlus,
  LuRefreshCw,
  LuSave,
  LuSearch,
  LuShield,
  LuShieldOff,
  LuTrash2,
  LuUsers,
  LuX,
} from "react-icons/lu";
import { toast } from "react-toastify";
import {
  changeUserStatus,
  createUser,
  moveUser,
  resetUserPassword,
  searchUsers,
  updateUser,
} from "../../api/users";
import { useTheme } from "../../hooks/useTheme";
import OrgUnitSelect from "./OrgUnitSelect";
import UsersDialog from "./UsersDialog";
import styles from "./UsersPage.module.scss";

const ROLES = ["ADMIN", "USER"];
const STATUSES = ["ACTIVE", "SUSPENDED", "TERMINATED"];

export default function UsersPage() {
  const { isDark } = useTheme();

  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [orgId, setOrgId] = useState(null); // number|null
  const [dept, setDept] = useState("");

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sort] = useState("id,desc"); // removed unused setter

  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const emptyForm = {
    username: "",
    password: "",
    role: "USER",
    fullName: "",
    position: "",
    title: "",
    phone: "",
    avatarUrl: "",
    orgId: null, // number|null
    department: "",
    maxSessions: 1,
  };
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [openEdit, setOpenEdit] = useState(false);

  const [moveCtx, setMoveCtx] = useState({
    open: false,
    id: null,
    orgId: null,
    department: "",
  });

  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    message: "",
    onApprove: null,
  });

  // ===== Data Loading =====
  const load = useCallback(
    async (p = page) => {
      setBusy(true);
      try {
        const res = await searchUsers({
          page: p,
          size,
          sort,
          q: q || undefined,
          role: role || undefined,
          status: status || undefined,
          orgId: orgId ?? undefined,
          department: dept || undefined,
        });
        setRows(res.content || []);
        setTotal(res.totalElements ?? res.total ?? 0);
        setPage(res.page ?? p);
      } finally {
        setBusy(false);
      }
    },
    [page, size, sort, q, role, status, orgId, dept]
  );

  useEffect(() => {
    load(0); // size yoki sort o'zgarsa boshidan qidiradi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, sort]);

  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, size)));

  // ===== CRUD =====
  function startCreate() {
    setEditId(null);
    setForm({ ...emptyForm });
    setOpenEdit(true);
  }
  function startEdit(u) {
    setEditId(u.id);
    setForm({
      username: u.username,
      password: "",
      role: u.role || "USER",
      fullName: u.fullName || "",
      position: u.position || "",
      title: u.title || "",
      phone: u.phone || "",
      avatarUrl: u.avatarUrl || "",
      orgId: u.orgId ?? null,
      department: u.department || "",
      maxSessions: Math.max(1, Number(u.maxSessions || 1)),
    });
    setOpenEdit(true);
  }

  async function saveUser() {
    setBusy(true);
    try {
      const payload = { ...form };
      if (payload.orgId == null) delete payload.orgId;
      // Normalizatsiya va validatsiya
      const ms = Number(payload.maxSessions);
      if (!Number.isFinite(ms) || ms < 1) payload.maxSessions = 1;
      else payload.maxSessions = Math.floor(ms);
      if (editId) {
        if (!payload.password) delete payload.password;
        await updateUser(editId, payload);
      } else {
        if (!payload.username || !payload.password) {
          toast.warn("Login va parol majburiy.");
          return;
        }
        await createUser(payload);
      }
      setOpenEdit(false);
      setForm(emptyForm);
      setEditId(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  function askStatus(u, newStatus) {
    const map = {
      ACTIVE: "Foydalanuvchini faollashtirasizmi?",
      SUSPENDED: "Foydalanuvchini vaqtincha bloklaysizmi?",
      TERMINATED: "Foydalanuvchini bo‘shatasizmi? (kirish huquqi olinadi)",
    };
    setConfirm({
      open: true,
      title: "Tasdiqlash",
      message: `${u.username} → ${newStatus}\n${map[newStatus] || ""}`,
      onApprove: async () => {
        setConfirm({ open: false, title: "", message: "", onApprove: null });
        await changeUserStatus(u.id, newStatus);
        await load();
      },
    });
  }

  function startMove(u) {
    setMoveCtx({
      open: true,
      id: u.id,
      orgId: u.orgId ?? null,
      department: u.department || "",
    });
  }
  async function doMove() {
    setBusy(true);
    try {
      const payload = {};
      if (moveCtx.orgId != null) payload.orgId = Number(moveCtx.orgId);
      if (String(moveCtx.department || "").trim())
        payload.department = moveCtx.department;
      await moveUser(moveCtx.id, payload);
      setMoveCtx({ open: false, id: null, orgId: null, department: "" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  function askReset(u) {
    setConfirm({
      open: true,
      title: "Vaqtinchalik parol",
      message: `${u.username} uchun vaqtinchalik parol berilsinmi?`,
      onApprove: async () => {
        setConfirm({ open: false, title: "", message: "", onApprove: null });
        const res = await resetUserPassword(u.id);
        const pwd = res?.tempPassword || "(kelmadi)";
        toast.info(`Yangi vaqtinchalik parol: ${pwd}`, { autoClose: 8000 });
      },
    });
  }

  // ===== Client-side quick filter =====
  const quick = useMemo(() => {
    const t = (q || "").trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((u) =>
      [u.username, u.fullName, u.phone, u.position, u.title]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(t))
    );
  }, [rows, q]);

  // ===== Filter helpers =====
  const appliedFilters = useMemo(() => {
    const chips = [];
    if (role) chips.push({ key: "role", label: `Rol: ${role}` });
    if (status) chips.push({ key: "status", label: `Holat: ${status}` });
    if (orgId != null) chips.push({ key: "org", label: `Tashk.: #${orgId}` }); // matnda nom bo'lmasa ham ko'rsatamiz
    if (dept) chips.push({ key: "dept", label: `Bo‘lim: ${dept}` });
    return chips;
  }, [role, status, orgId, dept]);

  const clearFilters = useCallback(() => {
    setRole("");
    setStatus("");
    setOrgId(null);
    setDept("");
  }, []);

  // ===== Handlers =====
  const onSearchKeyDown = (e) => {
    if (e.key === "Enter") load(0);
  };

  return (
    <div className={styles.page} data-theme={isDark ? "dark" : "light"}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.title}>
          <LuUsers /> Foydalanuvchilar
          <span className={styles.count}>{total}</span>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.btn}
            onClick={() => load(page)}
            disabled={busy}
          >
            <LuRefreshCw /> Qayta yuklash
          </button>
          <button className={styles.btnPrimary} onClick={startCreate}>
            <LuPlus /> Yangi foydalanuvchi
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar} data-sticky>
        <div className={styles.searchBox}>
          <LuSearch />
          <input
            placeholder="Login / FIO / telefon / lavozim bo‘yicha qidirish..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onSearchKeyDown}
          />
          {q && (
            <button
              className={styles.clearInput}
              onClick={() => setQ("")}
              title="Tozalash"
            >
              <LuX />
            </button>
          )}
        </div>

        <div className={styles.filters}>
          <div className={styles.field}>
            <label>Rol</label>
            <select
              className={styles.input}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="">(hammasi)</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>Holat</label>
            <select
              className={styles.input}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">(hammasi)</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field} style={{ minWidth: 260 }}>
            <label>Tashkilot birligi</label>
            <OrgUnitSelect
              value={orgId}
              onChange={(o) => setOrgId(o?.id ?? null)}
              placeholder="Tashkilotni qidiring..."
              allowClear
            />
          </div>

          <div className={styles.field}>
            <label>Bo‘lim</label>
            <input
              className={styles.input}
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              placeholder="Masalan: IT"
            />
          </div>

          <div className={styles.actionsRight}>
            <button
              className={styles.btn}
              onClick={() => load(0)}
              disabled={busy}
            >
              <LuFilter /> Qidirish
            </button>
            {(role || status || orgId != null || dept) && (
              <button className={styles.btnGhost} onClick={clearFilters}>
                <LuX /> Tozalash
              </button>
            )}
          </div>
        </div>

        {!!appliedFilters.length && (
          <div className={styles.chips}>
            {appliedFilters.map((c) => (
              <span key={c.key} className={styles.chip}>
                {c.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Jadval */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>№</th>
              <th>Login</th>
              <th>FIO</th>
              <th>Rol</th>
              <th>Holat</th>
              <th>Tashk. birligi</th>
              <th>Bo‘lim</th>
              <th>Kontakt</th>
              <th>Harakatlar</th>
            </tr>
          </thead>
          <tbody>
            {quick.map((u, i) => {
              const orgName =
                u.orgName ||
                u.orgTitle ||
                u.org?.name ||
                u.org?.title ||
                (u.orgId ? `#${u.orgId}` : null);

              return (
                <tr key={u.id}>
                  <td>{page * size + i + 1}</td>
                  <td>{u.username}</td>
                  <td>{u.fullName || "-"}</td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        styles["role" + (u.role || "").toLowerCase()]
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.badge} ${
                        styles["st" + (u.status || "").toLowerCase()]
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td
                    className={styles.orgCell}
                    title={u.orgId ? `ID: ${u.orgId}` : ""}
                  >
                    {orgName || "-"}
                  </td>
                  <td>{u.department || "-"}</td>
                  <td>
                    <div className={styles.muted}>{u.phone || "-"}</div>
                  </td>
                  <td className={styles.rowActions}>
                    <button
                      className={styles.btn}
                      title="Tahrirlash"
                      onClick={() => startEdit(u)}
                    >
                      <LuPencil />
                    </button>
                    <button
                      className={styles.btn}
                      title="Ko'chirish"
                      onClick={() => startMove(u)}
                    >
                      <LuMoveRight />
                    </button>
                    {u.status !== "ACTIVE" ? (
                      <button
                        className={styles.btnPrimary}
                        title="Aktivlashtirish"
                        onClick={() => askStatus(u, "ACTIVE")}
                      >
                        <LuShield />
                      </button>
                    ) : (
                      <button
                        className={styles.btnWarn}
                        title="Vaqtincha bloklash"
                        onClick={() => askStatus(u, "SUSPENDED")}
                      >
                        <LuShieldOff />
                      </button>
                    )}
                    <button
                      className={styles.btnDanger}
                      title="Bo'shatish"
                      onClick={() => askStatus(u, "TERMINATED")}
                    >
                      <LuTrash2 />
                    </button>
                    <button
                      className={styles.btn}
                      title="Vaqtinchalik parol"
                      onClick={() => askReset(u)}
                    >
                      <LuKeyRound />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!quick.length && (
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
        {busy && <div className={styles.loadingOverlay}>Yuklanmoqda…</div>}
      </div>

      {/* Pager */}
      <div className={styles.pager}>
        <div className={styles.field}>
          <label>Sahifa hajmi</label>
          <select
            className={styles.input}
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value));
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
            Sahifa {page + 1} /{" "}
            {Math.max(1, Math.ceil(total / Math.max(1, size)))}
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

      {/* ===== Dialoglar ===== */}

      {/* Yaratish/Tahrirlash */}
      <UsersDialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        title={editId ? "Foydalanuvchini tahrirlash" : "Yangi foydalanuvchi"}
        size="lg"
        footer={
          <>
            <button className={styles.btn} onClick={() => setOpenEdit(false)}>
              Bekor qilish
            </button>
            <button
              className={styles.btnPrimary}
              onClick={saveUser}
              disabled={busy}
            >
              <LuSave /> Saqlash
            </button>
          </>
        }
      >
        <div className={styles.grid}>
          <div className={styles.field}>
            <label>Login*</label>
            <input
              className={styles.input}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              disabled={!!editId}
            />
          </div>
          <div className={styles.field}>
            <label>Parol{editId ? " (ixtiyoriy)" : "*"}</label>
            <input
              className={styles.input}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label>Rol</label>
            <select
              className={styles.input}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label>F.I.O</label>
            <input
              className={styles.input}
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label>Lavozim</label>
            <input
              className={styles.input}
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label>Unvon</label>
            <input
              className={styles.input}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className={styles.field}>
            <label>Telefon</label>
            <input
              className={styles.input}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label>Avatar URL</label>
            <input
              className={styles.input}
              value={form.avatarUrl}
              onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
            />
          </div>

          <div className={styles.field} style={{ minWidth: 260 }}>
            <label>Tashkilot birligi</label>
            <OrgUnitSelect
              value={form.orgId}
              onChange={(o) => setForm({ ...form, orgId: o?.id ?? null })}
              placeholder="Tashkilotni qidiring..."
              allowClear
            />
          </div>
          <div className={styles.field}>
            <label>Bo‘lim</label>
            <input
              className={styles.input}
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>

          <div className={styles.field}>
            <label>Maks. sessiyalar</label>
            <input
              className={styles.input}
              type="number"
              min={1}
              value={form.maxSessions}
              onChange={(e) =>
                setForm({
                  ...form,
                  maxSessions: Math.max(1, Number(e.target.value || 1)),
                })
              }
            />
          </div>
        </div>
      </UsersDialog>

      {/* Ko‘chirish */}
      <UsersDialog
        open={moveCtx.open}
        onClose={() =>
          setMoveCtx({ open: false, id: null, orgId: null, department: "" })
        }
        title="Ko‘chirish (tashk. birligi / bo‘lim)"
        size="md"
        footer={
          <>
            <button
              className={styles.btn}
              onClick={() =>
                setMoveCtx({
                  open: false,
                  id: null,
                  orgId: null,
                  department: "",
                })
              }
            >
              Bekor
            </button>
            <button
              className={styles.btnPrimary}
              onClick={doMove}
              disabled={busy}
            >
              Saqlash
            </button>
          </>
        }
      >
        <div className={styles.vstack}>
          <div className={styles.field} style={{ minWidth: 260 }}>
            <label>Yangi tashkilot birligi</label>
            <OrgUnitSelect
              value={moveCtx.orgId}
              onChange={(o) =>
                setMoveCtx((s) => ({ ...s, orgId: o?.id ?? null }))
              }
              placeholder="Tashkilotni qidiring..."
              allowClear
            />
          </div>
          <div className={styles.field}>
            <label>Yangi bo‘lim</label>
            <input
              className={styles.input}
              value={moveCtx.department}
              onChange={(e) =>
                setMoveCtx((s) => ({ ...s, department: e.target.value }))
              }
              placeholder="Masalan: IT bo‘limi"
            />
          </div>
          <div className={styles.mutedSm}>
            Ixtiyoriy maydonlar. Bo‘sh qoldirsangiz o‘zgarmaydi.
          </div>
        </div>
      </UsersDialog>

      {/* Tasdiqlash */}
      <UsersDialog
        open={confirm.open}
        onClose={() =>
          setConfirm({ open: false, title: "", message: "", onApprove: null })
        }
        title={confirm.title || "Tasdiqlash"}
        size="sm"
        footer={
          <>
            <button
              className={styles.btn}
              onClick={() =>
                setConfirm({
                  open: false,
                  title: "",
                  message: "",
                  onApprove: null,
                })
              }
            >
              Bekor
            </button>
            <button
              className={styles.btnDanger}
              onClick={async () => {
                const cb = confirm.onApprove;
                setConfirm({
                  open: false,
                  title: "",
                  message: "",
                  onApprove: null,
                });
                if (cb) await cb();
              }}
            >
              Tasdiqlayman
            </button>
          </>
        }
      >
        <pre className={styles.pre}>{confirm.message}</pre>
      </UsersDialog>
    </div>
  );
}
