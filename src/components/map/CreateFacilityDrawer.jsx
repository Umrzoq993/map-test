// src/components/map/CreateFacilityDrawer.jsx
import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import { createFacility } from "../../api/facilities";
import { centroidOfGeometry, areaOfGeometryM2 } from "../../utils/geo";
import { listOrgsPage } from "../../api/org";
import * as FT from "../../data/facilityTypes";
const FACILITY_TYPES = FT.FACILITY_TYPES;

/* -------------------------- Validation helpers -------------------------- */
function validateByRules(schema, { name, attributes }) {
  const errors = { name: null, attr: {} };
  if (!name || !name.trim()) errors.name = "Nomi majburiy";
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
  if (err.name) return true;
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

/* ------------------------------- Component ------------------------------ */
/**
 * Props:
 *  - open: boolean
 *  - onClose: () => void
 *  - onSaved: () => void
 *  - geometry: GeoJSON Geometry (marker/polygon/rectangle)
 *  - center: {lat, lng} | null  (marker yoki chizilgan shakl markazi)
 *  - selectedOrgId: number | null (chapdagi tree’dan tanlangan org)
 */
export default function CreateFacilityDrawer({
  open,
  onClose,
  onSaved,
  geometry,
  center,
  selectedOrgId,
}) {
  // type tanlovi
  const typeKeys = Object.keys(FACILITY_TYPES || {});
  const [type, setType] = useState(typeKeys[0] || "OTHER");
  useEffect(() => {
    if (open && !FACILITY_TYPES?.[type]) {
      setType(typeKeys[0] || "OTHER");
    }
  }, [open]); // eslint-disable-line

  const schema =
    FACILITY_TYPES && FACILITY_TYPES[type]
      ? FACILITY_TYPES[type]
      : {
          label: FT.getFacilityTypeLabel
            ? FT.getFacilityTypeLabel(type)
            : String(type),
          fields: [],
        };

  // form states
  const [name, setName] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [orgId, setOrgId] = useState(selectedOrgId ?? null);
  const [attr, setAttr] = useState({});
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({ name: null, attr: {} });

  // org options
  const [orgOptions, setOrgOptions] = useState([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listOrgsPage({
          page: 0,
          size: 1000,
          sort: ["name,asc"],
        });
        const items = Array.isArray(data?.content) ? data.content : [];
        const opts = items.map((x) => ({ value: x.id, label: x.name }));
        if (alive) setOrgOptions(opts);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  // reset on open/close
  useEffect(() => {
    if (!open) return;
    setName("");
    setStatus("ACTIVE");
    setOrgId(selectedOrgId ?? null);
    const init = {};
    for (const f of schema.fields || []) init[f.key] = null;
    setAttr(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // rebuild attributes form when type changes
  useEffect(() => {
    const init = {};
    for (const f of schema.fields || []) init[f.key] = null;
    setAttr(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // validation live
  useEffect(() => {
    setErrors(validateByRules(schema, { name, attributes: attr }));
  }, [schema, name, attr]);

  const onAttr = (k, v) => setAttr((p) => ({ ...p, [k]: v }));

  // center fallback from geometry
  const centerLL = useMemo(() => {
    if (center?.lat && center?.lng) return center;
    try {
      const c = centroidOfGeometry(geometry); // { lat, lng } yoki null
      if (c && Number.isFinite(c.lat) && Number.isFinite(c.lng))
        return { lat: c.lat, lng: c.lng };
    } catch {}
    return { lat: null, lng: null };
  }, [center, geometry]);

  /* ---------- YANGI: maydon (m² va ga) avtomatik hisoblash ---------- */
  const calcAreaM2 = useMemo(() => {
    try {
      const a = areaOfGeometryM2(geometry);
      return Number.isFinite(a) ? a : null;
    } catch {
      return null;
    }
  }, [geometry]);
  const calcAreaHa = useMemo(
    () => (calcAreaM2 != null ? calcAreaM2 / 10000 : null),
    [calcAreaM2]
  );

  // Schema’da mos maydon maydoni bo‘lsa — avtomatik to‘ldiramiz.
  // - 'areaM2' mavjud bo‘lsa → m² bilan
  // - 'totalAreaHa' mavjud bo‘lsa → ga bilan
  useEffect(() => {
    if (!open) return;
    if (calcAreaM2 == null) return;
    const fields = schema?.fields || [];

    const hasAreaM2 = fields.some((f) => f.key === "areaM2");
    const hasAreaHa = fields.some((f) => f.key === "totalAreaHa");

    if (!hasAreaM2 && !hasAreaHa) return;

    setAttr((prev) => {
      const next = { ...prev };
      let changed = false;

      if (hasAreaM2 && (prev.areaM2 == null || prev.areaM2 === "")) {
        next.areaM2 = Math.round(calcAreaM2); // butun m² (yaqinlashtirilgan)
        changed = true;
      }
      if (hasAreaHa && (prev.totalAreaHa == null || prev.totalAreaHa === "")) {
        const ha = calcAreaM2 / 10000;
        // 4 ta kasr joyi bilan (yetarlicha aniq)
        next.totalAreaHa = Number(ha.toFixed(4));
        changed = true;
      }

      return changed ? next : prev;
    });
  }, [open, calcAreaM2, schema?.fields, type]);

  const canSave =
    open && name.trim() && orgId != null && !hasErrors(errors) && geometry;

  const onSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSave) return;
    setSaving(true);
    try {
      await createFacility({
        name: name.trim(),
        type,
        status,
        orgId,
        attributes: normalizeNumbers(attr),
        lat: centerLL.lat,
        lng: centerLL.lng,
        geometry,
      });
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      alert("Saqlashda xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  };

  // Format helpers (faqat ko‘rsatish uchun)
  const fmtM2 =
    calcAreaM2 != null ? Math.round(calcAreaM2).toLocaleString() : "—";
  const fmtHa =
    calcAreaHa != null ? Number(calcAreaHa.toFixed(4)).toLocaleString() : "—";

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose?.()}
      title="Yangi obyekt qo‘shish"
      size="xl"
      preventCloseOnBackdrop={saving}
      disableEscapeClose={saving}
    >
      <form
        onSubmit={onSubmit}
        className="form-grid"
        style={{ display: "grid", gap: 12 }}
      >
        {/* Type */}
        <div style={{ display: "grid", gap: 6 }}>
          <label className="lbl">Turi</label>
          <select
            className="selectLike"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {typeKeys.map((k) => (
              <option key={k} value={k}>
                {FT.getFacilityTypeLabel ? FT.getFacilityTypeLabel(k) : k}
              </option>
            ))}
          </select>
        </div>

        {/* Name */}
        <div style={{ display: "grid", gap: 6 }}>
          <label className="lbl">Nomi</label>
          <input
            className="inputLike"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={schema?.label || "Nomi"}
            autoFocus
          />
          {errors?.name && <div className="err">{errors.name}</div>}
        </div>

        {/* Status */}
        <div style={{ display: "grid", gap: 6 }}>
          <label className="lbl">Status</label>
          <select
            className="selectLike"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>

        {/* Organization */}
        <div style={{ display: "grid", gap: 6 }}>
          <label className="lbl">Tashkilot</label>
          <select
            className="selectLike"
            value={orgId ?? ""}
            onChange={(e) =>
              setOrgId(e.target.value ? Number(e.target.value) : null)
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

        {/* Dynamic attributes */}
        {schema?.fields?.length ? (
          <div className="attrsGrid">
            {schema.fields.map((f) => (
              <div key={f.key} style={{ display: "grid", gap: 6 }}>
                <label className="lbl">
                  {f.label}
                  {f.rules?.required ? " *" : ""}
                  {f.suffix ? (
                    <span className="muted"> ({f.suffix})</span>
                  ) : null}
                </label>
                {f.type === "text" ? (
                  <input
                    className="inputLike"
                    value={attr[f.key] ?? ""}
                    onChange={(e) => onAttr(f.key, e.target.value)}
                  />
                ) : (
                  <input
                    className="inputLike"
                    type="number"
                    value={attr[f.key] ?? ""}
                    onChange={(e) =>
                      onAttr(f.key, toNumberOrNull(e.target.value))
                    }
                  />
                )}
                {errors?.attr?.[f.key] && (
                  <div className="err">{errors.attr[f.key]}</div>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {/* YANGI: Hisoblangan maydon preview (readonly) */}
        <div style={{ display: "grid", gap: 6 }}>
          <label className="lbl">Hisoblangan maydon (readonly)</label>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input
              className="inputLike"
              readOnly
              value={fmtM2}
              placeholder="m²"
              title="m²"
            />
            <input
              className="inputLike"
              readOnly
              value={fmtHa}
              placeholder="ga"
              title="ga"
            />
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            Poligon/to‘rtburchak geometriyasi chizilganda avtomatik hisoblanadi.
          </div>
        </div>

        {/* Lat/Lng preview (read-only) */}
        <div style={{ display: "grid", gap: 6 }}>
          <label className="lbl">Markaz (readonly)</label>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <input
              className="inputLike"
              readOnly
              value={centerLL.lat ?? ""}
              placeholder="lat"
            />
            <input
              className="inputLike"
              readOnly
              value={centerLL.lng ?? ""}
              placeholder="lng"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="modalFooter">
          <button
            className="btn"
            type="button"
            onClick={() => onClose?.()}
            disabled={saving}
          >
            Bekor qilish
          </button>
          <button
            className="btnPrimary"
            type="submit"
            disabled={!canSave || saving}
          >
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
