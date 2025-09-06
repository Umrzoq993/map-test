// src/components/facilities/FacilityCrudTable.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import Modal from "../ui/Modal";
import {
  listFacilitiesPage,
  createFacility,
  patchFacility,
  deleteFacility,
} from "../../api/facilities";
import { toast } from "react-toastify";
import { listOrgsPage } from "../../api/org";
import { FACILITY_TYPES } from "../../data/facilityTypes";
import s from "./FacilityCrudTable.module.scss";

/* -------------------------- Validation helpers -------------------------- */
function validateByRules(schema, { name, orgId, attributes }) {
  const errors = { name: null, orgId: null, attr: {} };

  if (!name || !name.trim()) errors.name = "Nomi majburiy";
  if (orgId == null) errors.orgId = "Tashkilot tanlanishi shart";

  for (const f of schema.fields || []) {
    const v = attributes?.[f.key];
    const r = f.rules || {};
    if (r.required && (v === null || v === undefined || v === "")) {
      errors.attr[f.key] = "Majburiy maydon";
      continue;
    }
    if (v !== null && v !== undefined && v !== "") {
      if (f.type === "number") {
        const n = Number(v);
        if (!Number.isFinite(n)) {
          errors.attr[f.key] = "Raqam kiritilishi kerak";
          continue;
        }
        if (r.integer && !Number.isInteger(n)) {
          errors.attr[f.key] = "Butun son bo‘lishi kerak";
          continue;
        }
        if (typeof r.min === "number" && n < r.min) {
          errors.attr[f.key] = `Qiymat ${r.min} dan kichik bo‘lmasin`;
          continue;
        }
        if (typeof r.max === "number" && n > r.max) {
          errors.attr[f.key] = `Qiymat ${r.max} dan katta bo‘lmasin`;
          continue;
        }
      } else if (f.type === "text") {
        const sv = String(v);
        if (typeof r.maxLength === "number" && sv.length > r.maxLength) {
          errors.attr[f.key] = `Maksimal ${r.maxLength} ta belgi`;
          continue;
        }
      }
    }
  }
  return errors;
}
function hasErrors(err) {
  if (!err) return false;
  if (err.name || err.orgId) return true;
  return Object.values(err.attr || {}).some(Boolean);
}

/* ------------------------------ Utilities ------------------------------ */
function toNumberOrNull(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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
function coord(v) {
  return typeof v === "number" ? v.toFixed(6) : v ?? "—";
}

/* ------------------------- Lightweight org fetch ------------------------ */
/** Backend: GET /api/orgs => PageResponse with { content: [{id,name,...}] } */
async function fetchOrgOptions() {
  try {
    const data = await listOrgsPage({
      page: 0,
      size: 1000,
      sort: ["name,asc"],
    });
    const items = Array.isArray(data?.content) ? data.content : [];
    return items.map((x) => ({
      value: x.id ?? x?.orgId ?? x?.key,
      label: x.name ?? x?.title ?? `#${x.id}`,
    }));
  } catch {
    return [];
  }
}

/* ============================ Main component ============================ */
export default function FacilityCrudTable({ type, title }) {
  const schema = useMemo(() => {
    return (
      FACILITY_TYPES[type] || {
        label: FACILITY_TYPES?.[type]?.label || String(type),
        fields: [],
      }
    );
  }, [type]);

  // Filters
  const [orgId, setOrgId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | ACTIVE | INACTIVE
  const [search, setSearch] = useState("");

  // Server-side pagination
  const [rows, setRows] = useState([]);
  const [pageIdx, setPageIdx] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Orgs
  const [orgOptions, setOrgOptions] = useState([]);
  useEffect(() => {
    let alive = true;
    fetchOrgOptions().then((opts) => alive && setOrgOptions(opts));
    return () => (alive = false);
  }, []);

  const debouncedSearch = useDebouncedValue(search, 400);

  // Load rows
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const pageRes = await listFacilitiesPage({
          type,
          orgId,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          q: debouncedSearch || undefined,
          page: pageIdx,
          size: pageSize,
          sort: "createdAt,desc",
        });
        if (!alive) return;
        setRows(Array.isArray(pageRes?.content) ? pageRes.content : []);
        setTotal(pageRes?.totalElements ?? 0);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => (alive = false);
  }, [type, orgId, statusFilter, debouncedSearch, pageIdx, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setPageIdx(0);
  }, [type, orgId, statusFilter, debouncedSearch]);

  /* --------------------- Derived: attr columns & labels --------------------- */
  const attrKeysOrdered = useMemo(() => {
    const schemaKeys = (schema.fields || []).map((f) => f.key);
    const present = new Set();
    for (const r of rows) {
      const a = r?.attributes;
      if (a && typeof a === "object")
        Object.keys(a).forEach((k) => present.add(k));
    }
    const extras = [...present].filter((k) => !schemaKeys.includes(k)).sort();
    return [...schemaKeys, ...extras];
  }, [rows, schema.fields]);

  const labelByKey = useMemo(() => {
    const m = {};
    for (const f of schema.fields || []) m[f.key] = f.label;
    return m;
  }, [schema.fields]);

  const suffixByKey = useMemo(() => {
    const m = {};
    for (const f of schema.fields || []) m[f.key] = f.suffix || null;
    return m;
  }, [schema.fields]);

  /* --------------------------- Create / Edit modals --------------------------- */
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(null); // current row

  // Shared form state
  const [formName, setFormName] = useState("");
  const [formOrgId, setFormOrgId] = useState(null);
  const [formStatus, setFormStatus] = useState("ACTIVE");
  const [formAttr, setFormAttr] = useState({});
  const [formErrors, setFormErrors] = useState({
    name: null,
    orgId: null,
    attr: {},
  });
  const [saving, setSaving] = useState(false);

  // Focus control
  const nameInputRef = useRef(null);

  useEffect(() => {
    setFormErrors(
      validateByRules(schema, {
        name: formName,
        orgId: formOrgId,
        attributes: formAttr,
      })
    );
  }, [schema, formName, formOrgId, formAttr]);

  const resetForm = () => {
    setFormErrors({ name: null, orgId: null, attr: {} });
    setFormName("");
    setFormOrgId(null);
    setFormStatus("ACTIVE");
    const init = {};
    for (const f of schema.fields || []) init[f.key] = null;
    setFormAttr(init);
  };

  // Open create
  const onOpenCreate = () => {
    resetForm();
    if (orgId != null) setFormOrgId(orgId);
    setOpenCreate(true);
  };

  // Open edit
  const onOpenEdit = (row) => {
    resetForm();
    setEditing(row);
    setFormName(row?.name ?? "");
    setFormOrgId(row?.orgId ?? null);
    setFormStatus(row?.status ?? "ACTIVE");
    const init = {};
    for (const f of schema.fields || [])
      init[f.key] = row?.attributes?.[f.key] ?? null;
    setFormAttr(init);
    setOpenEdit(true);
  };

  // Submit create
  const submitCreate = async () => {
    const errs = validateByRules(schema, {
      name: formName,
      orgId: formOrgId,
      attributes: formAttr,
    });
    setFormErrors(errs);
    if (hasErrors(errs)) return;

    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        type,
        status: formStatus,
        orgId: formOrgId,
        attributes: normalizeNumbers(formAttr),
        lat: null,
        lng: null,
        geometry: null,
      };
      // Optimistic: vaqtinchalik ID
      const tempId = "temp-" + Date.now();
      const optimisticRow = {
        id: tempId,
        orgId: formOrgId,
        orgName: orgOptions.find((o) => o.value === formOrgId)?.label || null,
        name: payload.name,
        type,
        status: formStatus,
        attributes: payload.attributes,
        lat: null,
        lng: null,
        geometry: null,
        __optimistic: true,
      };
      setRows((r) => [optimisticRow, ...r]);
      setTotal((t) => t + 1);
      setOpenCreate(false);
      // Server
      const created = await createFacility(payload);
      setRows((r) =>
        r.map((row) => (row.id === tempId ? { ...created } : row))
      );
      toast.success("Obyekt yaratildi");
    } finally {
      setSaving(false);
    }
  };

  // Submit edit
  const submitEdit = async () => {
    const errs = validateByRules(schema, {
      name: formName,
      orgId: formOrgId,
      attributes: formAttr,
    });
    setFormErrors(errs);
    if (hasErrors(errs)) return;

    setSaving(true);
    try {
      const patch = {
        name: formName.trim(),
        status: formStatus,
        orgId: formOrgId,
        attributes: normalizeNumbers(formAttr),
      };
      const prev = rows.find((r) => r.id === editing.id);
      setRows((r) =>
        r.map((row) => (row.id === editing.id ? { ...row, ...patch } : row))
      );
      setOpenEdit(false);
      await patchFacility(editing.id, patch);
      toast.success("O‘zgartirildi");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (row) => {
    if (!window.confirm(`O‘chirishni tasdiqlaysizmi?\n“${row?.name}”`)) return;
    const prevRows = rows;
    setRows((r) => r.filter((x) => x.id !== row.id));
    setTotal((t) => Math.max(0, t - 1));
    try {
      await deleteFacility(row.id);
      toast.success("O‘chirildi");
    } catch (e) {
      // Rollback
      setRows(prevRows);
      setTotal(prevRows.length);
      toast.error("O‘chirishda xatolik");
    }
  };

  /* ------------------------------- Rendering ------------------------------- */
  // Nomi, Tashkilot, Status, Lat, Lng, ...Atributlar..., Amallar
  const baseCols = 5; // name/org/status/lat/lng
  const colSpan = baseCols + attrKeysOrdered.length + 1; // + actions

  return (
    <div className={s.wrapper}>
      {/* Header */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <h2 className={s.title}>
            {title || schema.label} <span className={s.typePill}>{type}</span>
          </h2>
          <div className={s.filters}>
            {/* Org select */}
            <div className={s.fItem}>
              <label className={s.lbl}>Tashkilot</label>
              <select
                className={s.selectLike}
                value={orgId ?? ""}
                onChange={(e) =>
                  setOrgId(e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">— Barchasi —</option>
                {orgOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Holat */}
            <div className={s.fItem}>
              <label className={s.lbl}>Holat</label>
              <select
                className={s.selectLike}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">ALL</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            {/* Search */}
            <div className={s.fItem + " " + s.grow}>
              <label className={s.lbl}>Qidiruv</label>
              <input
                className={s.inputLike}
                placeholder="Nomi bo‘yicha..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className={s.headerRight}>
          <button className={s.btnPrimary} onClick={onOpenCreate}>
            + Yangi
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Nomi</th>
              <th>Tashkilot</th>
              <th>Holat</th>
              <th>Geografik kenglik</th>
              <th>Geografik uzunlik</th>
              {attrKeysOrdered.map((k) => (
                <th key={k}>
                  {labelByKey[k] || k}
                  {suffixByKey[k] ? ` (${suffixByKey[k]})` : ""}
                </th>
              ))}
              <th style={{ width: 140, textAlign: "right" }}>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className={s.centerMuted}>
                  Yuklanmoqda...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className={s.centerMuted}>
                  Ma’lumot topilmadi
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const active = r.status === "ACTIVE";
                const a = r.attributes || {};
                return (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.orgName || (r.orgId ? `#${r.orgId}` : "—")}</td>
                    <td>
                      <span className={active ? s.badgeGreen : s.badgeGray}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{coord(r.lat)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{coord(r.lng)}</td>

                    {attrKeysOrdered.map((k) => (
                      <td key={k}>
                        {a?.[k] === null ||
                        a?.[k] === undefined ||
                        a?.[k] === ""
                          ? "—"
                          : a[k]}
                      </td>
                    ))}

                    <td style={{ textAlign: "right" }}>
                      <button className={s.btn} onClick={() => onOpenEdit(r)}>
                        Tahrirlash
                      </button>
                      <button
                        className={s.btnDanger}
                        onClick={() => onDelete(r)}
                      >
                        O‘chirish
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className={s.pager}>
        <div className={s.pagerInfo}>
          {total > 0 ? (
            <>
              <b>{pageIdx * pageSize + 1}</b>–
              <b>{Math.min((pageIdx + 1) * pageSize, total)}</b> / {total}
            </>
          ) : (
            "0 / 0"
          )}
        </div>
        <div className={s.pagerCtrls}>
          <button
            className={s.btn}
            disabled={pageIdx === 0}
            onClick={() => setPageIdx((p) => Math.max(0, p - 1))}
          >
            ‹ Oldingi
          </button>
          <button
            className={s.btn}
            disabled={(pageIdx + 1) * pageSize >= total}
            onClick={() => setPageIdx((p) => p + 1)}
          >
            Keyingi ›
          </button>
          <select
            className={s.pageSize}
            value={pageSize}
            onChange={(e) => {
              setPageIdx(0);
              setPageSize(Number(e.target.value));
            }}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Create modal */}
      <Modal
        open={openCreate}
        onClose={() => !saving && setOpenCreate(false)}
        title={`Yangi obyekt – ${schema.label}`}
        initialFocusRef={nameInputRef}
        preventCloseOnBackdrop={saving}
        disableEscapeClose={saving}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitCreate();
          }}
        >
          <FormFields
            schema={schema}
            errors={formErrors}
            formName={formName}
            setFormName={setFormName}
            formStatus={formStatus}
            setFormStatus={setFormStatus}
            formOrgId={formOrgId}
            setFormOrgId={setFormOrgId}
            orgOptions={orgOptions}
            formAttr={formAttr}
            setFormAttr={setFormAttr}
            nameRef={nameInputRef}
          />
          <div className={s.modalFooter}>
            <button
              className={s.btn}
              onClick={() => setOpenCreate(false)}
              type="button"
            >
              Bekor qilish
            </button>
            <button
              className={s.btnPrimary}
              type="submit"
              disabled={
                !formName.trim() ||
                formOrgId == null ||
                hasErrors(formErrors) ||
                saving
              }
            >
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={openEdit}
        onClose={() => !saving && setOpenEdit(false)}
        title={`Tahrirlash – ${schema.label}`}
        initialFocusRef={nameInputRef}
        preventCloseOnBackdrop={saving}
        disableEscapeClose={saving}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitEdit();
          }}
        >
          <FormFields
            schema={schema}
            errors={formErrors}
            formName={formName}
            setFormName={setFormName}
            formStatus={formStatus}
            setFormStatus={setFormStatus}
            formOrgId={formOrgId}
            setFormOrgId={setFormOrgId}
            orgOptions={orgOptions}
            formAttr={formAttr}
            setFormAttr={setFormAttr}
            nameRef={nameInputRef}
          />
          <div className={s.modalFooter}>
            <button
              className={s.btn}
              onClick={() => setOpenEdit(false)}
              type="button"
            >
              Bekor qilish
            </button>
            <button
              className={s.btnPrimary}
              type="submit"
              disabled={
                !formName.trim() ||
                formOrgId == null ||
                hasErrors(formErrors) ||
                saving
              }
            >
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ---------------------------- Sub components ---------------------------- */
function FormFields({
  schema,
  errors,
  formName,
  setFormName,
  formStatus,
  setFormStatus,
  formOrgId,
  setFormOrgId,
  orgOptions = [],
  formAttr,
  setFormAttr,
  nameRef,
}) {
  const onAttr = (k, v) => setFormAttr((p) => ({ ...p, [k]: v }));

  return (
    <div className={s.formGrid}>
      {/* Name */}
      <div className={s.formRow}>
        <label className={s.lbl}>Nomi</label>
        <input
          ref={nameRef}
          className={s.inputLike}
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder={schema?.label || "Nomi"}
        />
        {errors?.name && <div className={s.err}>{errors.name}</div>}
      </div>

      {/* Status */}
      <div className={s.formRow}>
        <label className={s.lbl}>Status</label>
        <select
          className={s.selectLike}
          value={formStatus}
          onChange={(e) => setFormStatus(e.target.value)}
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </div>

      {/* Organization */}
      <div className={s.formRow}>
        <label className={s.lbl}>Tashkilot</label>
        <select
          className={s.selectLike}
          value={formOrgId ?? ""}
          onChange={(e) =>
            setFormOrgId(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">— Tanlang —</option>
          {orgOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {errors?.orgId && <div className={s.err}>{errors.orgId}</div>}
      </div>

      {/* Dynamic attributes */}
      {schema?.fields?.length ? (
        <div className={s.attrsGrid}>
          {schema.fields.map((f) => (
            <div key={f.key} className={s.formRow}>
              <label className={s.lbl}>
                {f.label}
                {f.rules?.required ? " *" : ""}
                {f.suffix ? (
                  <span className={s.muted}> ({f.suffix})</span>
                ) : null}
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
                  onChange={(e) =>
                    onAttr(f.key, toNumberOrNull(e.target.value))
                  }
                />
              )}
              {errors?.attr?.[f.key] && (
                <div className={s.err}>{errors.attr[f.key]}</div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
