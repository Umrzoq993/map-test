// src/config/mapLayers.js
// Centralizes base map layer configuration from .env
// Usage:
// - Define VITE_MAP_LAYER_COUNT=N
// - For each i in 1..N define:
//   VITE_MAP_LAYER_i_NAME, VITE_MAP_LAYER_i_URL, VITE_MAP_LAYER_i_TMS,
//   VITE_MAP_LAYER_i_MIN_ZOOM, VITE_MAP_LAYER_i_MAX_ZOOM,
//   VITE_MAP_LAYER_i_ATTR, VITE_MAP_LAYER_i_CHECKED
//
// Backwards-compatible fallbacks:
// - If not provided, defaults to Vesat (tms) and OSM.uz layers.
// - Supports legacy Vesat envs: VITE_TILE_VESAT_BASE, VITE_TILE_VESAT_EXT, VITE_TILE_VESAT_TMS
// - Supports overriding OSM URL via VITE_OSM_URL

const env = import.meta.env || {};

const envBool = (v, def = false) => {
  if (v === undefined || v === null) return def;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
};

function parseIntOr(v, def) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

/**
 * Returns array of base layer configs:
 * { name, url, tms, minZoom, maxZoom, attr, checked }
 */
export function getBaseLayers() {
  const count = parseIntOr(env.VITE_MAP_LAYER_COUNT, 0);
  const layers = [];

  if (count > 0) {
    for (let i = 1; i <= count; i++) {
      const p = (k) => env[`VITE_MAP_LAYER_${i}_${k}`];
      const url = p("URL");
      if (!url) continue; // skip incomplete
      const name = p("NAME") || `Layer ${i}`;
      layers.push({
        name,
        url,
        tms: envBool(p("TMS"), false),
        minZoom: parseIntOr(p("MIN_ZOOM"), 0),
        maxZoom: parseIntOr(p("MAX_ZOOM"), 19),
        attr: p("ATTR") || "",
        checked: envBool(p("CHECKED"), i === 1),
      });
    }
  }

  if (layers.length > 0) return layers;

  // ----- Fallbacks (2 layers: Vesat + OSM.uz) -----
  const VESAT_BASE = env.VITE_TILE_VESAT_BASE || "https://vesat.uz";
  const VESAT_EXT = env.VITE_TILE_VESAT_EXT || "jpg";
  const VESAT_TMS = envBool(env.VITE_TILE_VESAT_TMS, true);
  const OSM_URL = env.VITE_OSM_URL || "https://osm.uz/tile/{z}/{x}/{y}.png";

  return [
    {
      name: "Vesat (Gibrid)",
      url: `${VESAT_BASE}/{z}/{x}/{y}.${VESAT_EXT}`,
      tms: VESAT_TMS,
      minZoom: 0,
      maxZoom: 19,
      attr: "© Vesat",
      checked: true,
    },
    {
      name: "OSM.uz (XYZ)",
      url: OSM_URL,
      tms: false,
      minZoom: 0,
      maxZoom: 19,
      attr: "© OSM.uz & OpenStreetMap contributors",
      checked: false,
    },
  ];
}
