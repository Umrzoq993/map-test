// src/components/map/CreateFacilityDrawer.jsx
import { useEffect, useMemo, useState } from "react";
import { createFacility } from "../../api/facilities";

/** ---------------- FIELD SCHEMA (bitta joydan boshqariladi) ----------------
 * Har bir type uchun: label va fields (kalit, label, input type, suffix).
 * details ichida shu kalitlar saqlanadi.
 */
export const FACILITY_TYPES = {
  GREENHOUSE: {
    label: "Issiqxona",
    fields: [
      { key: "area_ha", label: "Umumiy yer maydoni", type: "number", suffix: "ga" },
      { key: "heating_type", label: "Isitish tizimi turi", type: "text" },
      { key: "yield_amount", label: "Olinadigan hosildorlik miqdori", type: "number" },
      { key: "revenue", label: "Olinadigan daromad miqdori", type: "number" },
      { key: "profit", label: "Olingan sof foyda", type: "number" },
    ],
  },
  POULTRY: {
    label: "Tovuqxona",
    fields: [
      { key: "area_m2", label: "Umumiy yer maydoni", type: "number", suffix: "m²" },
      { key: "capacity", label: "Umumiy sig‘imi", type: "number" },
      { key: "current", label: "Hozirda mavjud", type: "number" },
      { key: "product_amount", label: "Olinadigan mahsulot (kg yoki dona)", type: "number" },
      { key: "revenue", label: "Olinadigan daromad", type: "number" },
      { key: "profit", label: "Olingan sof foyda", type: "number" },
    ],
  },
  COWSHED: {
    label: "Molxona",
    fields: [
      { key: "area_m2", label: "Umumiy yer maydoni", type: "number", suffix: "m²" },
      { key: "capacity", label: "Umumiy sig‘imi", type: "number" },
      { key: "current", label: "Hozirda mavjud", type: "number" },
      { key: "product_kg", label: "Olinadigan mahsulot (kg)", type: "number" },
      { key: "revenue", label: "Olinadigan daromad", type: "number" },
      { key: "profit", label: "Olingan sof foyda", type: "number" },
    ],
  },
  TURKEY: {
    label: "Kurkaxona",
    fields: [
      { key: "area_m2", label: "Umumiy yer maydoni", type: "number", suffix: "m²" },
      { key: "capacity", label: "Umumiy sig‘imi", type: "number" },
      { key: "current", label: "Hozirda mavjud", type: "number" },
      { key: "product_kg", label: "Olinadigan mahsulot (kg)", type: "number" },
      { key: "revenue", label: "Olinadigan daromad", type: "number" },
      { key: "profit", label: "Olingan sof foyda", type: "number" },
    ],
  },
  SHEEPFOLD: {
    label: "Qo‘yxona",
    fields: [
      { key: "area_m2", label: "Umumiy yer maydoni", type: "number", suffix: "m²" },
      { key: "capacity", label: "Umumiy sig‘imi", type: "number" },
      { key: "current", label: "Hozirda mavjud", type: "number" },
      { key: "product_kg", label: "Olinadigan mahsulot (kg)", type: "number" },
      { key: "revenue", label: "Olinadigan daromad", type: "number" },
      { key: "profit", label: "Olingan sof foyda", type: "number" },
    ],
  },
  WORKSHOP: {
    label: "Ishlab chiqarish sexi",
    fields: [
      { key: "area_m2", label: "Umumiy yer maydoni", type: "number", suffix: "m²" },
      { key: "product_kg", label: "Olinadigan mahsulot (kg)", type: "number" },
      { key: "revenue", label: "Olinadigan daromad", type: "number" },
      { key: "profit", label: "Olingan sof foyda", type: "number" },
    ],
  },
  AUX_LAND: {
    label: "Yordamchi xo‘jalik yerlari",
    fields: [
      { key: "area_m2", label: "Umumiy yer maydoni", type: "number", suffix: "m²" },
      { key: "harvest_amount", label: "Olinadigan hosil miqdori", type: "number" },
      { key: "revenue", label: "Olinadigan daromad miqdori", type: "number" },
      { key: "profit", label: "Olinadigan sof foyda", type: "number" },
      { key: "tenant", label: "Ijarachi", type: "text" },
      { key: "government_decision", label: "Hukumat qarori", type: "text" },
    ],
  },
  BORDER_LAND: {
    label: "Chegara oldi yer maydonlari",
    fields: [
      { key: "area_m2", label: "Umumiy yer maydoni", type: "number", suffix: "m²" },
      { key: "harvest_amount", label: "Olinadigan hosil miqdori", type: "number" },
      { key: "revenue", label: "Olinadigan daromad miqdori", type: "number" },
      { key: "profit", label: "Olinadigan sof foyda", type: "number" },
      { key: "tenant", label: "Ijarachi", type: "text" },
      { key: "government_decision", label: "Hukumat qarori", type: "text" },
    ],
  },
  FISHPOND: {
    label: "Baliqchilik ko‘llari",
    fields: [
      { key: "area_m2", label: "Umumiy yer maydoni", type: "number", suffix: "m²" },
      { key: "product_amount", label: "Olinadigan mahsulot miqdori", type: "number" },
      { key: "revenue", label: "Olinadigan daromad miqdori", type: "number" },
      { key: "profit", label: "Olinadigan sof foyda", type: "number" },
      { key: "tenant", label: "Ijarachi", type: "text" },
      { key: "government_decision", label: "Hukumat qarori", type: "text" },
    ],
  },
};

const DEFAULT_STATUS = "ACTIVE";

export default function CreateFacilityDrawer({
  open,
  onClose,
  geometry,          // GeoJSON Geometry (marker/polygon/rectangle)
  center,            // {lat,lng} (marker yoki bounds center)
  selectedOrgId,     // org id (optional)
  onSaved,           // callback
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState("GREENHOUSE");
  const [orgId, setOrgId] = useState(selectedOrgId ?? null);
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const fields = FACILITY_TYPES[type]?.fields || [];

  const [details, setDetails] = useState({});
  useEffect(() => {
    // type o'zgarsa, eski keys saqlanib qolmasin
    const next = {};
    for (const f of fields) next[f.key] = "";
    setDetails(next);
  }, [type]); // eslint-disable-line

  useEffect(() => {
    setOrgId(selectedOrgId ?? null);
  }, [selectedOrgId]);

  const canSave = name.trim().length > 0 && type && (orgId != null);

  const onChangeDetail = (k, v) => {
    setDetails((d) => ({ ...d, [k]: v }));
  };

  const onSubmit = async () => {
    if (!canSave) return;
    try {
      const payload = {
        name: name.trim(),
        type,
        status,
        orgId,
        details: normalizeNumbers(details),
      };
      if (geometry) payload.geometry = geometry;
      if (center?.lat && center?.lng) {
        payload.lat = center.lat;
        payload.lng = center.lng;
      }
      await createFacility(payload);
      onClose?.();
      onSaved?.();
    } catch (e) {
      console.error(e);
      alert(e?.data?.message || "Saqlashda xatolik");
    }
  };

  if (!open) return null;

  return (
    <aside className="facility-drawer">
      <div className="facility-drawer__header">
        Yangi obyekt
        <button className="fd-close" onClick={onClose} aria-label="Yopish">×</button>
      </div>

      <div className="facility-drawer__body">
        <div className="fd-field">
          <label>Nom *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Issiqxona #1" />
        </div>

        <div className="fd-grid">
          <div className="fd-field">
            <label>Tur *</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {Object.entries(FACILITY_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div className="fd-field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
            </select>
          </div>
          <div className="fd-field">
            <label>Bo‘lim (orgId)</label>
            <input
              type="number"
              value={orgId ?? ""}
              onChange={(e) => setOrgId(toNumberOrNull(e.target.value))}
              placeholder="Masalan: 12"
            />
          </div>
        </div>

        {geometry ? (
          <div className="fd-geom">Geometriya: <code>{geometry.type}</code></div>
        ) : center ? (
          <div className="fd-geom">Koordinata: {center.lat?.toFixed(6)}, {center.lng?.toFixed(6)}</div>
        ) : (
          <div className="fd-alert">Eslatma: geometriya yoki nuqta tanlanmagan. Baribir saqlash mumkin.</div>
        )}

        <hr style={{ opacity: 0.2 }} />

        <div style={{ fontWeight: 700 }}>{FACILITY_TYPES[type]?.label} — ma’lumotlar</div>
        <div className="fd-fields">
          {fields.map((f) => (
            <div key={f.key} className="fd-field">
              <label>{f.label}{f.suffix ? ` (${f.suffix})` : ""}</label>
              {f.type === "text" ? (
                <input
                  value={details[f.key] ?? ""}
                  onChange={(e) => onChangeDetail(f.key, e.target.value)}
                />
              ) : (
                <input
                  type="number"
                  value={details[f.key] ?? ""}
                  onChange={(e) => onChangeDetail(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <div className="fd-hint">
          * Sonli maydonlar serverga number sifatida yuboriladi (bo‘sh qoldirilsa null).
        </div>
      </div>

      <div className="facility-drawer__footer">
        <button className="fd-secondary" onClick={onClose}>Bekor</button>
        <button className="fd-primary" onClick={onSubmit} disabled={!canSave}>Saqlash</button>
      </div>
    </aside>
  );
}

function toNumberOrNull(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function normalizeNumbers(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === "" || v == null) { out[k] = null; continue; }
    const n = Number(v);
    out[k] = Number.isFinite(n) && String(v).trim() !== "" ? n : v;
  }
  return out;
}
