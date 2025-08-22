import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import { patchFacility } from "../../api/facilities";
import styles from "./FacilityEditModal.module.scss";
import { FACILITY_TYPES } from "../../data/facilityTypes";

export default function FacilityEditModal({
  open,
  onClose,
  facility,
  onSaved,
  dark,
}) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [type, setType] = useState("GREENHOUSE");
  const [attrs, setAttrs] = useState({});
  const canSave = name.trim().length > 0;

  useEffect(() => {
    if (!facility) return;
    setName(facility.name || "");
    setStatus(facility.status || "ACTIVE");
    setType(facility.type || "GREENHOUSE");

    const schema = FACILITY_TYPES[facility.type]?.fields || [];
    const base = {};
    schema.forEach((f) => (base[f.key] = ""));
    const incoming = facility.attributes || facility.details || {};
    const merged = { ...base };
    for (const [k, v] of Object.entries(incoming)) {
      if (k in base) merged[k] = v ?? "";
    }
    setAttrs(merged);
  }, [facility?.id]);

  const typeLabel = FACILITY_TYPES[type]?.label || type;
  const orgLabel =
    facility?.orgName ||
    facility?.org?.name ||
    (facility?.orgId != null ? `Org #${facility.orgId}` : "—");

  const onChangeAttr = (k, v) => setAttrs((s) => ({ ...s, [k]: v }));

  const onSave = async () => {
    if (!canSave || !facility) return;
    try {
      await patchFacility(facility.id, {
        name: name.trim(),
        status,
        attributes: normalizeNumbers(attrs),
      });
      onClose?.();
      onSaved?.();
    } catch (e) {
      console.error(e);
      alert(e?.data?.message || "Saqlashda xatolik");
    }
  };

  const headerRight = (
    <button
      className={`btn primary ${styles.saveBtn}`}
      onClick={onSave}
      disabled={!canSave}
    >
      Saqlash
    </button>
  );

  if (!open || !facility) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Obyektni tahrirlash"
      size="lg"
      headerRight={headerRight}
      dark={dark}
    >
      <div className={styles.wrapper}>
        {/* Summary */}
        <section className={styles.summary}>
          <div className={styles.avatar}>{typeEmoji(type)}</div>

          <div className={styles.head}>
            <label className={styles.label}>Nom *</label>
            <input
              className={styles.nameInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masalan: Issiqxona #1"
              autoFocus
            />

            <div className={styles.metaRow}>
              <div className={styles.metaItem}>
                <span className={styles.k}>Tur</span>
                <span className={styles.v}>{typeLabel}</span>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.k}>Status</span>
                <select
                  className={styles.select}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="UNDER_MAINTENANCE">UNDER_MAINTENANCE</option>
                </select>
              </div>

              <div className={styles.metaItem}>
                <span className={styles.k}>Bo‘lim</span>
                <span className={styles.pill}>{orgLabel}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Details */}
        <section className={styles.section}>
          <div className={styles.sectionTitle}>Maxsus maydonlar</div>
          <div className={styles.grid}>
            {(FACILITY_TYPES[type]?.fields || []).map((f) => (
              <div key={f.key} className={styles.field}>
                <label className={styles.label}>
                  {f.label}
                  {f.suffix ? ` (${f.suffix})` : ""}
                </label>

                {f.type === "text" ? (
                  <input
                    className={styles.input}
                    value={attrs[f.key] ?? ""}
                    onChange={(e) => onChangeAttr(f.key, e.target.value)}
                  />
                ) : (
                  <div className={styles.inputWrap}>
                    <input
                      className={styles.input}
                      type="number"
                      value={attrs[f.key] ?? ""}
                      onChange={(e) => onChangeAttr(f.key, e.target.value)}
                    />
                    {f.suffix && (
                      <span className={styles.unit}>{f.suffix}</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={styles.hint}>
            * Sonli maydonlar bo‘sh qoldirilsa <b>null</b> sifatida yuboriladi.
          </div>
        </section>

        <div className={styles.footer}>
          <button className="btn" onClick={onClose}>
            Bekor
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn primary" onClick={onSave} disabled={!canSave}>
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

function typeEmoji(t) {
  switch (t) {
    case "GREENHOUSE":
      return "🌿";
    case "POULTRY":
      return "🐔";
    case "COWSHED":
      return "🐄";
    case "TURKEY":
      return "🦃";
    case "SHEEPFOLD":
      return "🐑";
    case "WORKSHOP":
      return "🏭";
    case "AUX_LAND":
      return "🌾";
    case "BORDER_LAND":
      return "🧭";
    case "FISHPOND":
      return "🐟";
    default:
      return "🏷️";
  }
}
