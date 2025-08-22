// src/components/map/FacilityMarkers.jsx
import { Marker, Popup } from "react-leaflet";
import { centroidOfGeometry } from "../../utils/geo";
import { badgeIconFor } from "./mapIcons";
import { FACILITY_TYPES } from "../../data/facilityTypes";

export default function FacilityMarkers({ facilities, onOpenEdit }) {
  if (!Array.isArray(facilities) || facilities.length === 0) return null;

  return (
    <>
      {facilities.map((f) => {
        const pos = derivePosition(f);
        if (!pos) return null;

        const icon = badgeIconFor(f.type, 28);
        const typeLabel = FACILITY_TYPES[f.type]?.label || f.type;
        const orgLabel =
          f.orgName ||
          f.org?.name ||
          (f.orgId != null ? `Org #${f.orgId}` : "—");
        const details = f.attributes || f.details || {};

        return (
          <Marker
            key={`fmk-${f.id}`}
            position={pos}
            icon={icon}
            pane="facilities-markers"
          >
            <Popup minWidth={260} maxWidth={360} autoPan>
              <div style={{ minWidth: 240 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                  {f.name || "Obyekt"}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
                  {typeLabel} {f.status ? `• ${f.status}` : ""} <br />
                  <span style={{ opacity: 0.9 }}>Bo‘lim:</span> {orgLabel}
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  {(FACILITY_TYPES[f.type]?.fields || []).map((fld) => {
                    const v = valueOrDash(details[fld.key]);
                    if (v === "—") return null;
                    return (
                      <div
                        key={fld.key}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 10,
                          fontSize: 13,
                        }}
                      >
                        <div style={{ color: "#64748b" }}>
                          {fld.label}
                          {fld.suffix ? ` (${fld.suffix})` : ""}
                        </div>
                        <div style={{ fontWeight: 600 }}>{v}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Popup pastida tahrirlash tugmasi */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: 10,
                  }}
                >
                  <button
                    className="btn primary"
                    style={{ padding: "6px 10px", borderRadius: 10 }}
                    onClick={() => onOpenEdit?.(f)}
                  >
                    Tahrirlash
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

function derivePosition(f) {
  if (f?.centroid?.lat && f?.centroid?.lng)
    return [f.centroid.lat, f.centroid.lng];
  if (f?.geometry) {
    const c = centroidOfGeometry(f.geometry);
    if (c) return [c.lat, c.lng];
  }
  if (Number.isFinite(f?.lat) && Number.isFinite(f?.lng)) return [f.lat, f.lng];
  return null;
}

function valueOrDash(v) {
  if (v === null || v === undefined || String(v).trim() === "") return "—";
  return v;
}
