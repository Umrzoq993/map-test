// src/components/map/FacilityMarkers.jsx
import { Marker, Popup } from "react-leaflet";
import { badgeIconFor } from "./mapIcons";
import FacilityPopupCard from "./FacilityPopupCard";

export default function FacilityMarkers({ facilities, onEdit, onDelete }) {
  return (
    <>
      {(facilities || []).map((f) => {
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
              <FacilityPopupCard
                f={f}
                onEdit={() => onEdit(f)}
                onDelete={() => onDelete(f)}
              />
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
