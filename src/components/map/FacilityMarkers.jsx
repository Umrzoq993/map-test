// src/components/map/FacilityMarkers.jsx
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { centroidOfGeometry } from "../../utils/geo";
import { badgeIconFor } from "./mapIcons";
import { useFacilityTypes } from "../../hooks/useFacilityTypes";
import { useEffect, useRef, useState } from "react";

function hexToRgba(hex, a = 0.35) {
  if (!hex) return `rgba(37,99,235,${a})`;
  const s = String(hex).trim();
  const m = s.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return `rgba(37,99,235,${a})`;
  let h = m[1];
  if (h.length === 3)
    h = h
      .split("")
      .map((x) => x + x)
      .join("");
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}

export default function FacilityMarkers({
  facilities,
  onOpenEdit,
  onOpenGallery,
  onOpenDetails,
  popupFacilityId,
}) {
  const { byCode, label: labelFor, color: colorFor } = useFacilityTypes();
  const [isDark, setIsDark] = useState(false);
  const markerRefs = useRef(new Map());
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
  // Try to open the popup for the requested facility when markers or id change
  useEffect(() => {
    if (!popupFacilityId) return;
    const m = markerRefs.current.get(popupFacilityId);
    try {
      m?.openPopup?.();
    } catch {}
  }, [popupFacilityId, facilities]);

  if (!Array.isArray(facilities) || facilities.length === 0) return null;

  return (
    <>
      {/* CSS animations for highlight + popup appear */}
      <style>{`
        @keyframes fac-pulse {
          0% { transform: scale(0.55); opacity: .9; }
          60% { transform: scale(1.25); opacity: .5; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .fac-pulse-icon { pointer-events: none; }
        .fac-pulse-icon .pulse {
          position: relative;
          width: 56px; height: 56px; border-radius: 999px;
        }
        .fac-pulse-icon .pulse .ring {
          position: absolute; inset: 0; border-radius: 999px;
          animation: fac-pulse 5s ease-out 0s 1 forwards;
        }
        .fac-pulse-icon .pulse .ring.r2 { animation-delay: .7s; }
        .fac-pulse-icon .pulse .core {
          position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
          width: 12px; height: 12px; border-radius: 999px;
          background: rgba(255,255,255,.95);
          border: 2px solid currentColor;
          box-shadow: 0 1px 4px rgba(0,0,0,.15);
        }
        .fac-popup-appear { animation: fac-pop .25s ease-out both; }
        @keyframes fac-pop {
          0% { transform: translateY(6px) scale(.98); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        /* dark mode keeps the same sizing; colors come inline per type */
      `}</style>
      {facilities.map((f) => {
        const pos = derivePosition(f);
        if (!pos) return null;

        const icon = badgeIconFor(f.type, 28);
        const typeLabel = labelFor(f.type) || f.type;
        const orgLabel =
          f.orgName ||
          f.org?.name ||
          (f.orgId != null ? `Org #${f.orgId}` : "—");
        const details = f.attributes || f.details || {};
        const schema = Array.isArray(byCode.get(f.type)?.schema)
          ? byCode.get(f.type).schema
          : [];

        const isSelected = popupFacilityId === f.id;
        return (
          <Marker
            key={`fmk-${f.id}`}
            position={pos}
            icon={icon}
            pane="facilities-markers"
            ref={(inst) => {
              if (inst) markerRefs.current.set(f.id, inst);
              else markerRefs.current.delete(f.id);
            }}
            eventHandlers={{
              dblclick: () => onOpenGallery?.(f),
            }}
          >
            <Popup minWidth={260} maxWidth={360} autoPan>
              <div
                style={{ minWidth: 240 }}
                className={isSelected ? "fac-popup-appear" : undefined}
              >
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                  {f.name || "Obyekt"}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
                  {typeLabel} {f.status ? `• ${f.status}` : ""} <br />
                  <span style={{ opacity: 0.9 }}>Bo‘lim:</span> {orgLabel}
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  {schema.map((fld) => {
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

                {/* Pastki amallar: Rasmlar, Tahrirlash, Tafsilotlar (ℹ️) */}
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
                  <button
                    className="btn primary"
                    style={{ padding: "6px 10px", borderRadius: 10 }}
                    onClick={() => onOpenEdit?.(f)}
                  >
                    Tahrirlash
                  </button>
                  <div style={{ flex: 1 }} />
                  <button
                    className="btn"
                    title="Tafsilotlarni ochish"
                    aria-label="Tafsilotlar"
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
                    onClick={() => onOpenDetails?.(f)}
                  >
                    ℹ️
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
      {/* Render pulse highlight markers after normal markers so they appear below popup but with animation */}
      {facilities.map((f) => {
        if (popupFacilityId !== f.id) return null;
        const pos = derivePosition(f);
        if (!pos) return null;
        const base = colorFor(f.type) || "#2563eb";
        const grad1 = hexToRgba(base, 0.18);
        const grad2 = hexToRgba(base, 0.1);
        const grad3 = hexToRgba(base, 0.04);
        const stroke = hexToRgba(base, 0.55);
        const glow = hexToRgba(base, 0.35);
        const DIA = 56;
        const ringStyle = `background: radial-gradient(circle at center, ${grad1} 0%, ${grad1} 35%, ${grad2} 55%, ${grad3} 75%, rgba(0,0,0,0) 100%); box-shadow: 0 0 0 2px ${stroke} inset, 0 2px 14px ${glow};`;
        const html = `
          <div class="pulse" style="color:${base}">
            <div class="ring r1" style="${ringStyle}"></div>
            <div class="ring r2" style="${ringStyle}"></div>
            <div class="core"></div>
          </div>`;
        const icon = L.divIcon({
          className: "fac-pulse-icon",
          html,
          iconSize: [DIA, DIA],
          iconAnchor: [DIA / 2, DIA / 2],
        });
        return (
          <Marker
            key={`fmk-pulse-${f.id}`}
            position={pos}
            icon={icon}
            pane="facilities-centroids"
            interactive={false}
          />
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
