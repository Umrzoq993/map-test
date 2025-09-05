// src/components/map/OrgMarker.jsx
import { useEffect, useRef, useMemo } from "react";
import { Marker, useMap } from "react-leaflet";
import { attachOrgPopup } from "./orgPopup";
// ❗️ Leaflet default ikon patch — bir marta import qilinsa bas
import "./leafletDefaultIconPatch";
import L from "leaflet";

// Ranglar (org.level ga qarab). Fallback: ko'k (Leaflet default bilan yaqin)
const LEVEL_COLORS = {
  0: { marker: "#1d4ed8", shadow: undefined }, // Respublika
  1: { marker: "#059669" }, // Viloyat
  2: { marker: "#d97706" }, // Tuman
  3: { marker: "#9333ea" }, // Kichik bo'lim
  4: { marker: "#db2777" }, // Yana pastki
};

function buildSvg(color) {
  const c = color || "#1d4ed8";
  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41" fill="none">
    <path d="M12.5 0C5.596 0 0 5.716 0 12.756c0 3.07 1.106 5.882 2.953 8.15 3.245 4.008 8.27 11.988 9.163 19.463.068.574.527.631.93.631.403 0 .862-.057.93-.63.893-7.476 5.918-15.456 9.163-19.464C23.894 18.64 25 15.827 25 12.757 25 5.716 19.404 0 12.5 0Z" fill="${c}" stroke="white" stroke-width="1.2"/>
    <circle cx="12.5" cy="12.8" r="5.3" fill="white"/>
  </svg>`;
}

function svgIcon(color) {
  const svg = buildSvg(color);
  return L.icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -34],
    shadowUrl: undefined,
  });
}

/**
 * org: { id, name, lat, lng, zoom?, level?, type?, kind? }
 * open: mount paytida auto-open
 */
export default function OrgMarker({ org, open = true, onEdit, onOpenTable }) {
  const ref = useRef(null);
  const map = useMap();

  const icon = useMemo(() => {
    if (!org) return null;
    const lvl = Number.isFinite(org.level) ? org.level : null;
    const color = LEVEL_COLORS[lvl]?.marker || LEVEL_COLORS[0].marker;
    return svgIcon(color);
  }, [org]);

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
      icon={icon || undefined}
      zIndexOffset={900}
      pane="facilities-markers"
    />
  );
}
