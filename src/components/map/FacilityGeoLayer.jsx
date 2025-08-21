// src/components/map/FacilityGeoLayer.jsx
import { useMemo, useCallback, useRef } from "react";
import { GeoJSON, Marker, Popup } from "react-leaflet";
import { typeColor, badgeIconFor } from "./mapIcons";
import { centroidOfGeometry } from "../../utils/geo";
import { FACILITY_TYPES } from "./CreateFacilityDrawer";

export default function FacilityGeoLayer({
  facilities,
  showPolys = true,
  onFlyTo,
  onOpenEdit, // ⬅️ yangi
}) {
  const geoJsonRef = useRef(null);

  const facilityById = useMemo(() => {
    const m = new Map();
    (facilities || []).forEach((f) => m.set(f.id, f));
    return m;
  }, [facilities]);

  const fc = useMemo(() => {
    const features = (facilities || [])
      .filter((f) => f.geometry && f.geometry.type)
      .map((f) => ({
        type: "Feature",
        geometry: f.geometry,
        properties: {
          id: f.id,
          name: f.name,
          type: f.type,
          status: f.status,
          zoom: f.zoom,
        },
      }));
    return { type: "FeatureCollection", features };
  }, [facilities]);

  const geoKey = useMemo(
    () =>
      (fc.features.length
        ? fc.features.map((fe) => fe.properties.id).join("|")
        : "empty") + (showPolys ? "_on" : "_off"),
    [fc, showPolys]
  );

  const style = useCallback((feature) => {
    const col = typeColor(feature?.properties?.type);
    return {
      color: col,
      weight: 2,
      fillOpacity: 0.15,
      fillColor: col,
      dashArray: "3",
    };
  }, []);

  const onEach = useCallback(
    (feature, layer) => {
      const p = feature?.properties || {};
      const f = facilityById.get(p.id);
      if (!f) return;

      layer.on("mouseover", () => {
        layer.setStyle({ weight: 3, fillOpacity: 0.25 });
        layer.bringToFront();
      });
      layer.on("mouseout", () => {
        if (geoJsonRef.current) geoJsonRef.current.resetStyle(layer);
      });

      const typeLabel = FACILITY_TYPES[f.type]?.label || f.type;
      const orgLabel =
        f.orgName || f.org?.name || (f.orgId != null ? `Org #${f.orgId}` : "—");
      const details = f.attributes || f.details || {};

      const rows = (FACILITY_TYPES[f.type]?.fields || [])
        .map((fld) => {
          const val = details[fld.key];
          if (val === null || val === undefined || String(val).trim?.() === "")
            return "";
          const suffix = fld.suffix ? ` (${fld.suffix})` : "";
          return `
            <div style="display:grid;grid-template-columns:1fr auto;gap:10px;font-size:13px;">
              <div style="color:#64748b">${escapeHtml(fld.label)}${suffix}</div>
              <div style="font-weight:600">${escapeHtml(String(val))}</div>
            </div>`;
        })
        .filter(Boolean)
        .join("");

      const editId = `rx-edit-${p.id}`;
      const html = `
        <div style="min-width:240px">
          <div style="font-weight:700;font-size:15px;margin-bottom:2px">
            ${escapeHtml(f.name || "Obyekt")}
          </div>
          <div style="font-size:12px;opacity:.8;margin-bottom:6px">
            ${escapeHtml(typeLabel)}${
        f.status ? " • " + escapeHtml(f.status) : ""
      }<br/>
            <span style="opacity:.9">Bo‘lim:</span> ${escapeHtml(orgLabel)}
          </div>
          <div style="display:grid;gap:6px">${rows}</div>
          <div style="display:flex;justify-content:flex-end;margin-top:10px">
            <button id="${editId}" class="btn primary" style="padding:6px 10px;border-radius:10px">Tahrirlash</button>
          </div>
        </div>`;

      layer.bindPopup(html, { minWidth: 260, maxWidth: 360, autoPan: true });

      // Edit tugmasiga native click ulash
      let handler = null;
      layer.on("popupopen", (e) => {
        const root = e?.popup?.getElement?.();
        if (!root) return;
        const btn = root.querySelector?.(`#${CSS.escape(editId)}`);
        if (!btn) return;
        handler = () => onOpenEdit?.(f);
        btn.addEventListener("click", handler);
      });

      layer.on("popupclose", (e) => {
        const root = e?.popup?.getElement?.();
        if (!root) return;
        const btn = root.querySelector?.(`#${CSS.escape(editId)}`);
        if (btn && handler) btn.removeEventListener("click", handler);
        handler = null;
      });

      // ixtiyoriy fly-to
      layer.on("click", () => {
        if (onFlyTo && layer.getBounds) {
          const c = layer.getBounds().getCenter();
          onFlyTo({
            lat: c.lat,
            lng: c.lng,
            zoom: p.zoom || 16,
            ts: Date.now(),
          });
        }
      });
    },
    [facilityById, onFlyTo, onOpenEdit]
  );

  const centroidBadges = useMemo(() => {
    return (facilities || [])
      .filter(
        (f) => f.geometry && f.geometry.type && f.geometry.type !== "Point"
      )
      .map((f) => {
        const c = centroidOfGeometry(f.geometry);
        if (!c) return null;
        const typeLabel = FACILITY_TYPES[f.type]?.label || f.type;
        const orgLabel =
          f.orgName ||
          f.org?.name ||
          (f.orgId != null ? `Org #${f.orgId}` : "—");
        const details = f.attributes || f.details || {};

        return (
          <Marker
            key={`fc-${f.id}`}
            position={[c.lat, c.lng]}
            icon={badgeIconFor(f.type, 28)}
            pane="facilities-centroids"
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
                    const v = details[fld.key];
                    if (
                      v === null ||
                      v === undefined ||
                      String(v).trim?.() === ""
                    )
                      return null;
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
                        <div style={{ fontWeight: 600 }}>{String(v)}</div>
                      </div>
                    );
                  })}
                </div>

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
      })
      .filter(Boolean);
  }, [facilities, onOpenEdit]);

  return (
    <>
      {showPolys && fc.features.length > 0 && (
        <GeoJSON
          key={geoKey}
          data={fc}
          style={style}
          onEachFeature={onEach}
          pane="facilities-polys"
          ref={geoJsonRef}
        />
      )}
      {showPolys && centroidBadges}
    </>
  );
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
