import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../ui/Modal";
import {
  listFacilities,
  createFacility,
  patchFacility,
  deleteFacility,
} from "../../api/facilities";
import { FACILITY_TYPES } from "../map/CreateFacilityDrawer";
import s from "./FacilityCrudTable.module.scss";

function pickAttr(row) {
  return row?.attributes ?? row?.details ?? {};
}
function titleFromKey(k) {
  return k.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}
function nf(v) {
  return typeof v === "number" ? new Intl.NumberFormat().format(v) : v;
}
function normalizeNumbers(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === "" || v == null) {
      out[k] = null;
      continue;
    }
    const n = Number(v);
    out[k] = Number.isFinite(n) && String(v).trim() !== "" ? n : v;
  }
  return out;
}

/**
 * Props:
 * - type: "GREENHOUSE" | "POULTRY" | "COWSHED" | ...
 * - orgId?: number
 * - title?: string
 */
export default function FacilityCrudTable({ type, orgId, title }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Toolbar: search & status
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Create/Edit/Delete modal state
  const schema = FACILITY_TYPES[type] || { fields: [], label: type };
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const delFocusRef = useRef(null); // delete modal uchun default fokus

  // Form state (create/edit bir xil)
  const [formName, setFormName] = useState("");
  const [formStatus, setFormStatus] = useState("ACTIVE");
  const [formOrgId, setFormOrgId] = useState(orgId ?? null);
  const [formAttr, setFormAttr] = useState({});

  const resetForm = () => {
    setFormName("");
    setFormStatus("ACTIVE");
    setFormOrgId(orgId ?? null);
    const base = {};
    for (const f of schema.fields) base[f.key] = "";
    setFormAttr(base);
  };

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const data = await listFacilities({
        types: [type],
        orgId,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        q: search || undefined,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr(e?.message || "Yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, orgId, statusFilter, search]);

  // Klient tomonda “sug‘urta” filtrlash
  const filteredRows = useMemo(() => {
    let out = rows;
    if (statusFilter !== "ALL") {
      out = out.filter((r) => (r.status || "") === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      out = out.filter((r) => {
        const a = pickAttr(r);
        return (
          (r.name || "").toLowerCase().includes(q) ||
          (r.orgName || "").toLowerCase().includes(q) ||
          (r.type || "").toLowerCase().includes(q) ||
          Object.entries(a || {}).some(([k, v]) =>
            String(v ?? "")
              .toLowerCase()
              .includes(q)
          )
        );
      });
    }
    return out;
  }, [rows, statusFilter, search]);

  // Dinamik atribut ustunlari
  const attrKeysOrdered = useMemo(() => {
    const present = new Set();
    for (const r of filteredRows) {
      const a = pickAttr(r);
      if (a && typeof a === "object") {
        Object.keys(a).forEach((k) => present.add(k));
      }
    }
    const schemaKeys = (schema.fields || []).map((f) => f.key);
    const inSchema = schemaKeys.filter((k) => present.has(k));
    const notInSchema = [...present]
      .filter((k) => !schemaKeys.includes(k))
      .sort();
    return [...inSchema, ...notInSchema];
  }, [filteredRows, schema.fields]);

  const labelByKey = useMemo(() => {
    const obj = {};
    for (const f of schema.fields || []) obj[f.key] = f.label;
    return obj;
  }, [schema.fields]);

  const suffixByKey = useMemo(() => {
    const obj = {};
    for (const f of schema.fields || []) obj[f.key] = f.suffix;
    return obj;
  }, [schema.fields]);

  // Create
  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };
  const submitCreate = async () => {
    try {
      await createFacility({
        name: formName.trim(),
        type,
        status: formStatus,
        orgId: formOrgId,
        details: normalizeNumbers(formAttr),
      });
      setCreateOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      alert(e?.data?.message || "Saqlashda xatolik");
    }
  };

  // Edit
  const openEdit = (row) => {
    setEditRow(row);
    setFormName(row?.name || "");
    setFormStatus(row?.status || "ACTIVE");
    setFormOrgId(row?.orgId ?? orgId ?? null);

    const base = {};
    for (const f of schema.fields) base[f.key] = "";
    const a = pickAttr(row) || {};
    const merged = { ...base };
    for (const [k, v] of Object.entries(a)) merged[k] = v ?? "";
    setFormAttr(merged);
  };
  const submitEdit = async () => {
    if (!editRow) return;
    try {
      await patchFacility(editRow.id, {
        name: formName.trim(),
        status: formStatus,
        orgId: formOrgId,
        details: normalizeNumbers(formAttr),
      });
      setEditRow(null);
      await load();
    } catch (e) {
      console.error(e);
      alert(e?.data?.message || "Saqlashda xatolik");
    }
  };

  // Delete → modal confirm
  const confirmDelete = async () => {
    if (!deleteRow) return;
    try {
      await deleteFacility(deleteRow.id);
      setDeleteRow(null);
      await load();
    } catch (e) {
      console.error(e);
      alert(e?.data?.message || "O‘chirishda xatolik");
    }
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatusFilter("ALL");
  };

  const colSpan = 5 + attrKeysOrdered.length; // ID, Nom, Bo‘lim, Status, ...attrs..., Amallar

  return (
    <div className={s.root}>
      {/* ===== Toolbar ===== */}
      <div className={s.toolbar}>
        <div className={s.titleWrap}>
          <h2 className={s.title}>
            {title ||
              (schema.label ? `${schema.label} ro‘yxati` : "Inshootlar")}
          </h2>
          <span className={s.count}>
            {loading ? "Yuklanmoqda…" : `${filteredRows.length} ta`}
          </span>
        </div>

        <div className={s.controls}>
          {/* Qidirish */}
          <div className={s.search}>
            <input
              className={s.searchInput}
              placeholder="Qidirish (nom, org, atribut)…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setSearch(searchInput)}
            />
            <span className={s.searchIcon}>🔎</span>
            {searchInput && (
              <button
                className={s.clearBtn}
                aria-label="Tozalash"
                onClick={clearFilters}
              >
                ×
              </button>
            )}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={s.select}
          >
            <option value="ALL">Barchasi</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
          </select>

          <button className={s.btn} onClick={clearFilters}>
            Tozalash
          </button>

          <button className={`${s.btn} ${s.btnPrimary}`} onClick={openCreate}>
            + Yangi
          </button>
        </div>
      </div>

      {err && (
        <div className="error" style={{ marginBottom: 10 }}>
          {err}
        </div>
      )}

      {/* ===== Table ===== */}
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>#ID</th>
              <th>Nom</th>
              <th>Bo‘lim</th>
              <th>Status</th>
              {attrKeysOrdered.map((k) => (
                <th key={k}>
                  {(labelByKey[k] ?? titleFromKey(k)) +
                    (suffixByKey[k] ? ` (${suffixByKey[k]})` : "")}
                </th>
              ))}
              <th className={s.nowrap}>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan}>Yuklanmoqda…</td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan={colSpan}>Ma’lumot yo‘q</td>
              </tr>
            ) : (
              filteredRows.map((r) => {
                const a = pickAttr(r);
                const active = (r.status || "") === "ACTIVE";
                return (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.name}</td>
                    <td>{r.orgName || r.orgId || "—"}</td>
                    <td>
                      <span className={`${s.status} ${active ? s.active : ""}`}>
                        <span className={s.dot} />
                        {r.status || "—"}
                      </span>
                    </td>
                    {attrKeysOrdered.map((k) => (
                      <td key={k}>
                        {a?.[k] === null ||
                        a?.[k] === undefined ||
                        a?.[k] === ""
                          ? "—"
                          : nf(a[k])}
                      </td>
                    ))}
                    <td>
                      <div className={s.actions}>
                        <button className={s.btn} onClick={() => openEdit(r)}>
                          Tahrirlash
                        </button>
                        <button
                          className={`${s.btn} ${s.btnDanger}`}
                          onClick={() => setDeleteRow(r)}
                        >
                          O‘chirish
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ===== CREATE MODAL ===== */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={`${schema.label || type} — yangi yozuv`}
        size="lg"
      >
        <FormFields
          schema={schema}
          formName={formName}
          setFormName={setFormName}
          formStatus={formStatus}
          setFormStatus={setFormStatus}
          formOrgId={formOrgId}
          setFormOrgId={setFormOrgId}
          formAttr={formAttr}
          setFormAttr={setFormAttr}
        />
        <div className={s.actions} style={{ marginTop: 8 }}>
          <button className={s.btn} onClick={() => setCreateOpen(false)}>
            Bekor
          </button>
          <button
            className={`${s.btn} ${s.btnPrimary}`}
            onClick={submitCreate}
            disabled={!formName.trim() || formOrgId == null}
          >
            Saqlash
          </button>
        </div>
      </Modal>

      {/* ===== EDIT MODAL ===== */}
      <Modal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        title={`${schema.label || type} — tahrirlash`}
        size="lg"
      >
        <FormFields
          schema={schema}
          readOnlyType
          formName={formName}
          setFormName={setFormName}
          formStatus={formStatus}
          setFormStatus={setFormStatus}
          formOrgId={formOrgId}
          setFormOrgId={setFormOrgId}
          formAttr={formAttr}
          setFormAttr={setFormAttr}
        />
        <div className={s.actions} style={{ marginTop: 8 }}>
          <button className={s.btn} onClick={() => setEditRow(null)}>
            Bekor
          </button>
          <button
            className={`${s.btn} ${s.btnPrimary}`}
            onClick={submitEdit}
            disabled={!formName.trim() || formOrgId == null}
          >
            Saqlash
          </button>
        </div>
      </Modal>

      {/* ===== DELETE CONFIRM MODAL ===== */}
      <Modal
        open={!!deleteRow}
        onClose={() => setDeleteRow(null)}
        title="O‘chirishni tasdiqlash"
        size="sm"
        initialFocusRef={delFocusRef}
        // preventCloseOnBackdrop={false} // xohlasangiz yoqing
      >
        {deleteRow && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontSize: 14 }}>
              Quyidagi obyektni o‘chirmoqchimisiz?
            </div>
            <div
              style={{
                border: "1px solid var(--fc-border)",
                borderRadius: 12,
                padding: 12,
                display: "grid",
                gap: 4,
              }}
            >
              <div style={{ fontWeight: 700 }}>{deleteRow.name}</div>
              <div style={{ fontSize: 13, opacity: 0.8 }}>
                {FACILITY_TYPES[deleteRow.type]?.label || deleteRow.type} •{" "}
                {deleteRow.orgName || `Org ID: ${deleteRow.orgId ?? "—"}`}
              </div>
            </div>

            <div
              className={s.actions}
              style={{ marginTop: 6, alignItems: "center" }}
            >
              <button className={s.btn} onClick={() => setDeleteRow(null)}>
                Bekor
              </button>
              <button
                ref={delFocusRef}
                className={`${s.btn} ${s.btnDanger}`}
                onClick={confirmDelete}
              >
                O‘chirish
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function FormFields({
  schema,
  readOnlyType = false,
  formName,
  setFormName,
  formStatus,
  setFormStatus,
  formOrgId,
  setFormOrgId,
  formAttr,
  setFormAttr,
}) {
  const onAttr = (k, v) => setFormAttr((s) => ({ ...s, [k]: v }));

  return (
    <div className={s.form}>
      <div className={s.field}>
        <label>Nom *</label>
        <input
          className={s.inputLike}
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="Masalan: Issiqxona #1"
          autoFocus
        />
      </div>

      <div className={s.grid3}>
        <div className={s.field}>
          <label>Tur</label>
          <input
            className={s.inputLike}
            value={schema?.label ?? "—"}
            readOnly={true}
          />
        </div>
        <div className={s.field}>
          <label>Status</label>
          <select
            className={s.inputLike}
            value={formStatus}
            onChange={(e) => setFormStatus(e.target.value)}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
          </select>
        </div>
        <div className={s.field}>
          <label>Bo‘lim (orgId) *</label>
          <input
            className={s.inputLike}
            type="number"
            value={formOrgId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const n = v === "" ? null : Number(v);
              setFormOrgId(Number.isFinite(n) ? n : null);
            }}
            placeholder="Masalan: 1"
          />
        </div>
      </div>

      <hr style={{ opacity: 0.25 }} />

      <div style={{ fontWeight: 700, marginBottom: 6 }}>Maxsus maydonlar</div>
      {(schema.fields || []).map((f) => (
        <div key={f.key} className={s.field}>
          <label>
            {f.label}
            {f.suffix ? ` (${f.suffix})` : ""}
          </label>
          {f.type === "text" ? (
            <input
              className={s.inputLike}
              value={formAttr[f.key] ?? ""}
              onChange={(e) => onAttr(f.key, e.target.value)}
            />
          ) : (
            <input
              className={s.inputLike}
              type="number"
              value={formAttr[f.key] ?? ""}
              onChange={(e) => onAttr(f.key, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
