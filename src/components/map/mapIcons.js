// src/components/map/mapIcons.js
import L from "leaflet";
import { listActiveFacilityTypes } from "../../api/facilityTypes";

export const colorMap = {
  GREENHOUSE: "#16a34a",
  POULTRY_MEAT: "#dc2626",
  POULTRY_EGG: "#f59e0b",
  TURKEY: "#ea580c",
  COWSHED: "#a16207",
  SHEEPFOLD: "#7c3aed",
  WORKSHOP_SAUSAGE: "#525252",
  WORKSHOP_COOKIE: "#9ca3af",
  AUX_LAND: "#84cc16",
  BORDER_LAND: "#0ea5e9",
  FISHPOND: "#2563eb",
};

export const emojiMap = {
  GREENHOUSE: "🌿",
  POULTRY_MEAT: "🍗",
  POULTRY_EGG: "🥚",
  TURKEY: "🦃",
  COWSHED: "🐄",
  SHEEPFOLD: "🐑",
  WORKSHOP_SAUSAGE: "🏭",
  WORKSHOP_COOKIE: "🍪",
  AUX_LAND: "🟩",
  BORDER_LAND: "🟦",
  FISHPOND: "🐟",
};

// Optional icon image url per type (populated from backend if provided)
export const iconUrlMap = {};

export const typeColor = (t = "GREENHOUSE") => colorMap[t] || "#3b82f6";

// Optional: bootstrap dynamic colors once per load
let loaded = false;
export async function loadDynamicTypeColors() {
  if (loaded) return;
  loaded = true;
  try {
    const defs = await listActiveFacilityTypes();
    if (Array.isArray(defs)) {
      defs.forEach((d) => {
        if (d?.code && d?.color) colorMap[d.code] = d.color;
        if (d?.code && d?.iconEmoji) emojiMap[d.code] = d.iconEmoji;
        if (d?.code && d?.iconUrl) iconUrlMap[d.code] = d.iconUrl;
      });
    }
  } catch {}
}

export const iconFor = (type = "GREENHOUSE") =>
  L.divIcon({
    className: "facility-pin",
    html: `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;
      background:${typeColor(
        type
      )};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.25);"></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });

export const badgeIconFor = (type = "GREENHOUSE", size = 28) => {
  const col = typeColor(type);
  const emoji = emojiMap[type] || "📍";
  const iconUrl = iconUrlMap[type] || null;
  const pad = Math.round(size * 0.18);
  const fz = Math.round(size * 0.64);
  return L.divIcon({
    className: "facility-badge",
    html: `<div style="display:inline-flex;align-items:center;justify-content:center;
      width:${size}px;height:${size}px;border-radius:50%;background:${col};color:#fff;border:2px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,.25);font-size:${fz}px;line-height:1;user-select:none;overflow:hidden;">
      ${
        iconUrl
          ? `<img src="${iconUrl}" alt="" style="width:${Math.round(
              size * 0.8
            )}px;height:${Math.round(
              size * 0.8
            )}px;object-fit:contain;filter:drop-shadow(0 1px 1px rgba(0,0,0,.2))" />`
          : `<span style=\"transform:translateY(-1px);padding:${pad}px\">${emoji}</span>`
      }
      </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};
