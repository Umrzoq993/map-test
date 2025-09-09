// src/components/map/MapTiles.jsx
import { createLayerComponent } from "@react-leaflet/core";
import L from "leaflet";
import React from "react";
import { TileLayer } from "react-leaflet";

/**
 * OFFLINE XYZ yoki TMS tiles (z/x/y.{ext}) uchun oddiy qatlam.
 *
 * ENV:
 * - VITE_TILE_URL
 * - VITE_TILE_MIN_ZOOM
 * - VITE_TILE_MAX_ZOOM
 * - VITE_TILE_TMS
 * - VITE_TILE_ATTRIBUTION
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
    tms = DEFAULT_TMS,
    attribution = DEFAULT_ATTR,
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

// ======== SAS PLANET DEFAULT STORE (foldered) ========
// Path format: /z{z}/{floor(x/1024)}/x{x}/{floor(y/1024)}/y{y}.{ext}
// Misol: z13/2/x2678/1/y1493.jpg
const SasPlanetTileLayer = L.TileLayer.extend({
  initialize: function (baseUrl, options = {}) {
    L.TileLayer.prototype.initialize.call(this, baseUrl, options);
    this.options.ext = options.ext || "jpg";
  },
  getTileUrl: function (coords) {
    const z = coords.z;
    let { x, y } = coords;

    // TMS bo'lsa Y ni ag'daramiz
    if (this.options.tms) {
      const n = Math.pow(2, z);
      y = n - y - 1;
    }

    const xFolder = Math.floor(x / 1024);
    const yFolder = Math.floor(y / 1024);
    const ext = this.options.ext || "jpg";
    const base = this._url.endsWith("/") ? this._url.slice(0, -1) : this._url;

    return `${base}/z${z + 1}/${xFolder}/x${x}/${yFolder}/y${y}.${ext}`;
  },
});

const createSasPlanet = (props, context) => {
  const { url, ...opts } = props;
  const instance = new SasPlanetTileLayer(url, opts);
  return { instance, context };
};

/**
 * React-Leaflet komponenti:
 * <SasPlanetTiles url="http://10.25.1.90/vesat" ext="jpg" tms={false} />
 */
export const SasPlanetTiles = createLayerComponent(createSasPlanet);

// Default konfiguratsiyalarni tashqarida ishlatish uchun eksport
// eslint-disable-next-line react-refresh/only-export-components
export const OFFLINE_DEFAULTS = {
  url: DEFAULT_URL,
  minZoom: DEFAULT_MIN_ZOOM,
  maxZoom: DEFAULT_MAX_ZOOM,
  tms: DEFAULT_TMS,
  attribution: DEFAULT_ATTR,
};
