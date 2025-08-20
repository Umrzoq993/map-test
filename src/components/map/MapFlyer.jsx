// src/components/map/MapFlyer.jsx
import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function MapFlyer({ target } = {}) {
  const map = useMap();
  useEffect(() => {
    if (!target || typeof target !== "object") return;
    const { lat, lng, zoom = 13 } = target;
    if (typeof lat !== "number" || typeof lng !== "number") return;

    const curZoom = map.getZoom();
    const midZoom = Math.max(3, curZoom - 3);
    map.flyTo(map.getCenter(), midZoom, { duration: 0.6, animate: true });
    const t = setTimeout(() => {
      map.flyTo([lat, lng], zoom, { duration: 1.2, animate: true });
    }, 650);
    return () => clearTimeout(t);
  }, [target?.ts]);
  return null;
}
