import React, { useMemo } from "react";
import Modal from "../ui/Modal";
import { useFacilityTypes } from "../../hooks/useFacilityTypes";
import { areaOfGeometryM2, centroidOfGeometry } from "../../utils/geo";

export default function FacilityDetailsModal({
  open,
  facility,
  onClose,
  dark,
}) {
  const { label: labelForType, byCode } = useFacilityTypes();

  const rows = useMemo(() => {
    if (!facility) return [];
    const typeLabel = labelForType(facility.type) || facility.type || "—";
    const orgLabel =
      facility.orgName ||
      facility.org?.name ||
      (facility.orgId != null ? `Org #${facility.orgId}` : "—");
    const coords = (() => {
      const lat = Number(facility.lat),
        lng = Number(facility.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return `${lat}, ${lng}`;
      const c = centroidOfGeometry(facility.geometry);
      return c ? `${c.lat}, ${c.lng}` : "—";
    })();
    const area = (() => {
      try {
        if (!facility.geometry) return "—";
        const m2 = areaOfGeometryM2(facility.geometry);
        if (!Number.isFinite(m2)) return "—";
        const ha = m2 / 10000;
        return `${Math.round(m2).toLocaleString()} m² (${ha.toFixed(4)} ga)`;
      } catch {
        return "—";
      }
    })();
    const createdAt = fmtDate(facility.createdAt);
    const updatedAt = fmtDate(facility.updatedAt);

    const base = [
      ["ID", safe(facility.id)],
      ["Nom", safe(facility.name)],
      ["Tur", typeLabel],
      ["Status", safe(facility.status)],
      ["Bo‘lim", orgLabel],
      ["Koordinata", coords],
      ["Maydon", area],
      ["Yaratilgan", createdAt],
      ["Yangilangan", updatedAt],
    ];

    // Attributes by schema order if available
    const schema = byCode.get(facility.type)?.schema;
    const attrs = facility.attributes || facility.details || {};
    const attrRows = Array.isArray(schema)
      ? schema.map((f) => [
          f.label + (f.suffix ? ` (${f.suffix})` : ""),
          valueOrDash(attrs[f.key]),
        ])
      : Object.entries(attrs).map(([k, v]) => [k, valueOrDash(v)]);

    return base.concat([["—", "—"]]).concat(attrRows);
  }, [facility, labelForType, byCode]);

  if (!open || !facility) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Inshoot ma‘lumotlari"
      size="lg"
      dark={dark}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <th
                  style={{
                    textAlign: "left",
                    whiteSpace: "nowrap",
                    padding: "8px 10px",
                    borderBottom: "1px solid rgba(0,0,0,.08)",
                    color: "#64748b",
                    width: 200,
                  }}
                >
                  {r[0]}
                </th>
                <td
                  style={{
                    padding: "8px 10px",
                    borderBottom: "1px solid rgba(0,0,0,.06)",
                    fontWeight: 600,
                  }}
                >
                  {String(r[1])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function safe(v) {
  return v == null || v === "" ? "—" : v;
}
function valueOrDash(v) {
  if (v === null || v === undefined || String(v).trim() === "") return "—";
  return v;
}
function fmtDate(d) {
  try {
    const dt = new Date(d);
    return isNaN(dt) ? "—" : dt.toLocaleString();
  } catch {
    return "—";
  }
}
