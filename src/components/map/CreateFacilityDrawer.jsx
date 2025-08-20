// src/components/map/CreateFacilityDrawer.jsx
import { useState, useEffect } from "react";
import { createFacility } from "../../api/facilities";

export default function CreateFacilityDrawer({
  open,
  geometry,
  center,
  selectedOrgId,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    orgId: null,
    name: "",
    type: "GREENHOUSE",
    status: "ACTIVE",
    zoom: 15,
    attributes: { notes: "" },
  });
  useEffect(() => {
    setForm((f) => ({ ...f, orgId: selectedOrgId || null }));
  }, [selectedOrgId]);
  if (!open) return null;

  const save = async () => {
    if (!form.orgId) return alert("Org ID tanlang yoki kiriting.");
    if (!form.name.trim()) return alert("Nomi kerak.");
    if (!geometry) return alert("Geometriya yo‘q.");
    const payload = {
      orgId: form.orgId,
      name: form.name.trim(),
      type: form.type,
      status: form.status,
      lat: center?.lat ?? null,
      lng: center?.lng ?? null,
      zoom: form.zoom ?? null,
      attributes: form.attributes || null,
      geometry,
    };
    await createFacility(payload);
    onSaved?.();
    onClose?.();
  };

  return (
    <div className="facility-drawer">
      <div className="facility-drawer__header">
        Yangi obyekt yaratish
        <button className="fd-close" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="facility-drawer__body">
        {!selectedOrgId && (
          <div className="fd-alert">Avval tree’dan bo‘limni tanlang (org).</div>
        )}

        <div className="fd-field">
          <label>Bo‘lim (Org ID)</label>
          <input
            type="number"
            value={form.orgId || ""}
            onChange={(e) =>
              setForm({
                ...form,
                orgId: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
          <div className="fd-hint">Tree tanlovidan avtomatik keladi.</div>
        </div>

        <div className="fd-field">
          <label>Nomi</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Masalan: Tovuqxona A"
          />
        </div>

        <div className="fd-grid">
          <div className="fd-field">
            <label>Turi</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {[
                "GREENHOUSE",
                "COWSHED",
                "STABLE",
                "FISHFARM",
                "WAREHOUSE",
                "ORCHARD",
                "FIELD",
                "POULTRY",
                "APIARY",
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="fd-field">
            <label>Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {["ACTIVE", "INACTIVE", "UNDER_MAINTENANCE"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="fd-field">
            <label>Zoom</label>
            <input
              type="number"
              min="3"
              max="19"
              value={form.zoom ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  zoom: e.target.value ? Number(e.target.value) : null,
                })
              }
            />
          </div>
        </div>

        <div className="fd-field">
          <label>Izoh</label>
          <textarea
            rows={3}
            value={form.attributes?.notes ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                attributes: {
                  ...(form.attributes || {}),
                  notes: e.target.value,
                },
              })
            }
          />
        </div>

        <div className="fd-geom">
          <div>
            <b>Geometriya:</b> {geometry?.type}
          </div>
          {center && (
            <div className="fd-hint">
              Markaz: {center.lat?.toFixed(6)}, {center.lng?.toFixed(6)}
            </div>
          )}
        </div>
      </div>
      <div className="facility-drawer__footer">
        <button className="fd-secondary" onClick={onClose}>
          Bekor qilish
        </button>
        <button className="fd-primary" onClick={save}>
          Saqlash
        </button>
      </div>
    </div>
  );
}
