// src/hooks/useFacilityTypes.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { listActiveFacilityTypes } from "../api/facilityTypes";

const FacilityTypesContext = createContext(null);

// Legacy aliases for backward-compatible slugs in routes
const LEGACY_SLUG_TO_CODE = {
  greenhouse: "GREENHOUSE",
  "poultry-meat": "POULTRY_MEAT",
  "poultry-egg": "POULTRY_EGG",
  poultry: "POULTRY_MEAT", // legacy
  turkey: "TURKEY",
  cowshed: "COWSHED",
  sheepfold: "SHEEPFOLD",
  "workshops-sausage": "WORKSHOP_SAUSAGE",
  "workshops-cookie": "WORKSHOP_COOKIE",
  workshops: "WORKSHOP_SAUSAGE", // legacy
  "aux-lands": "AUX_LAND",
  "border-lands": "BORDER_LAND",
  "fish-ponds": "FISHPOND",
  "fish-farm": "FISHPOND", // legacy
  "aux-land": "AUX_LAND",
  "border-land": "BORDER_LAND",
};

// Preferred slug generator for codes
function defaultSlugFor(code) {
  if (!code) return "";
  // Keep legacy pluralization for WORKSHOP_*
  if (code.startsWith("WORKSHOP_")) {
    return code.replace(/^WORKSHOP_/, "workshops-").toLowerCase();
  }
  if (code === "AUX_LAND") return "aux-lands";
  if (code === "BORDER_LAND") return "border-lands";
  if (code === "FISHPOND") return "fish-ponds";
  return code.toLowerCase().replace(/_/g, "-");
}

function parseSlugToCode(slug, knownCodes) {
  if (!slug) return "";
  const lower = String(slug).toLowerCase();
  if (LEGACY_SLUG_TO_CODE[lower]) return LEGACY_SLUG_TO_CODE[lower];
  // Fallback: kebab -> SNAKE
  const guess = lower.toUpperCase().replace(/-/g, "_");
  if (Array.isArray(knownCodes) && knownCodes.includes(guess)) return guess;
  return guess; // still return guess; backend will 404 if unknown
}

export function FacilityTypesProvider({ children }) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await listActiveFacilityTypes();
        if (!mounted) return;
        setTypes(Array.isArray(res) ? res : []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Turlarni yuklashda xatolik");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const byCode = useMemo(() => {
    const m = new Map();
    for (const t of types) if (t?.code) m.set(t.code, t);
    return m;
  }, [types]);

  const codes = useMemo(() => types.map((t) => t.code), [types]);

  const label = (code) => {
    if (!code) return "";
    const t = byCode.get(code);
    return t?.nameUz || t?.nameRu || code;
  };
  const color = (code) => {
    const t = byCode.get(code);
    return t?.color || "#64748b";
  };
  const emoji = (code) => {
    const t = byCode.get(code);
    return t?.iconEmoji || "📍";
  };
  const iconUrl = (code) => {
    const t = byCode.get(code);
    return t?.iconUrl || null;
  };
  const slugFor = (code) => defaultSlugFor(code);
  const codeFromSlug = (slug) => parseSlugToCode(slug, codes);

  const value = useMemo(
    () => ({
      types,
      loading,
      error,
      byCode,
      codes,
      label,
      color,
      emoji,
      iconUrl,
      slugFor,
      codeFromSlug,
    }),
    [types, loading, error, byCode, codes]
  );

  return (
    <FacilityTypesContext.Provider value={value}>
      {children}
    </FacilityTypesContext.Provider>
  );
}

export function useFacilityTypes() {
  const ctx = useContext(FacilityTypesContext);
  if (!ctx) {
    throw new Error(
      "useFacilityTypes must be used within FacilityTypesProvider"
    );
  }
  return ctx;
}
