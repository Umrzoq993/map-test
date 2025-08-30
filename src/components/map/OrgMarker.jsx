// src/components/map/OrgMarker.jsx
import { useEffect, useRef } from "react";
import { Marker, useMap } from "react-leaflet";
import { attachOrgPopup } from "./orgPopup";
// ❗️ Leaflet default ikon patch — bir marta import qilinsa bas
import "./leafletDefaultIconPatch";

/**
 * org: { id, name, lat, lng, zoom?, level?, type?, kind? }
 * open: mount paytida auto-open
 */
export default function OrgMarker({ org, open = true, onEdit, onOpenTable }) {
  const ref = useRef(null);
  const map = useMap();

  useEffect(() => {
    const mk = ref.current;
    if (
      !mk ||
      !org?.id ||
      !Number.isFinite(org.lat) ||
      !Number.isFinite(org.lng)
    )
      return;
    attachOrgPopup(mk, org, { map, onEdit, onOpenTable });
    if (open) mk.openPopup();
  }, [org, open, onEdit, onOpenTable, map]);

  if (!org) return null;

  return (
    <Marker
      ref={ref}
      position={[org.lat, org.lng]}
      // 👉 Ikon berilmaydi: Leaflet default (ko'k pin) ishlaydi
      zIndexOffset={900} // orglar har doim ustida ko'rinsin
      pane="facilities-markers"
    />
  );
}
