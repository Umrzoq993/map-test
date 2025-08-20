// src/components/map/FacilityGeoLayer.jsx
import { useMemo, useCallback, useRef } from "react";
import { GeoJSON, Marker, Popup } from "react-leaflet";
import { typeColor, badgeIconFor } from "./mapIcons";
import { centroidOfGeometry } from "../../utils/geo";

export default function FacilityGeoLayer({
  facilities,
  showPolys = true,
  onFlyTo,
}) {
  const geoJsonRef = useRef(null);

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

  // 🔑 features o‘zgarsa GeoJSON ni qayta mount qilish uchun unique key
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
      layer.bindPopup(`
      <div style="min-width:200px">
        <div style="font-weight:700">${p.name || "Facility"}</div>
        <div style="font-size:12px;opacity:.8">${p.type || ""} • ${
        p.status || ""
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
        if (!onFlyTo) return;
        const c = layer.getBounds ? layer.getBounds().getCenter() : null;
        if (c)
          onFlyTo({
            lat: c.lat,
            lng: c.lng,
            zoom: p.zoom || 16,
            ts: Date.now(),
          });
      });
    },
    [onFlyTo]
  );

  const centroidBadges = useMemo(() => {
    return (facilities || [])
      .filter(
        (f) => f.geometry && f.geometry.type && f.geometry.type !== "Point"
      )
      .map((f) => {
        const c = centroidOfGeometry(f.geometry);
        if (!c) return null;
        return (
          <Marker
            key={`fc-${f.id}`}
            position={[c.lat, c.lng]}
            icon={badgeIconFor(f.type, 28)}
            pane="facilities-centroids"
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                <div style={{ fontWeight: 700 }}>{f.name}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {f.type} • {f.status}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })
      .filter(Boolean);
  }, [facilities]);

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
