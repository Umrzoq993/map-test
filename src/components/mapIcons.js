import L from "leaflet";

const colorMap = {
  GREENHOUSE: "#16a34a",
  COWSHED: "#a16207",
  STABLE: "#7c3aed",
  FISHFARM: "#2563eb",
  WAREHOUSE: "#525252",
  ORCHARD: "#22c55e",
  FIELD: "#84cc16",
  POULTRY: "#dc2626",
  APIARY: "#f59e0b",
};

export const iconFor = (type = "WAREHOUSE") =>
  L.divIcon({
    className: "facility-pin",
    html: `<span style="
      display:inline-block;width:12px;height:12px;border-radius:50%;
      background:${colorMap[type] || "#525252"};
      border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,.25);
    "></span>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
