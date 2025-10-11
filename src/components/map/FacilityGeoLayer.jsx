// src/components/map/FacilityGeoLayer.jsx
import { useMemo, useCallback, useRef } from "react";
import { GeoJSON, Marker, Popup } from "react-leaflet";
import { typeColor, badgeIconFor } from "./mapIcons";
import { centroidOfGeometry } from "../../utils/geo";
import { areaOfGeometryM2 } from "../../utils/geo";
import { useFacilityTypes } from "../../hooks/useFacilityTypes";

export default function FacilityGeoLayer({
  facilities,
  showPolys = true,
  onFlyTo,
  onOpenEdit, // popupdagi "Tahrirlash" va marker kliklari uchun
}) {
  const { byCode, label: labelFor } = useFacilityTypes();
  const geoJsonRef = useRef(null);

  const facilityById = useMemo(() => {
    const m = new Map();
    for (const f of facilities || []) m.set(f.id, f);
    return m;
  }, [facilities]);

  // LatLng tekshirish
  function isValidLatLng(ll) {
    return (
      ll &&
      Number.isFinite(ll.lat) &&
      Number.isFinite(ll.lng) &&
      ll.lat >= -90 &&
      ll.lat <= 90 &&
      ll.lng >= -180 &&
      ll.lng <= 180
    );
  }

  /* ---------- GeoJSON uchun FeatureCollection (faqat polygonlar) ---------- */
  const fc = useMemo(() => {
    const features = (facilities || [])
      .filter(
        (f) => f.geometry && f.geometry.type && f.geometry.type !== "Point"
      )
      .map((f) => ({
        type: "Feature",
        geometry: f.geometry,
        properties: {
          id: f.id,
          name: f.name,
          type: f.type,
          status: f.status,
          zoom: f.zoom,
          color: typeColor(f.type),
        },
      }));
    return { type: "FeatureCollection", features };
  }, [facilities]);

  // Eski ishlagan mantiqqa o‘xshash: poligon qatlamini kuchli qayta chizish uchun key
  const geoKey = useMemo(
    () =>
      (fc.features.length
        ? fc.features.map((fe) => fe.properties.id).join("|")
        : "empty") + (showPolys ? "_on" : "_off"),
    [fc, showPolys]
  );

  /* ------------------------ Centroid markerlar ro‘yxati ------------------- */
  const centroidBadges = useMemo(() => {
    return (facilities || [])
      .filter(
        (f) => f.geometry && f.geometry.type && f.geometry.type !== "Point"
      )
      .map((f) => {
        const c = centroidOfGeometry(f.geometry); // {lat,lng} | null
        if (!c || !isValidLatLng(c)) return null;

        // 🔢 Hisoblangan maydon (m²/ga)
        let areaM2 = null,
          areaHa = null;
        try {
          const a = areaOfGeometryM2(f.geometry);
          if (Number.isFinite(a)) {
            areaM2 = Math.round(a);
            areaHa = a / 10000;
          }
        } catch {}

        const typeLabel = labelFor(f.type) || f.type;
        const orgLabel =
          f.orgName ||
          f.org?.name ||
          (f.orgId != null ? `Org #${f.orgId}` : "—");
        const details = f.attributes || f.details || {};
        const schema = Array.isArray(byCode.get(f.type)?.schema)
          ? byCode.get(f.type).schema
          : [];

        return (
          <Marker
            key={`fc-${f.id}`}
            position={[c.lat, c.lng]}
            icon={badgeIconFor(f.type, 28)}
            pane="facilities-centroids"
            eventHandlers={{
              click: () => onOpenEdit?.(f), // ✅ to‘liq obyekt yuboramiz
              dblclick: () => onFlyTo?.([c.lat, c.lng], 17),
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

                {/* 🔢 Hisoblangan maydon badge */}
                {areaM2 != null && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "4px 8px",
                      border: "1px solid #e5e7eb",
                      borderRadius: 999,
                      background: "#f8fafc",
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  >
                    <strong>Maydon:</strong>
                    <span>
                      {areaM2.toLocaleString()} m²{" "}
                      <span style={{ opacity: 0.7 }}>
                        ({Number(areaHa.toFixed(4)).toLocaleString()} ga)
                      </span>
                    </span>
                  </div>
                )}

                {/* maydonlar (eski popup tarkibi bilan mos) */}
                <div style={{ display: "grid", gap: 6 }}>
                  {schema.map((fld) => {
                    const val = details[fld.key];
                    if (
                      val === null ||
                      val === undefined ||
                      String(val).trim?.() === ""
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
                        <div style={{ fontWeight: 600 }}>{String(val)}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button
                    className="pp-edit-react"
                    onClick={() => onOpenEdit?.(f)} // ✅ obyekt
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Tahrirlash
                  </button>
                  <button
                    className="pp-zoom-react"
                    onClick={() => onFlyTo?.([c.lat, c.lng], 17)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Zoom
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })
      .filter(Boolean);
  }, [facilities, onFlyTo, onOpenEdit, byCode, labelFor]);

  /* ---------------------------- GeoJSON style ---------------------------- */
  const style = useCallback((feature) => {
    const col =
      feature?.properties?.color || typeColor(feature?.properties?.type);
    return {
      color: col,
      weight: 2, // eski qiymat
      fillOpacity: 0.15, // eski qiymat
      fillColor: col,
      dashArray: "3", // eski qiymat
    };
  }, []);

  /* ----------------------- GeoJSON per-feature callback ------------------- */
  const onEach = useCallback(
    (feature, layer) => {
      const id = feature?.properties?.id;
      const f = id != null ? facilityById.get(id) : null;
      if (!f) return;

      const typeLabel = labelFor(f.type) || f.type;
      const orgLabel =
        f.orgName || f.org?.name || (f.orgId != null ? `Org #${f.orgId}` : "—");
      const details = f.attributes || f.details || {};

      // 🔢 Hisoblangan maydon (m²/ga)
      let areaBlock = "";
      try {
        const a = areaOfGeometryM2(f.geometry);
        if (Number.isFinite(a)) {
          const m2 = Math.round(a).toLocaleString();
          const ha = Number((a / 10000).toFixed(4)).toLocaleString();
          areaBlock = `
            <div style="display:inline-flex;align-items:center;gap:8px;padding:4px 8px;border:1px solid #e5e7eb;border-radius:999px;background:#f8fafc;font-size:12px;margin:6px 0 8px;">
              <strong>Maydon:</strong>
              <span>${m2} m² <span style="opacity:.7">(${ha} ga)</span></span>
            </div>
          `;
        }
      } catch {}

      const rows = (
        Array.isArray(byCode.get(f.type)?.schema)
          ? byCode.get(f.type).schema
          : []
      )
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
          ${areaBlock}
          ${rows}
          <div style="margin-top:8px; display:flex; gap:8px;">
            <button class="pp-edit" data-id="${id}" style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;cursor:pointer">Tahrirlash</button>
            <button class="pp-zoom" data-id="${id}" style="padding:6px 10px;border-radius:8px;border:1px solid #e5e7eb;background:#fff;cursor:pointer">Zoom</button>
          </div>
        </div>
      `;

      layer.bindPopup(html);
      try {
        layer.bringToFront();
      } catch {}

      layer.on("popupopen", (e) => {
        const el = e.popup?._contentNode;
        if (!el) return;
        const btnEdit = el.querySelector(".pp-edit");
        const btnZoom = el.querySelector(".pp-zoom");
        if (btnEdit) btnEdit.addEventListener("click", () => onOpenEdit?.(f)); // ✅ obyekt
        if (btnZoom) {
          const c = centroidOfGeometry(f.geometry);
          if (c && isValidLatLng(c) && onFlyTo) onFlyTo([c.lat, c.lng], 17);
        }
      });
    },
    [facilityById, onFlyTo, onOpenEdit, byCode, labelFor]
  );

  return (
    <>
      {showPolys && fc.features.length > 0 && (
        <GeoJSON
          key={geoKey}
          data={fc}
          style={style}
          onEachFeature={onEach}
          pane="facilities-polys" // eski Pane nomi
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
