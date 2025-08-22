// src/data/facilityTypes.js
export const FACILITY_TYPES = {
  GREENHOUSE: {
    label: "Issiqxona",
    fields: [
      {
        key: "area_ha",
        label: "Umumiy yer maydoni",
        type: "number",
        suffix: "ga",
        rules: { required: true, min: 0 },
      },
      {
        key: "heating_type",
        label: "Isitish tizimi turi",
        type: "text",
        rules: { required: false, maxLength: 120 },
      },
      {
        key: "yield_amount",
        label: "Olinadigan mahsulot (tonna/yil)",
        type: "number",
        rules: { required: false, min: 0 },
      },
      {
        key: "revenue",
        label: "Olinadigan daromad",
        type: "number",
        rules: { required: false, min: 0 },
      },
      {
        key: "profit",
        label: "Olingan sof foyda",
        type: "number",
        rules: { required: false, min: 0 },
      },
      {
        key: "tenant",
        label: "Ijarachi",
        type: "text",
        rules: { required: false, maxLength: 120 },
      },
      {
        key: "government_decision",
        label: "Hukumat qarori",
        type: "text",
        rules: { required: false, maxLength: 160 },
      },
    ],
  },

  POULTRY: {
    label: "Tovuqxona",
    fields: [
      {
        key: "area_m2",
        label: "Umumiy yer maydoni",
        type: "number",
        suffix: "m²",
        rules: { required: true, min: 0 },
      },
      {
        key: "capacity",
        label: "Umumiy sig‘imi (bosh)",
        type: "number",
        rules: { required: true, min: 0, integer: true },
      },
      {
        key: "current",
        label: "Hozirda mavjud (bosh)",
        type: "number",
        rules: { required: false, min: 0, integer: true },
      },
      {
        key: "eggs_per_day",
        label: "Tuxum (dona/kun)",
        type: "number",
        rules: { required: false, min: 0, integer: true },
      },
      {
        key: "revenue",
        label: "Olinadigan daromad",
        type: "number",
        rules: { required: false, min: 0 },
      },
      {
        key: "profit",
        label: "Olingan sof foyda",
        type: "number",
        rules: { required: false, min: 0 },
      },
    ],
  },

  COWSHED: {
    label: "Molxona",
    fields: [
      {
        key: "area_m2",
        label: "Umumiy yer maydoni",
        type: "number",
        suffix: "m²",
        rules: { required: true, min: 0 },
      },
      {
        key: "capacity",
        label: "Umumiy sig‘imi (bosh)",
        type: "number",
        rules: { required: true, min: 0, integer: true },
      },
      {
        key: "current",
        label: "Hozirda mavjud (bosh)",
        type: "number",
        rules: { required: false, min: 0, integer: true },
      },
      {
        key: "milk_l_per_day",
        label: "Sut (litr/kun)",
        type: "number",
        rules: { required: false, min: 0 },
      },
      {
        key: "revenue",
        label: "Olinadigan daromad",
        type: "number",
        rules: { required: false, min: 0 },
      },
      {
        key: "profit",
        label: "Olingan sof foyda",
        type: "number",
        rules: { required: false, min: 0 },
      },
    ],
  },

  SHEEPFOLD: {
    label: "Qo‘yxona",
    fields: [
      {
        key: "area_m2",
        label: "Umumiy yer maydoni",
        type: "number",
        suffix: "m²",
        rules: { required: true, min: 0 },
      },
      {
        key: "capacity",
        label: "Umumiy sig‘imi (bosh)",
        type: "number",
        rules: { required: true, min: 0, integer: true },
      },
      {
        key: "current",
        label: "Hozirda mavjud (bosh)",
        type: "number",
        rules: { required: false, min: 0, integer: true },
      },
      {
        key: "product_kg",
        label: "Olinadigan mahsulot (kg)",
        type: "number",
        rules: { required: false, min: 0 },
      },
      {
        key: "revenue",
        label: "Olinadigan daromad",
        type: "number",
        rules: { required: false, min: 0 },
      },
      {
        key: "profit",
        label: "Olingan sof foyda",
        type: "number",
        rules: { required: false, min: 0 },
      },
    ],
  },

  FUR_FARM: {
    label: "Kurkaxona",
    fields: [
      {
        key: "area_m2",
        label: "Umumiy yer maydoni",
        type: "number",
        suffix: "m²",
        rules: { required: true, min: 0 },
      },
      {
        key: "capacity",
        label: "Umumiy sig‘imi (bosh)",
        type: "number",
        rules: { required: true, min: 0, integer: true },
      },
      {
        key: "current",
        label: "Hozirda mavjud (bosh)",
        type: "number",
        rules: { required: false, min: 0, integer: true },
      },
      {
        key: "production_units",
        label: "Yiliga mahsulot (dona)",
        type: "number",
        rules: { required: false, min: 0, integer: true },
      },
      {
        key: "revenue",
        label: "Olinadigan daromad",
        type: "number",
        rules: { required: false, min: 0 },
      },
      {
        key: "profit",
        label: "Olingan sof foyda",
        type: "number",
        rules: { required: false, min: 0 },
      },
    ],
  },

  FISH_PONDS: {
    label: "Baliq hovuzlari",
    fields: [
      {
        key: "pond_count",
        label: "Hovuzlar soni",
        type: "number",
        rules: { required: true, min: 0, integer: true },
      },
      {
        key: "area_ha",
        label: "Umumiy suv maydoni",
        type: "number",
        suffix: "ga",
        rules: { required: true, min: 0 },
      },
      {
        key: "fish_stock_kg",
        label: "Baliq zaxirasi (kg)",
        type: "number",
        rules: { required: false, min: 0 },
      },
      {
        key: "yield_amount",
        label: "Yillik hosil (kg)",
        type: "number",
        rules: { required: false, min: 0 },
      },
      {
        key: "revenue",
        label: "Olinadigan daromad",
        type: "number",
        rules: { required: false, min: 0 },
      },
      {
        key: "profit",
        label: "Olingan sof foyda",
        type: "number",
        rules: { required: false, min: 0 },
      },
    ],
  },

  WORKSHOP: {
    label: "Ishlab chiqarish sexi",
    fields: [
      {
        key: "area_m2",
        label: "Umumiy yer maydoni",
        type: "number",
        suffix: "m²",
        rules: { required: true, min: 0 },
      },
      {
        key: "staff_count",
        label: "Xodimlar soni",
        type: "number",
        rules: { required: true, min: 0, integer: true },
      },
      {
        key: "output_units",
        label: "Oylik ishlab chiqarish (dona)",
        type: "number",
        rules: { required: false, min: 0, integer: true },
      },
      {
        key: "revenue",
        label: "Olinadigan daromad",
        type: "number",
        rules: { required: false, min: 0 },
      },
      {
        key: "profit",
        label: "Olingan sof foyda",
        type: "number",
        rules: { required: false, min: 0 },
      },
    ],
  },

  AUX_LAND: {
    label: "Yordamchi xo‘jalik yerlari",
    fields: [
      {
        key: "area_ha",
        label: "Yer maydoni",
        type: "number",
        suffix: "ga",
        rules: { required: true, min: 0 },
      },
      {
        key: "usage",
        label: "Foydalanish maqsadi",
        type: "text",
        rules: { required: false, maxLength: 160 },
      },
      {
        key: "tenant",
        label: "Ijarachi",
        type: "text",
        rules: { required: false, maxLength: 120 },
      },
      {
        key: "government_decision",
        label: "Hukumat qarori",
        type: "text",
        rules: { required: false, maxLength: 160 },
      },
    ],
  },

  BORDER_LAND: {
    label: "Chegara oldi yerlari",
    fields: [
      {
        key: "area_ha",
        label: "Yer maydoni",
        type: "number",
        suffix: "ga",
        rules: { required: true, min: 0 },
      },
      {
        key: "protection_zone",
        label: "Himoya zonasi",
        type: "text",
        rules: { required: false, maxLength: 120 },
      },
      {
        key: "tenant",
        label: "Ijarachi",
        type: "text",
        rules: { required: false, maxLength: 120 },
      },
      {
        key: "government_decision",
        label: "Hukumat qarori",
        type: "text",
        rules: { required: false, maxLength: 160 },
      },
    ],
  },
};

export const FACILITY_TYPE_OPTIONS = Object.entries(FACILITY_TYPES).map(
  ([value, cfg]) => ({ value, label: cfg.label })
);
export const getFacilityTypeLabel = (code) =>
  FACILITY_TYPES?.[code]?.label || code;
