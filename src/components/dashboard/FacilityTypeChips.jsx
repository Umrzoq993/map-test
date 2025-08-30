import React from "react";

/**
 * Single-select facility chips.
 *
 * Props:
 * - value: string|null (tanlangan type yoki null)
 * - onChange: (next:string|null)=>void
 * - types: {key:string,label:string}[]  (ixtiyoriy, default pastda)
 * - loading?: boolean                    (ixtiyoriy)
 */
export default function FacilityTypeChips({
  value,
  onChange,
  types = DEFAULT_FACILITY_TYPES,
  loading = false,
}) {
  const handleClick = (key) => {
    if (loading) return;
    if (value === key) onChange?.(null); // toggle off
    else onChange?.(key);
  };

  const hasSelection = !!value;

  return (
    <div className="ftchips">
      {types.map((t) => {
        const active = value === t.key;
        const disabled = hasSelection && !active;
        return (
          <button
            key={t.key}
            type="button"
            className={`chip ${active ? "is-active" : ""} ${
              disabled ? "is-disabled" : ""
            }`}
            disabled={disabled}
            aria-pressed={active}
            onClick={() => handleClick(t.key)}
            title={t.label}
          >
            {t.label}
          </button>
        );
      })}

      {/* Tozalash: faqat tanlov bo'lganda ko'rsatamiz */}
      <button
        type="button"
        className="chip reset"
        onClick={() => onChange?.(null)}
        disabled={!hasSelection}
        title="Filterni bekor qilish"
      >
        Tozalash
      </button>
    </div>
  );
}

// Default ro'yxat (kerak bo'lsa tartib/nomlarini o'zgartirishingiz mumkin)
// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_FACILITY_TYPES = [
  { key: "GREENHOUSE", label: "Issiqxona" },
  { key: "FISHPOND", label: "Baliqchilik ko‘li" },
  { key: "BORDER_LAND", label: "Chegara oldi yer" },
  { key: "WORKSHOP_SAUSAGE", label: "Sex (kolbasa)" },
  { key: "WORKSHOP_COOKIE", label: "Sex (pechenye)" },
  { key: "POULTRY_MEAT", label: "Tovuqqona (go‘sht)" },
  { key: "POULTRY_EGG", label: "Tovuqqona (tuxum)" },
  { key: "TURKEY", label: "Kurkaxona" },
  { key: "COWSHED", label: "Molxona" },
  { key: "SHEEPFOLD", label: "Qo‘yxona" },
  { key: "AUX_LAND", label: "Yordamchi yer" },
];
