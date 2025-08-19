import L from "leaflet";

export const colorMap = {
  GREENHOUSE: "#16a34a", // 🌿
  COWSHED: "#a16207", // 🐄
  STABLE: "#7c3aed", // 🐎
  FISHFARM: "#2563eb", // 🐟
  WAREHOUSE: "#525252", // 🏚
  ORCHARD: "#22c55e", // 🍎
  FIELD: "#84cc16", // 🌾
  POULTRY: "#dc2626", // 🐔
  APIARY: "#f59e0b", // 🐝
};

export const emojiMap = {
  GREENHOUSE: "🌿",
  COWSHED: "🐄",
  STABLE: "🐎",
  FISHFARM: "🐟",
  WAREHOUSE: "🏚",
  ORCHARD: "🍎",
  FIELD: "🌾",
  POULTRY: "🐔",
  APIARY: "🐝",
};

export const typeColor = (type = "WAREHOUSE") => colorMap[type] || "#525252";

/** Kichik nuqta-marker (oldingi kabi) */
export const iconFor = (type = "WAREHOUSE") =>
  L.divIcon({
    className: "facility-pin",
    html: `<span style="
      display:inline-block;width:12px;height:12px;border-radius:50%;
      background:${typeColor(
        type
      )};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.25);
    "></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });

/** Poligon markazida ko‘rsatiladigan emoji-badge */
export const badgeIconFor = (type = "WAREHOUSE", size = 28) => {
  const col = typeColor(type);
  const emoji = emojiMap[type] || "📍";
  const pad = Math.round(size * 0.18);
  const fz = Math.round(size * 0.64);
  return L.divIcon({
    className: "facility-badge",
    html: `
      <div style="
        display:inline-flex;align-items:center;justify-content:center;
        width:${size}px;height:${size}px;border-radius:50%;
        background:${col}; color:#fff; border:2px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,.25);
        font-size:${fz}px; line-height:1; user-select:none;
      ">
        <span style="transform:translateY(-1px);padding:${pad}px">${emoji}</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};
