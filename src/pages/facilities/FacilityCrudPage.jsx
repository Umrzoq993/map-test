// src/pages/facilities/FacilityCrudPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  listFacilities,
  createFacility,
  patchFacility,
  deleteFacility,
} from "../../api/facilities";
import { getOrgTree } from "../../api/org";
import { centroidOfGeometry } from "../../utils/geo";

function flattenOrg(tree, depth = 0, out = []) {
  if (!Array.isArray(tree)) return out;
  for (const n of tree) {
    out.push({ id: Number(n.key), name: n.title, depth });
    if (n.children?.length) flattenOrg(n.children, depth + 1, out);
  }
  return out;
}

function numberOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * props:
 * - title: string
 * - type: FacilityType (backend enum: GREENHOUSE, POULTRY, COWSHED, ...)
 * - columns: [{key, label, input, unit?}]
 *   input: "text"|"number"|"select"
 *   selectOptions?: [{value,label}]
 *   key — attributes ichida saqlanadi
 * - nameLabel?: string
 * - allowGeometry?: boolean (default false)
 */
export default function FacilityCrudPage({
  title,
  type,
  columns,
  nameLabel = "Nomi",
  allowGeometry = false,
}) {
  const [loading, setLoading] = useState(false);
  const [orgs, setOrgs] = useState([]);
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null); // record yoki null
  const [form, setForm] = useState({
    orgId: "",
    name: "",
    status: "ACTIVE",
    attributes: {},
    geometry: null,
  });

  const orgOptions = useMemo(() => {
    return flattenOrg(orgs).map((o) => ({
      value: o.id,
      label: `${" ".repeat(o.depth)}${o.name}`,
    }));
  }, [orgs]);

  async function loadAll() {
    setLoading(true);
    try {
      const [tree, list] = await Promise.all([
        getOrgTree(),
        listFacilities({ types: [type], q }),
      ]);
      setOrgs(tree);
      setItems(list || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(); // initial
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(loadAll, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function resetForm() {
    setEditing(null);
    setForm({
      orgId: "",
      name: "",
      status: "ACTIVE",
      attributes: {},
      geometry: null,
    });
  }

  function startEdit(rec) {
    setEditing(rec);
    setForm({
      orgId: rec.orgId ?? "",
      name: rec.name ?? "",
      status: rec.status ?? "ACTIVE",
      attributes: { ...(rec.attributes || {}) },
      geometry: rec.geometry ?? null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!form.orgId) {
      alert("Bo'linma (Org) tanlang.");
      return;
    }
    if (!form.name?.trim()) {
      alert(`${nameLabel} bo'sh bo'lmasin.`);
      return;
    }

    const payload = {
      orgId: Number(form.orgId),
      name: form.name.trim(),
      type,
      status: form.status,
      attributes: prepareAttributes(columns, form.attributes),
      geometry: allowGeometry ? form.geometry || null : null,
    };

    // Geo bo'lmasa latitude/longitude ni marker centroid’dan olish (ixtiyoriy)
    if (!payload.geometry && editing?.geometry) {
      const c = centroidOfGeometry(editing.geometry);
      if (c) {
        payload.lat = c.lat;
        payload.lng = c.lng;
      }
    }

    setLoading(true);
    try {
      if (editing) {
        await patchFacility(editing.id, payload);
      } else {
        await createFacility(payload);
      }
      resetForm();
      await loadAll();
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id) {
    if (!confirm("Rostdan ham o‘chirasizmi?")) return;
    setLoading(true);
    try {
      await deleteFacility(id);
      await loadAll();
    } finally {
      setLoading(false);
    }
  }

  const orgNameById = useMemo(() => {
    const f = flattenOrg(orgs);
    const map = new Map(f.map((o) => [o.id, o.name]));
    return (id) => map.get(id) || id;
  }, [orgs]);

  return (
    <div className="org-table-page">
      <div className="page-header">
        <h2>{title}</h2>
        <div className="muted">
          To‘liq CRUD: qo‘shish, tahrirlash, o‘chirish
        </div>
      </div>

      <div className="org-table-wrap">
        {/* Form card */}
        <div className="card">
          <div className="form-grid">
            <form onSubmit={onSubmit}>
              <div className="grid3">
                <div className="field">
                  <label>Bo‘linma (Org)</label>
                  <select
                    value={form.orgId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, orgId: e.target.value }))
                    }
                  >
                    <option value="">— Tanlang —</option>
                    {orgOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>{nameLabel}</label>
                  <input
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder={`${nameLabel}…`}
                  />
                </div>
                <div className="field">
                  <label>Holati</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                  </select>
                </div>
              </div>

              {/* Dynamic attributes */}
              <div className="grid3" style={{ marginTop: 10 }}>
                {columns.map((col) => (
                  <div className="field" key={col.key}>
                    <label>
                      {col.label} {col.unit ? `(${col.unit})` : ""}
                    </label>
                    {renderInput(col, form.attributes?.[col.key], (val) =>
                      setForm((f) => ({
                        ...f,
                        attributes: { ...(f.attributes || {}), [col.key]: val },
                      }))
                    )}
                  </div>
                ))}
              </div>

              {/* Geometry (optional) */}
              {allowGeometry && (
                <div className="field" style={{ marginTop: 12 }}>
                  <label>GeoJSON (ixtiyoriy)</label>
                  <textarea
                    style={{ width: "100%", height: 140 }}
                    value={
                      form.geometry
                        ? JSON.stringify(form.geometry, null, 2)
                        : ""
                    }
                    onChange={(e) => {
                      try {
                        const v = e.target.value.trim();
                        setForm((f) => ({
                          ...f,
                          geometry: v ? JSON.parse(v) : null,
                        }));
                      } catch {
                        // noop
                      }
                    }}
                    placeholder='{"type":"Point","coordinates":[69.27,41.31]}'
                  />
                  <div className="hint">
                    GeoJSON Geometry: Point / Polygon / MultiPolygon
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button
                  className="btn primary"
                  type="submit"
                  disabled={loading}
                >
                  {editing ? "Saqlash" : "Qo‘shish"}
                </button>
                {editing && (
                  <button
                    type="button"
                    className="btn"
                    onClick={resetForm}
                    disabled={loading}
                  >
                    Bekor qilish
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Toolbar */}
        <div className="toolbar" style={{ marginTop: 12 }}>
          <input
            className="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Qidirish (nomi bo‘yicha)…"
          />
          <div className="spacer" />
          <button className="btn" onClick={loadAll} disabled={loading}>
            Yangilash
          </button>
        </div>

        {/* Table */}
        <div className="table-card">
          <table className="org-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Bo‘linma</th>
                <th>{nameLabel}</th>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td className="empty" colSpan={4 + columns.length}>
                    Ma’lumot topilmadi
                  </td>
                </tr>
              )}
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="num">{it.id}</td>
                  <td className="muted">{orgNameById(it.orgId)}</td>
                  <td>{it.name}</td>
                  {columns.map((c) => (
                    <td key={c.key} className="num">
                      {formatAttr(it.attributes?.[c.key], c)}
                    </td>
                  ))}
                  <td className="actions">
                    <button className="btn" onClick={() => startEdit(it)}>
                      Tahrirlash
                    </button>
                    <button
                      className="btn danger"
                      onClick={() => onDelete(it.id)}
                    >
                      O‘chirish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="overlay">
            <div className="spinner" />
          </div>
        )}
      </div>
    </div>
  );
}

function renderInput(col, value, onChange) {
  if (col.input === "select") {
    return (
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Tanlang —</option>
        {(col.selectOptions || []).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }
  if (col.input === "number") {
    return (
      <input
        type="number"
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) => onChange(numberOrNull(e.target.value))}
        placeholder="0"
      />
    );
  }
  return (
    <input
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={col.label}
    />
  );
}

function formatAttr(v, col) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number")
    return new Intl.NumberFormat().format(v) + (col.unit ? ` ${col.unit}` : "");
  return String(v);
}

function prepareAttributes(cols, attrs) {
  const out = {};
  for (const c of cols) {
    let v = attrs?.[c.key];
    if (c.input === "number") v = numberOrNull(v);
    if (v !== null && v !== undefined && v !== "") out[c.key] = v;
  }
  return out;
}
