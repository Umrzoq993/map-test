// src/components/map/mapIcons.js
import L from "leaflet";

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

export const typeColor = (t = "GREENHOUSE") => colorMap[t] || "#3b82f6";

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
  const pad = Math.round(size * 0.18);
  const fz = Math.round(size * 0.64);
  return L.divIcon({
    className: "facility-badge",
    html: `<div style="display:inline-flex;align-items:center;justify-content:center;
      width:${size}px;height:${size}px;border-radius:50%;background:${col};color:#fff;border:2px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,.25);font-size:${fz}px;line-height:1;user-select:none;">
      <span style="transform:translateY(-1px);padding:${pad}px">${emoji}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};
