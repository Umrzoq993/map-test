import { useEffect, useMemo, useState } from "react";
import OrgUnitSelect from "../../pages/admin/OrgUnitSelect";
import MapPickerModal from "../map/MapPickerModal";
import { getOrgUnit, locateOrg } from "../../api/org";
import { toast } from "react-toastify";

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

/** type bo‘yicha atributlar */
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
  const [orgObj, setOrgObj] = useState(null); // {id,name,code,parentId}
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "GREENHOUSE");
  const [status, setStatus] = useState(initial?.status ?? "ACTIVE");
  const [lat, setLat] = useState(initial?.lat ?? "");
  const [lng, setLng] = useState(initial?.lng ?? "");
  const [zoom, setZoom] = useState(initial?.zoom ?? "");
  const [attributes, setAttributes] = useState(() => ({
    ...(initial?.attributes || {}),
  }));

  // MapPickerModal holati
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerInit, setPickerInit] = useState(null); // {lat,lng,zoom} — modalga boshlang‘ich markaz

  const schema = useMemo(() => ATTR_SCHEMAS[type] || [], [type]);

  useEffect(() => {
    setAttributes((prev) => ({ ...prev })); // schema almashganda eski qiymatlar saqlansin
  }, [type]);

  const handleAttrChange = (k, v, t) =>
    setAttributes((prev) => ({ ...prev, [k]: parseVal(v, t) }));

  const canSave =
    orgId != null &&
    name.trim().length > 0 &&
    String(lat).length > 0 &&
    String(lng).length > 0;

  async function openPicker() {
    if (!orgId) {
      toast.info("Avval tashkilotni tanlang.");
      return;
    }
    // 1) Agar formaning o‘zida lat/lng bor bo‘lsa — shu markazdan ochamiz
    if (lat !== "" && lng !== "") {
      setPickerInit({
        lat: Number(lat),
        lng: Number(lng),
        zoom: Number(zoom || 14),
      });
      setPickerOpen(true);
      return;
    }
    // 2) Org koordinatasi bo‘lsa — undan foydalanamiz
    try {
      const org = await getOrgUnit(orgId).catch(() => null); // OrgDto {lat,lng,zoom,...}
      if (org?.lat != null && org?.lng != null) {
        setPickerInit({ lat: org.lat, lng: org.lng, zoom: org.zoom ?? 14 });
        setPickerOpen(true);
        return;
      }
    } catch {}
    // 3) locate orqali viewport kelgan bo‘lsa — markazini hisoblab beramiz
    try {
      if (orgObj?.code) {
        const loc = await locateOrg(orgObj.code).catch(() => null);
        const vp = loc?.viewport;
        if (
          vp?.minLat != null &&
          vp?.maxLat != null &&
          vp?.minLng != null &&
          vp?.maxLng != null
        ) {
          const cLat = (vp.minLat + vp.maxLat) / 2;
          const cLng = (vp.minLng + vp.maxLng) / 2;
          setPickerInit({ lat: cLat, lng: cLng, zoom: vp.zoom ?? 12 });
          setPickerOpen(true);
          return;
        }
      }
    } catch {}
    // 4) Fallback: default markaz
    setPickerInit(null);
    setPickerOpen(true);
  }

  const submit = (e) => {
    e.preventDefault();
    if (!canSave) {
      toast.warn("Tashkilot bo‘limi va koordinata (lat/lng) majburiy.");
      return;
    }
    const payload = {
      orgId: orgId ? Number(orgId) : null,
      name: name?.trim(),
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
    <>
      <form onSubmit={submit} className="facility-form-inner">
        <div className="form-grid">
          {/* Org tanlash */}
          <div className="field">
            <label>Tashkilot bo‘limi *</label>
            <OrgUnitSelect
              value={orgId}
              onChange={(opt) => {
                setOrgId(opt?.id ?? null);
                setOrgObj(opt || null);
              }}
              placeholder="Tashkilotni qidiring..."
              allowClear
            />
            {!orgId && (
              <div className="hint" style={{ color: "#fb7185" }}>
                Majburiy maydon
              </div>
            )}
          </div>

          {/* Nomi */}
          <div className="field">
            <label>Nomi *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Obyekt nomi"
            />
          </div>

          {/* Type / Status / Zoom */}
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
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
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

          {/* Koordinata + MapPicker */}
          <div className="grid3">
            <div className="field">
              <label>Lat *</label>
              <input
                type="number"
                value={lat ?? ""}
                onChange={(e) => setLat(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Lng *</label>
              <input
                type="number"
                value={lng ?? ""}
                onChange={(e) => setLng(e.target.value)}
              />
            </div>
            <div className="field">
              <label>&nbsp;</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn" onClick={openPicker}>
                  Xaritadan tanlash
                </button>
                <div className="hint">
                  Koordinata bo‘lmasa obyekt xaritada ko‘rinmaydi.
                </div>
              </div>
            </div>
          </div>

          {/* Atributlar */}
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

      {/* BOR MapPickerModal’dan foydalanamiz */}
      <MapPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Joylashuvni tanlang"
        value={
          pickerInit ||
          (lat && lng
            ? { lat: Number(lat), lng: Number(lng), zoom: Number(zoom || 14) }
            : undefined)
        }
        onSave={({ lat: la, lng: ln, zoom: zm }) => {
          setLat(la);
          setLng(ln);
          if (zm != null) setZoom(zm);
        }}
        // Appingizda dark tema bo‘lsa xohlasangiz: dark={true}
      />
    </>
  );
}
