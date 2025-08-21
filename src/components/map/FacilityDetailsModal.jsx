// src/components/map/FacilityDetailsModal.jsx
import { useEffect, useMemo, useState } from "react";
import { FACILITY_TYPES } from "./CreateFacilityDrawer";
import { patchFacility, deleteFacility } from "../../api/facilities";

export default function FacilityDetailsModal({
  open,
  onClose,
  facility,
  onSaved,
}) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [type, setType] = useState("GREENHOUSE"); // type o'zgarmaydi (readOnly)
  const fields = FACILITY_TYPES[type]?.fields || [];
  const [details, setDetails] = useState({});

  useEffect(() => {
    if (!facility) return;
    setName(facility.name || "");
    setStatus(facility.status || "ACTIVE");
    setType(facility.type || "GREENHOUSE");
    const schemaKeys = new Set(
      (FACILITY_TYPES[facility.type]?.fields || []).map((f) => f.key)
    );
    const base = {};
    for (const f of fields) base[f.key] = "";
    const incoming = facility.details || {};
    // faqat schema’ga tushadiganlarini olamiz
    const merged = { ...base };
    for (const [k, v] of Object.entries(incoming)) {
      if (schemaKeys.has(k)) merged[k] = v ?? "";
    }
    setDetails(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facility?.id]);

  const onChangeDetail = (k, v) => setDetails((d) => ({ ...d, [k]: v }));

  if (!open || !facility) return null;

  const doSave = async () => {
    try {
      await patchFacility(facility.id, {
        name: name.trim(),
        status,
        details: normalizeNumbers(details),
      });
      onClose?.();
      onSaved?.();
    } catch (e) {
      console.error(e);
      alert(e?.data?.message || "Saqlashda xatolik");
    }
  };

  const doDelete = async () => {
    if (!confirm(`O‘chirishni tasdiqlaysizmi?\n${facility.name}`)) return;
    try {
      await deleteFacility(facility.id);
      onClose?.();
      onSaved?.();
    } catch (e) {
      console.error(e);
      alert(e?.data?.message || "O‘chirishda xatolik");
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 640 }}
      >
        <div className="modal-header">
          <div className="modal-title">Obyekt ma’lumotlari</div>
          <button className="modal-close" onClick={onClose} aria-label="Yopish">
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="field">
              <label>Nom</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid3">
              <div className="field">
                <label>Tur</label>
                <input value={FACILITY_TYPES[type]?.label || type} readOnly />
              </div>
              <div className="field">
                <label>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                </select>
              </div>
              <div className="field">
                <label>Org ID</label>
                <input value={facility.orgId ?? "—"} readOnly />
              </div>
            </div>

            <hr style={{ opacity: 0.3 }} />

            <div style={{ fontWeight: 700 }}>
              {FACILITY_TYPES[type]?.label} — maxsus maydonlar
            </div>
            {(FACILITY_TYPES[type]?.fields || []).map((f) => (
              <div key={f.key} className="field">
                <label>
                  {f.label}
                  {f.suffix ? ` (${f.suffix})` : ""}
                </label>
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

            <div className="modal-actions">
              <button className="btn danger" onClick={doDelete}>
                O‘chirish
              </button>
              <div style={{ flex: 1 }} />
              <button className="btn" onClick={onClose}>
                Bekor
              </button>
              <button className="btn primary" onClick={doSave}>
                Saqlash
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
