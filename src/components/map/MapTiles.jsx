// src/components/map/MapTiles.jsx
import React from "react";
import { TileLayer } from "react-leaflet";

/**
 * OFFLINE XYZ yoki TMS tiles (z/x/y.{ext}) uchun qatlam.
 *
 * ⚙️ Konfiguratsiya (env orqali boshqariladi):
 * - VITE_TILE_URL         -> tile URL shablon (masalan: http://localhost:8008/{z}/{x}/{y}.png)
 * - VITE_TILE_MIN_ZOOM    -> minimal zoom (default: 0)
 * - VITE_TILE_MAX_ZOOM    -> maksimal zoom (default: 19)
 * - VITE_TILE_TMS         -> "true" bo‘lsa TMS rejimida ishlaydi (Y teskari hisoblanadi)
 * - VITE_TILE_ATTRIBUTION -> attribution matni
 *
 * Misol:
 *   VITE_TILE_URL=http://localhost:8008/{z}/{x}/{y}.jpg
 *   VITE_TILE_TMS=true
 */

const envBool = (v, def = false) => {
  if (v === undefined || v === null) return def;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
};

const DEFAULT_URL =
  import.meta.env.VITE_TILE_URL || "http://localhost:8008/{z}/{x}/{y}.jpg";

const DEFAULT_MIN_ZOOM = Number(
  import.meta.env.VITE_TILE_MIN_ZOOM ?? /* default */ 0
);

const DEFAULT_MAX_ZOOM = Number(
  import.meta.env.VITE_TILE_MAX_ZOOM ?? /* default */ 19
);

const DEFAULT_TMS = envBool(import.meta.env.VITE_TILE_TMS, /* default */ false);

const DEFAULT_ATTR =
  import.meta.env.VITE_TILE_ATTRIBUTION ?? "&copy; Offline Tiles";

export default function MapTiles(props) {
  const {
    url = DEFAULT_URL,
    minZoom = DEFAULT_MIN_ZOOM,
    maxZoom = DEFAULT_MAX_ZOOM,
    tms = DEFAULT_TMS, // ⚠️ env bilan boshqariladi
    attribution = DEFAULT_ATTR,
    // detectRetina yoki crossOrigin ni majburan qo‘ymaymiz — server tayyor bo‘lmasligi mumkin
    ...rest
  } = props;

  return (
    <TileLayer
      url={url}
      minZoom={minZoom}
      maxZoom={maxZoom}
      tms={tms}
      attribution={attribution}
      {...rest}
    />
  );
}

// Default konfiguratsiyalarni tashqarida ishlatish uchun eksport
// eslint-disable-next-line react-refresh/only-export-components
export const OFFLINE_DEFAULTS = {
  url: DEFAULT_URL,
  minZoom: DEFAULT_MIN_ZOOM,
  maxZoom: DEFAULT_MAX_ZOOM,
  tms: DEFAULT_TMS,
  attribution: DEFAULT_ATTR,
};
