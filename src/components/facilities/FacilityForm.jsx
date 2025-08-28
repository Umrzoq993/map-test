// src/components/facilities/FacilityForm.jsx
import { useEffect, useMemo, useState } from "react";
import OrgUnitSelect from "../../pages/admin/OrgUnitSelect";

const TYPE_OPTIONS = [
  { value: "GREENHOUSE", label: "Issiqxona" },
  { value: "POULTRY", label: "Tovuqxona" },
  { value: "COWSHED", label: "Molxona" },
  { value: "TURKEY", label: "Kurkaxona" },
  { value: "SHEEPFOLD", label: "Qo‘yxona" },
  { value: "WORKSHOP", label: "Ishlab chiqarish sexi" },
  { value: "AUX_LAND", label: "Yordamchi xo‘jalik yer" },
  { value: "BORDER_LAND", label: "Chegara oldi yer" },
  { value: "FISHPOND", label: "Baliqchilik ko‘li" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "UNDER_MAINTENANCE", label: "Maintenance" },
];

// --- atributlar sxemasi (o‘zingizdagi kabi) ---
const ATTR_SCHEMAS = {
  GREENHOUSE: [
    {
      key: "totalAreaHa",
      label: "Umumiy yer maydoni (gektar)",
      type: "number",
    },
    { key: "heatingType", label: "Isitish tizimi turi", type: "text" },
    {
      key: "expectedYield",
      label: "Olinadigan hosildorlik miqdori",
      type: "number",
    },
    {
      key: "expectedRevenue",
      label: "Olinadigan daromad miqdori",
      type: "number",
    },
    { key: "netProfit", label: "Olingan sof foyda", type: "number" },
  ],
  POULTRY: [
    { key: "areaM2", label: "Umumiy yer maydoni (m²)", type: "number" },
    { key: "capacity", label: "Umumiy sig‘imi (son)", type: "int" },
    { key: "current", label: "Hozirda mavjud (son)", type: "int" },
    {
      key: "productAmount",
      label: "Olinadigan mahsulot (kg / dona)",
      type: "number",
    },
    { key: "productUnit", label: "Mahsulot birligi (kg | pcs)", type: "text" },
    { key: "expectedRevenue", label: "Olinadigan daromad", type: "number" },
    { key: "netProfit", label: "Olingan sof foyda", type: "number" },
  ],
  COWSHED: [
    { key: "areaM2", label: "Umumiy yer maydoni (m²)", type: "number" },
    { key: "capacity", label: "Umumiy sig‘imi (son)", type: "int" },
    { key: "current", label: "Hozirda mavjud (son)", type: "int" },
    { key: "productAmount", label: "Olinadigan mahsulot (kg)", type: "number" },
    { key: "expectedRevenue", label: "Olinadigan daromad", type: "number" },
    { key: "netProfit", label: "Olingan sof foyda", type: "number" },
  ],
  TURKEY: [
    { key: "areaM2", label: "Umumiy yer maydoni (m²)", type: "number" },
    { key: "capacity", label: "Umumiy sig‘imi (son)", type: "int" },
    { key: "current", label: "Hozirda mavjud (son)", type: "int" },
    { key: "productAmount", label: "Olinadigan mahsulot (kg)", type: "number" },
    { key: "expectedRevenue", label: "Olinadigan daromad", type: "number" },
    { key: "netProfit", label: "Olingan sof foyda", type: "number" },
  ],
  SHEEPFOLD: [
    { key: "areaM2", label: "Umumiy yer maydoni (m²)", type: "number" },
    { key: "capacity", label: "Umumiy sig‘imi (son)", type: "int" },
    { key: "current", label: "Hozirda mavjud (son)", type: "int" },
    { key: "productAmount", label: "Olinadigan mahsulot (kg)", type: "number" },
    { key: "expectedRevenue", label: "Olinadigan daromad", type: "number" },
    { key: "netProfit", label: "Olingan sof foyda", type: "number" },
  ],
  WORKSHOP: [
    { key: "areaM2", label: "Umumiy yer maydoni (m²)", type: "number" },
    { key: "productAmount", label: "Olinadigan mahsulot (kg)", type: "number" },
    { key: "expectedRevenue", label: "Olinadigan daromad", type: "number" },
    { key: "netProfit", label: "Olingan sof foyda", type: "number" },
  ],
  AUX_LAND: [
    { key: "areaM2", label: "Umumiy yer maydoni (m²)", type: "number" },
    { key: "expectedYield", label: "Olinadigan hosil miqdori", type: "number" },
    {
      key: "expectedRevenue",
      label: "Olinadigan daromad miqdori",
      type: "number",
    },
    { key: "netProfit", label: "Olingan sof foyda", type: "number" },
    { key: "tenant", label: "Ijarachi", type: "text" },
    { key: "govDecision", label: "Hukumat qarori", type: "text" },
  ],
  BORDER_LAND: [
    { key: "areaM2", label: "Umumiy yer maydoni (m²)", type: "number" },
    { key: "expectedYield", label: "Olinadigan hosil miqdori", type: "number" },
    {
      key: "expectedRevenue",
      label: "Olinadigan daromad miqdori",
      type: "number",
    },
    { key: "netProfit", label: "Olingan sof foyda", type: "number" },
    { key: "tenant", label: "Ijarachi", type: "text" },
    { key: "govDecision", label: "Hukumat qarori", type: "text" },
  ],
  FISHPOND: [
    { key: "areaM2", label: "Umumiy yer maydoni (m²)", type: "number" },
    {
      key: "productAmount",
      label: "Olinadigan mahsulot miqdori (kg)",
      type: "number",
    },
    {
      key: "expectedRevenue",
      label: "Olinadigan daromad miqdori",
      type: "number",
    },
    { key: "netProfit", label: "Olingan sof foyda", type: "number" },
    { key: "tenant", label: "Ijarachi", type: "text" },
    { key: "govDecision", label: "Hukumat qarori", type: "text" },
  ],
};

function parseVal(raw, t) {
  if (raw === "" || raw === null || raw === undefined) return null;
  if (t === "int")
    return Number.isFinite(Number(raw)) ? parseInt(raw, 10) : null;
  if (t === "number") return Number.isFinite(Number(raw)) ? Number(raw) : null;
  return String(raw);
}

export default function FacilityForm({ initial, onSubmit, onCancel }) {
  const [orgId, setOrgId] = useState(initial?.orgId ?? null);
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "GREENHOUSE");
  const [status, setStatus] = useState(initial?.status ?? "ACTIVE");
  const [lat, setLat] = useState(initial?.lat ?? "");
  const [lng, setLng] = useState(initial?.lng ?? "");
  const [zoom, setZoom] = useState(initial?.zoom ?? "");
  const [attributes, setAttributes] = useState(() => ({
    ...(initial?.attributes || {}),
  }));

  const schema = useMemo(() => ATTR_SCHEMAS[type] || [], [type]);

  useEffect(() => {
    setAttributes((prev) => ({ ...prev }));
  }, [type]);

  const handleAttrChange = (k, v, t) => {
    setAttributes((prev) => ({ ...prev, [k]: parseVal(v, t) }));
  };

  const canSave = orgId != null && name.trim().length > 0;

  const submit = (e) => {
    e.preventDefault();
    if (orgId == null) {
      alert("Tashkilot bo‘limi tanlanishi shart.");
      return;
    }
    if (!name.trim()) {
      alert("Nomi bo‘sh bo‘lmasin.");
      return;
    }
    const payload = {
      orgId: Number(orgId),
      name: name.trim(),
      type,
      status,
      lat: lat === "" ? null : Number(lat),
      lng: lng === "" ? null : Number(lng),
      zoom: zoom === "" ? null : Number(zoom),
      attributes,
      geometry: initial?.geometry ?? null,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <div className="field">
          <label>Tashkilot bo‘limi *</label>
          <OrgUnitSelect
            value={orgId}
            onChange={(opt) => setOrgId(opt?.id ?? null)}
            placeholder="Tashkilotni qidiring..."
            allowClear
          />
          <div className="hint">Dropdown orqali qidirib tanlang.</div>
        </div>

        <div className="field">
          <label>Nomi *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Obyekt nomi"
          />
        </div>

        <div className="grid3">
          <div className="field">
            <label>Turi</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Zoom (ixtiyoriy)</label>
            <input
              type="number"
              value={zoom ?? ""}
              onChange={(e) => setZoom(e.target.value)}
            />
          </div>
        </div>

        <div className="grid3">
          <div className="field">
            <label>Lat (ixtiyoriy)</label>
            <input
              type="number"
              value={lat ?? ""}
              onChange={(e) => setLat(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Lng (ixtiyoriy)</label>
            <input
              type="number"
              value={lng ?? ""}
              onChange={(e) => setLng(e.target.value)}
            />
          </div>
          <div className="field">
            <label>—</label>
            <div className="hint">Koordinata bo‘lmasa ham bo‘ladi.</div>
          </div>
        </div>

        <div className="field">
          <label>Ma’lumotlar (type bo‘yicha)</label>
          <div className="grid3">
            {schema.map((f) => (
              <div className="field" key={f.key}>
                <label>{f.label}</label>
                <input
                  type={f.type === "text" ? "text" : "number"}
                  value={attributes?.[f.key] ?? ""}
                  onChange={(e) =>
                    handleAttrChange(f.key, e.target.value, f.type)
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Bekor qilish
        </button>
        <button type="submit" className="btn primary" disabled={!canSave}>
          Saqlash
        </button>
      </div>
    </form>
  );
}
