// src/constants/facilityTypes.js

// UI’da ko‘rinadigan 11 yo‘nalish (front-level)
export const FRONT_TYPES = [
  "GREENHOUSE", // Issiqxona
  "POULTRY_MEAT", // Tovuqxona (go‘sht)
  "POULTRY_EGG", // Tovuqxona (tuxum)
  "TURKEY", // Kurkaxona
  "COWSHED", // Molxona
  "SHEEPFOLD", // Qo‘yxona
  "WORKSHOP_SAUSAGE", // Ishlab chiqarish sexi (kolbasa)
  "WORKSHOP_COOKIE", // Ishlab chiqarish sexi (pechenye)
  "AUX_LAND", // Yordamchi xo‘jalik yeri
  "BORDER_LAND", // Chegara oldi yeri
  "FISHPOND", // Baliqchilik ko‘li
];

// O‘zbekcha yorliqlar
export const TYPE_LABELS = {
  GREENHOUSE: "Issiqxona",
  POULTRY_MEAT: "Tovuqxona (go‘sht)",
  POULTRY_EGG: "Tovuqxona (tuxum)",
  TURKEY: "Kurkaxona",
  COWSHED: "Molxona",
  SHEEPFOLD: "Qo‘yxona",
  // Standart: to‘liq nom "Ishlab chiqarish sexi (...)"
  WORKSHOP_SAUSAGE: "Ishlab chiqarish sexi (kolbasa)",
  WORKSHOP_COOKIE: "Ishlab chiqarish sexi (pechenye)",
  AUX_LAND: "Yordamchi xo‘jalik yeri",
  BORDER_LAND: "Chegara oldi yeri",
  FISHPOND: "Baliqchilik ko‘li",
};

// Front -> backend enum moslash
export const FRONT_TO_BACK = {
  GREENHOUSE: "GREENHOUSE",
  POULTRY_MEAT: "POULTRY",
  POULTRY_EGG: "POULTRY",
  TURKEY: "TURKEY",
  COWSHED: "COWSHED",
  SHEEPFOLD: "SHEEPFOLD",
  WORKSHOP_SAUSAGE: "WORKSHOP",
  WORKSHOP_COOKIE: "WORKSHOP",
  AUX_LAND: "AUX_LAND",
  BORDER_LAND: "BORDER_LAND",
  FISHPOND: "FISHPOND",
};

// Ranglar (xarita uchun)
export const TYPE_COLORS = {
  GREENHOUSE: "#16a34a",
  POULTRY_MEAT: "#ef4444",
  POULTRY_EGG: "#f59e0b",
  TURKEY: "#a855f7",
  COWSHED: "#6b7280",
  SHEEPFOLD: "#10b981",
  WORKSHOP_SAUSAGE: "#dc2626",
  WORKSHOP_COOKIE: "#ea580c",
  AUX_LAND: "#22c55e",
  BORDER_LAND: "#0ea5e9",
  FISHPOND: "#3b82f6",
};

export function colorFor(frontType) {
  return TYPE_COLORS[frontType] || "#64748b";
}

/**
 * UI dagi front filter holatidan backendga yuboriladigan enumlar ro‘yxati
 * (POULTRY_MEAT/POULTRY_EGG -> POULTRY, WORKSHOP_* -> WORKSHOP)
 */
export function backTypesFromFilter(typeFilter) {
  const s = new Set();
  Object.entries(typeFilter).forEach(([front, on]) => {
    if (!on) return;
    const back = FRONT_TO_BACK[front];
    if (back) s.add(back);
  });
  return Array.from(s);
}

/** Backend enumini labelga aylantirish (POULTRY/WORKSHOP umumiy ko‘rinishda) */
export function labelForBack(backType) {
  switch (backType) {
    case "POULTRY":
      return "Tovuqxona";
    case "WORKSHOP":
      return "Ishlab chiqarish sexi";
    default:
      return TYPE_LABELS[backType] || backType;
  }
}

/** Backend enumini rangga aylantirish (POULTRY/WORKSHOP uchun default front rangi) */
export function colorForBack(backType) {
  switch (backType) {
    case "POULTRY":
      return TYPE_COLORS.POULTRY_MEAT;
    case "WORKSHOP":
      return TYPE_COLORS.WORKSHOP_SAUSAGE;
    default:
      return TYPE_COLORS[backType] || "#64748b";
  }
}
