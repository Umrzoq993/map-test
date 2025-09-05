import { useEffect, useMemo, useState } from "react";
import { debugError } from "../../utils/debug";
import Modal from "../ui/Modal"; // Agar fayl `map/modals/` ichida bo'lsa: `../../ui/Modal` qilib qo'ying.
import { patchFacility } from "../../api/facilities";
import styles from "./FacilityEditModal.module.scss";
import { FACILITY_TYPES } from "../../data/facilityTypes";
import { toast } from "react-toastify";
import { areaOfGeometryM2 } from "../../utils/geo";

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

  // Schema (tanlangan turga mos maydonlar)
  const schemaFields = useMemo(
    () => FACILITY_TYPES[type]?.fields || [],
    [type]
  );

  // Modal ochilganda boshlang'ich qiymatlar
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
  }, [facility]);

  const typeLabel = FACILITY_TYPES[type]?.label || type;
  const orgLabel =
    facility?.orgName ||
    facility?.org?.name ||
    (facility?.orgId != null ? `Org #${facility.orgId}` : "—");

  const onChangeAttr = (k, v) => setAttrs((s) => ({ ...s, [k]: v }));

  /* ---------------------------------
   *  MAYDONNI HISOBLASH (m² / ga)
   * ---------------------------------*/
  const calcAreaM2 = useMemo(() => {
    try {
      if (!facility?.geometry) return null;
      const a = areaOfGeometryM2(facility.geometry);
      return Number.isFinite(a) ? a : null;
    } catch {
      return null;
    }
  }, [facility?.geometry]);

  const calcAreaHa = useMemo(
    () => (calcAreaM2 != null ? calcAreaM2 / 10000 : null),
    [calcAreaM2]
  );

  const hasAreaM2Field = useMemo(
    () => schemaFields.some((f) => f.key === "areaM2"),
    [schemaFields]
  );
  const hasAreaHaField = useMemo(
    () => schemaFields.some((f) => f.key === "totalAreaHa"),
    [schemaFields]
  );

  // Modal ochilganda/form qayta tiklanganda — bo'sh bo'lsa avtomatik to'ldirish
  useEffect(() => {
    if (!open) return;
    if (calcAreaM2 == null) return;
    if (!hasAreaM2Field && !hasAreaHaField) return;

    setAttrs((prev) => {
      const next = { ...prev };
      let changed = false;

      if (hasAreaM2Field && (prev.areaM2 == null || prev.areaM2 === "")) {
        next.areaM2 = Math.round(calcAreaM2);
        changed = true;
      }
      if (
        hasAreaHaField &&
        (prev.totalAreaHa == null || prev.totalAreaHa === "")
      ) {
        next.totalAreaHa = Number((calcAreaM2 / 10000).toFixed(4));
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [open, calcAreaM2, hasAreaM2Field, hasAreaHaField]);

  // Xaritada geometriya tahrirlash rejimini ishga tushirish
  const startGeometryEdit = () => {
    if (!facility) return;
    try {
      window.dispatchEvent(
        new CustomEvent("facility:edit-geometry", {
          detail: {
            facilityId: facility.id,
            geometry: facility.geometry || null,
          },
        })
      );
      onClose?.(); // modalni yopamiz
    } catch (e) {
      debugError("FacilityEdit geometry edit dispatch failed", e);
      toast.error("Geometriya tahrirlashni ishga tushirib bo‘lmadi.");
    }
  };

  // “Qayta hisoblash” — geometriya yo‘q/Point bo‘lsa edit rejimiga taklif
  const recalcArea = () => {
    if (calcAreaM2 == null) {
      const go = window.confirm(
        "Geometriya mavjud emas yoki poligon emas. Geometriyani chizish/tahrirlash rejimiga o‘tasizmi?"
      );
      if (go) startGeometryEdit();
      return;
    }
    // mavjud bo‘lsa — formadagi maydon qiymatlarini yangilaymiz
    setAttrs((prev) => {
      const next = { ...prev };
      if (hasAreaM2Field) next.areaM2 = Math.round(calcAreaM2);
      if (hasAreaHaField)
        next.totalAreaHa = Number((calcAreaM2 / 10000).toFixed(4));
      return next;
    });
  };

  // Formatlangan preview
  const fmtM2 =
    calcAreaM2 != null ? Math.round(calcAreaM2).toLocaleString() : "—";
  const fmtHa =
    calcAreaHa != null ? Number(calcAreaHa.toFixed(4)).toLocaleString() : "—";

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
      debugError("FacilityEdit save failed", e);
      toast.error(e?.data?.message || "Saqlashda xatolik");
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

          {/* Hisoblangan maydon preview + Recalc + Edit geom */}
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              marginBottom: 10,
              flexWrap: "wrap",
            }}
          >
            <span className={styles.label}>
              Hisoblangan maydon:&nbsp;
              <b>{fmtM2}</b>&nbsp;m²&nbsp;(
              <b>{fmtHa}</b>&nbsp;ga)
            </span>
            <button className="btn" type="button" onClick={recalcArea}>
              Qayta hisoblash
            </button>
            <button className="btn" type="button" onClick={startGeometryEdit}>
              Geometriyani tahrirlash/chizish
            </button>
          </div>

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
