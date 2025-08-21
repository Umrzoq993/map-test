// src/components/map/FacilityDetailsModal.jsx
import { useEffect, useState } from "react";
import { FACILITY_TYPES } from "./CreateFacilityDrawer";
import { patchFacility, deleteFacility } from "../../api/facilities";
import Modal from "../ui/Modal"; // Portal orqali

export default function FacilityDetailsModal({
  open,
  onClose,
  facility,
  onSaved,
  dark, // ⬅️ YANGI: dark flag (App/MapView’dan keladi)
}) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [type, setType] = useState("GREENHOUSE");
  const [details, setDetails] = useState({});

  useEffect(() => {
    if (!facility) return;
    setName(facility.name || "");
    setStatus(facility.status || "ACTIVE");
    setType(facility.type || "GREENHOUSE");

    const schema = FACILITY_TYPES[facility.type]?.fields || [];
    const schemaKeys = new Set(schema.map((f) => f.key));
    const base = {};
    for (const f of schema) base[f.key] = "";
    const incoming = facility.details || {};
    const merged = { ...base };
    for (const [k, v] of Object.entries(incoming)) {
      if (schemaKeys.has(k)) merged[k] = v ?? "";
    }
    setDetails(merged);
  }, [facility?.id]);

  const onChangeDetail = (k, v) => setDetails((d) => ({ ...d, [k]: v }));

  if (!open || !facility) return null;

  const doSave = async () => {
    try {
      await patchFacility(facility.id, {
        name: name.trim(),
        status,
        attributes: normalizeNumbers(details),
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
    <Modal
      open={open}
      onClose={onClose}
      title="Obyekt ma’lumotlari"
      size="lg"
      dark={dark} // ⬅️ MUHIM: modalga dark ni uzatyapmiz
    >
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
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
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
    </Modal>
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
