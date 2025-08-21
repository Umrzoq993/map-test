// src/components/map/MapTiles.jsx
// Dark/Lite rejimga qarab tile provider tanlaydi.
// Agar MAPTILER_KEY bo'lsa, MapTiler-ning High-Contrast Dark/OSM Basic xaritalaridan ham foydalanish mumkin.
import { TileLayer } from "react-leaflet";

function pickProvider({ dark }) {
  // 1) MapTiler (ixtiyoriy, eng barqaror) — .env: VITE_MAPTILER_KEY=xxxx
  const mtKey = import.meta.env.VITE_MAPTILER_KEY;
  if (mtKey) {
    if (dark) {
      return {
        url: `https://api.maptiler.com/maps/toner-v2/{z}/{x}/{y}.png?key=${mtKey}`,
        // variantlar: "toner-v2" (high-contrast), "darkmatter", "dataviz"
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> & <a href="https://www.maptiler.com/copyright/">MapTiler</a>',
        maxZoom: 20,
      };
    }
    return {
      url: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${mtKey}`,
      attribution:
        '&copy; OSM & <a href="https://www.maptiler.com/">MapTiler</a>',
      maxZoom: 20,
    };
  }

  // 2) CARTO Dark Matter (jamoada keng qo'llanadi) — API keysiz, ammo qoidalari bor.
  if (dark) {
    return {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      subdomains: "abcd",
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20,
    };
  }

  // 3) Default: OpenStreetMap Standard
  return {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: "abc",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  };
}

export default function MapTiles({ dark }) {
  const { url, attribution, subdomains, maxZoom } = pickProvider({ dark });
  // key bilan remount: URL o'zgarsa layer qayta yuklanadi (flashsiz ishonchli switching)
  return (
    <TileLayer
      key={dark ? "tiles-dark" : "tiles-light"}
      url={url}
      attribution={attribution}
      subdomains={subdomains}
      maxZoom={maxZoom}
    />
  );
}
