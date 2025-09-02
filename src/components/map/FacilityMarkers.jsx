// src/components/map/FacilityMarkers.jsx
import { Marker, Popup } from "react-leaflet";
import { centroidOfGeometry } from "../../utils/geo";
import { badgeIconFor } from "./mapIcons";
import { FACILITY_TYPES } from "../../data/facilityTypes";
import { useEffect, useState } from "react";

export default function FacilityMarkers({
  facilities,
  onOpenEdit,
  onOpenGallery,
}) {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const compute = () => setIsDark(root.classList.contains("dark"));
    compute();
    const obs = new MutationObserver(compute);
    obs.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => obs.disconnect();
  }, []);
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
            eventHandlers={{
              dblclick: () => onOpenGallery?.(f),
            }}
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
                <div style={{ display: "flex", marginTop: 10, gap: 8 }}>
                  <button
                    className="btn"
                    style={{
                      padding: "6px 10px",
                      borderRadius: 10,
                      background: isDark ? "#1e293b" : "#f1f5f9",
                      color: isDark ? "#e2e8f0" : "#0f172a",
                      border: `1px solid ${isDark ? "#334155" : "#cbd5e1"}`,
                      boxShadow: isDark
                        ? "0 2px 6px -2px rgba(0,0,0,.6)"
                        : "0 2px 6px -2px rgba(0,0,0,.15)",
                      fontWeight: 600,
                    }}
                    onClick={() => onOpenGallery?.(f)}
                  >
                    Rasmlar
                  </button>
                  <div style={{ flex: 1 }} />
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
