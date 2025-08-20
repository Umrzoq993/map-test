import { useCallback, useMemo, useRef } from "react";
import { GeoJSON, Marker, Pane, Popup } from "react-leaflet";
import { badgeIconFor, iconFor, typeColor } from "./mapIcons";

/** GeoJSON centroid helpers */
function centroidOfGeometry(geometry) {
  if (!geometry || !geometry.type) return null;
  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates || [];
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }
  if (geometry.type === "Polygon")
    return centroidOfPolygon(geometry.coordinates);
  if (geometry.type === "MultiPolygon") {
    let best = null,
      bestArea = -Infinity;
    for (const poly of geometry.coordinates || []) {
      const c = centroidOfPolygon(poly);
      if (c && c.area > bestArea) {
        bestArea = c.area;
        best = { lat: c.lat, lng: c.lng };
      }
    }
    return best;
  }
  return null;
}
function centroidOfPolygon(rings) {
  if (!rings || !rings[0] || rings[0].length < 3) return null;
  const outer = rings[0];
  let area = 0,
    cx = 0,
    cy = 0;
  for (let i = 0, j = outer.length - 1; i < outer.length; j = i++) {
    const [x1, y1] = outer[j],
      [x2, y2] = outer[i];
    const f = x1 * y2 - x2 * y1;
    area += f;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  if (area === 0) {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const [x, y] of outer) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    return { lat: (minY + maxY) / 2, lng: (minX + maxX) / 2, area: 0 };
  }
  area *= 0.5;
  cx /= 6 * area;
  cy /= 6 * area;
  return { lat: cy, lng: cx, area: Math.abs(area) };
}

export default function FacilitiesLayer({
  facilities = [],
  showPolys = true,
  onFlyTo, // ({lat,lng,zoom,ts})
  onEditClick, // (facility)
  onDeleteClick, // (facility)
}) {
  const geoJsonRef = useRef(null);

  const fc = useMemo(() => {
    const features = facilities
      .filter((f) => f.geometry && f.geometry.type)
      .map((f) => ({
        type: "Feature",
        geometry: f.geometry,
        properties: {
          id: f.id,
          name: f.name,
          type: f.type,
          status: f.status,
          lat: f.lat,
          lng: f.lng,
          zoom: f.zoom,
        },
      }));
    return { type: "FeatureCollection", features };
  }, [facilities]);

  const polyStyle = useCallback((feature) => {
    const col = typeColor(feature?.properties?.type);
    return {
      color: col,
      weight: 2,
      fillColor: col,
      fillOpacity: 0.15,
      dashArray: "3",
    };
  }, []);

  const onEachFeature = useCallback(
    (feature, layer) => {
      const p = feature.properties || {};
      layer.bindPopup(`
      <div style="min-width:200px">
        <div style="font-weight:700">${p.name ?? "Facility"}</div>
        <div style="font-size:12px;opacity:.8">${p.type ?? ""} • ${
        p.status ?? ""
      }</div>
      </div>
    `);
      layer.on("mouseover", () => {
        layer.setStyle({ weight: 3, fillOpacity: 0.25 });
        layer.bringToFront();
      });
      layer.on("mouseout", () => {
        if (geoJsonRef.current) geoJsonRef.current.resetStyle(layer);
      });
      layer.on("click", () => {
        const c = layer.getBounds ? layer.getBounds().getCenter() : null;
        if (c && onFlyTo)
          onFlyTo({
            lat: c.lat,
            lng: c.lng,
            zoom: p.zoom ?? 16,
            ts: Date.now(),
          });
      });
    },
    [onFlyTo]
  );

  const centroidMarkers = useMemo(
    () =>
      facilities
        .filter(
          (f) => f.geometry && f.geometry.type && f.geometry.type !== "Point"
        )
        .map((f) => {
          const c =
            centroidOfGeometry(f.geometry) ||
            (Number.isFinite(f.lat) && Number.isFinite(f.lng)
              ? { lat: f.lat, lng: f.lng }
              : null);
          if (!c) return null;
          return (
            <Marker
              key={`fc-${f.id}`}
              position={[c.lat, c.lng]}
              icon={badgeIconFor(f.type, 28)}
              pane="facilities-centroids"
            >
              <Popup>
                <div style={{ minWidth: 220 }}>
                  <div style={{ fontWeight: 700 }}>{f.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
                    {f.type} • {f.status}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => onEditClick?.(f)} style={btnStyle}>
                      Edit
                    </button>
                    <button
                      onClick={() => onDeleteClick?.(f)}
                      style={{ ...btnStyle, background: "#fff0f0" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })
        .filter(Boolean),
    [facilities, onEditClick, onDeleteClick]
  );

  const pointMarkers = useMemo(
    () =>
      facilities
        .map((f) => {
          const hasPoly = !!(
            f.geometry &&
            f.geometry.type &&
            f.geometry.type !== "Point"
          );
          if (hasPoly) return null;
          const lat = Number.isFinite(f.lat)
            ? f.lat
            : f.geometry?.type === "Point"
            ? f.geometry.coordinates[1]
            : null;
          const lng = Number.isFinite(f.lng)
            ? f.lng
            : f.geometry?.type === "Point"
            ? f.geometry.coordinates[0]
            : null;
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          return (
            <Marker
              key={`f-${f.id}`}
              position={[lat, lng]}
              icon={badgeIconFor(f.type, 28)}
              pane="facilities-markers"
            >
              <Popup>
                <div style={{ minWidth: 220 }}>
                  <div style={{ fontWeight: 700 }}>{f.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
                    {f.type} • {f.status}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => onEditClick?.(f)} style={btnStyle}>
                      Edit
                    </button>
                    <button
                      onClick={() => onDeleteClick?.(f)}
                      style={{ ...btnStyle, background: "#fff0f0" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })
        .filter(Boolean),
    [facilities, onEditClick, onDeleteClick]
  );

  return (
    <>
      <Pane name="facilities-polys" style={{ zIndex: 410 }} />
      <Pane name="facilities-centroids" style={{ zIndex: 420 }} />
      <Pane name="facilities-markers" style={{ zIndex: 430 }} />

      {showPolys && fc.features.length > 0 && (
        <GeoJSON
          data={fc}
          style={polyStyle}
          onEachFeature={onEachFeature}
          pane="facilities-polys"
          ref={geoJsonRef}
        />
      )}
      {showPolys && centroidMarkers}
      {pointMarkers}
    </>
  );
}

const btnStyle = {
  padding: "6px 10px",
  border: "1px solid #e3e6eb",
  borderRadius: 6,
  cursor: "pointer",
  background: "#fff",
};
