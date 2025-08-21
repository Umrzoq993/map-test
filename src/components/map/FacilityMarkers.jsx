// src/components/map/FacilityMarkers.jsx
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { centroidOfGeometry } from "../../utils/geo";

const defaultIcon = new L.Icon.Default();

export default function FacilityMarkers({ facilities, onOpenEdit }) {
  if (!Array.isArray(facilities) || facilities.length === 0) return null;

  return (
    <>
      {facilities.map((f) => {
        const pos = f.centroid
          ? [f.centroid.lat, f.centroid.lng]
          : pointFromGeom(f.geometry) ||
            (f.lat && f.lng ? [f.lat, f.lng] : null);

        if (!pos) return null;

        return (
          <Marker key={`fmk-${f.id}`} position={pos} icon={defaultIcon}>
            <Popup>
              <div style={{ minWidth: 200 }}>
                <div style={{ fontWeight: 700 }}>{f.name}</div>
                <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
                  Tur: {f.type} {f.status ? `• ${f.status}` : ""}
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button className="btn" onClick={() => onOpenEdit?.(f)}>
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

function pointFromGeom(geometry) {
  if (!geometry) return null;
  const c = centroidOfGeometry(geometry);
  return c ? [c.lat, c.lng] : null;
}
