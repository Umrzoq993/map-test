// src/data/facilityTypes.js
export const FACILITY_TYPES = {
  GREENHOUSE: {
    label: "Issiqxona",
    fields: [
      {
        key: "totalAreaHa",
        label: "Umumiy yer maydoni",
        type: "number",
        suffix: "ga",
        rules: { min: 0 },
      },
      { key: "heatingType", label: "Isitish tizimi turi", type: "text" },
      {
        key: "expectedYield",
        label: "Olinadigan hosildorlik (t/yil)",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "expectedRevenue",
        label: "Olinadigan daromad",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "netProfit",
        label: "Olingan sof foyda",
        type: "number",
        rules: { min: 0 },
      },
    ],
  },

  POULTRY_MEAT: {
    label: "Tovuqxona (go‘sht)",
    fields: [
      {
        key: "areaM2",
        label: "Umumiy yer maydoni",
        type: "number",
        suffix: "m²",
        rules: { min: 0 },
      },
      {
        key: "capacity",
        label: "Umumiy sig‘imi (bosh)",
        type: "number",
        rules: { min: 0, integer: true },
      },
      {
        key: "current",
        label: "Hozirda mavjud (bosh)",
        type: "number",
        rules: { min: 0, integer: true },
      },
      {
        key: "productAmount",
        label: "Olinadigan mahsulot",
        type: "number",
        suffix: "kg",
        rules: { min: 0 },
      },
      { key: "productUnit", label: "Birlik", type: "text", placeholder: "kg" },
      {
        key: "expectedRevenue",
        label: "Olinadigan daromad",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "netProfit",
        label: "Olingan sof foyda",
        type: "number",
        rules: { min: 0 },
      },
    ],
  },

  POULTRY_EGG: {
    label: "Tovuqxona (tuxum)",
    fields: [
      {
        key: "areaM2",
        label: "Umumiy yer maydoni",
        type: "number",
        suffix: "m²",
        rules: { min: 0 },
      },
      {
        key: "capacity",
        label: "Umumiy sig‘imi (bosh)",
        type: "number",
        rules: { min: 0, integer: true },
      },
      {
        key: "current",
        label: "Hozirda mavjud (bosh)",
        type: "number",
        rules: { min: 0, integer: true },
      },
      {
        key: "productAmount",
        label: "Tuxum (dona/kun)",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "productUnit",
        label: "Birlik",
        type: "text",
        placeholder: "pcs/dona",
      },
      {
        key: "expectedRevenue",
        label: "Olinadigan daromad",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "netProfit",
        label: "Olingan sof foyda",
        type: "number",
        rules: { min: 0 },
      },
    ],
  },

  TURKEY: {
    label: "Kurkaxona (hindi)",
    fields: [
      {
        key: "areaM2",
        label: "Umumiy yer maydoni",
        type: "number",
        suffix: "m²",
        rules: { min: 0 },
      },
      {
        key: "capacity",
        label: "Umumiy sig‘imi (bosh)",
        type: "number",
        rules: { min: 0, integer: true },
      },
      {
        key: "current",
        label: "Hozirda mavjud (bosh)",
        type: "number",
        rules: { min: 0, integer: true },
      },
      {
        key: "productAmount",
        label: "Olinadigan mahsulot",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "productUnit",
        label: "Birlik",
        type: "text",
        placeholder: "kg/pcs",
      },
      {
        key: "expectedRevenue",
        label: "Olinadigan daromad",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "netProfit",
        label: "Olingan sof foyda",
        type: "number",
        rules: { min: 0 },
      },
    ],
  },

  COWSHED: {
    label: "Molxona",
    fields: [
      {
        key: "areaM2",
        label: "Umumiy yer maydoni",
        type: "number",
        suffix: "m²",
        rules: { min: 0 },
      },
      {
        key: "capacity",
        label: "Umumiy sig‘imi (bosh)",
        type: "number",
        rules: { min: 0, integer: true },
      },
      {
        key: "current",
        label: "Hozirda mavjud (bosh)",
        type: "number",
        rules: { min: 0, integer: true },
      },
      {
        key: "productAmount",
        label: "Olinadigan mahsulot (kg/kun)",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "expectedRevenue",
        label: "Olinadigan daromad",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "netProfit",
        label: "Olingan sof foyda",
        type: "number",
        rules: { min: 0 },
      },
    ],
  },

  SHEEPFOLD: {
    label: "Qo‘yxona",
    fields: [
      {
        key: "areaM2",
        label: "Umumiy yer maydoni",
        type: "number",
        suffix: "m²",
        rules: { min: 0 },
      },
      {
        key: "capacity",
        label: "Umumiy sig‘imi (bosh)",
        type: "number",
        rules: { min: 0, integer: true },
      },
      {
        key: "current",
        label: "Hozirda mavjud (bosh)",
        type: "number",
        rules: { min: 0, integer: true },
      },
      {
        key: "productAmount",
        label: "Olinadigan mahsulot (kg/yil)",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "expectedRevenue",
        label: "Olinadigan daromad",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "netProfit",
        label: "Olingan sof foyda",
        type: "number",
        rules: { min: 0 },
      },
    ],
  },

  WORKSHOP_SAUSAGE: {
    label: "Sex (kolbasa)",
    fields: [
      {
        key: "areaM2",
        label: "Umumiy yer maydoni",
        type: "number",
        suffix: "m²",
        rules: { min: 0 },
      },
      {
        key: "productAmount",
        label: "Ishlab chiqarish (oyiga)",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "expectedRevenue",
        label: "Olinadigan daromad",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "netProfit",
        label: "Olingan sof foyda",
        type: "number",
        rules: { min: 0 },
      },
    ],
  },

  WORKSHOP_COOKIE: {
    label: "Sex (pechenye)",
    fields: [
      {
        key: "areaM2",
        label: "Umumiy yer maydoni",
        type: "number",
        suffix: "m²",
        rules: { min: 0 },
      },
      {
        key: "productAmount",
        label: "Ishlab chiqarish (oyiga)",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "expectedRevenue",
        label: "Olinadigan daromad",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "netProfit",
        label: "Olingan sof foyda",
        type: "number",
        rules: { min: 0 },
      },
    ],
  },

  AUX_LAND: {
    label: "Yordamchi xo‘jalik yerlari",
    fields: [
      {
        key: "areaM2",
        label: "Yer maydoni",
        type: "number",
        suffix: "m²",
        rules: { min: 0 },
      },
      {
        key: "expectedYield",
        label: "Kutilayotgan hosil",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "expectedRevenue",
        label: "Olinadigan daromad",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "netProfit",
        label: "Olingan sof foyda",
        type: "number",
        rules: { min: 0 },
      },
      { key: "tenant", label: "Ijarachi", type: "text" },
      { key: "govDecision", label: "Hukumat qarori", type: "text" },
    ],
  },

  BORDER_LAND: {
    label: "Chegara oldi yerlari",
    fields: [
      {
        key: "areaM2",
        label: "Yer maydoni",
        type: "number",
        suffix: "m²",
        rules: { min: 0 },
      },
      {
        key: "expectedYield",
        label: "Kutilayotgan hosil",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "expectedRevenue",
        label: "Olinadigan daromad",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "netProfit",
        label: "Olingan sof foyda",
        type: "number",
        rules: { min: 0 },
      },
      { key: "tenant", label: "Ijarachi", type: "text" },
      { key: "govDecision", label: "Hukumat qarori", type: "text" },
    ],
  },

  FISHPOND: {
    label: "Baliqchilik ko‘li",
    fields: [
      {
        key: "areaM2",
        label: "Suv maydoni",
        type: "number",
        suffix: "m²",
        rules: { min: 0 },
      },
      {
        key: "productAmount",
        label: "Yillik hosil (kg)",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "expectedRevenue",
        label: "Olinadigan daromad",
        type: "number",
        rules: { min: 0 },
      },
      {
        key: "netProfit",
        label: "Olingan sof foyda",
        type: "number",
        rules: { min: 0 },
      },
      { key: "tenant", label: "Ijarachi", type: "text" },
      { key: "govDecision", label: "Hukumat qarori", type: "text" },
    ],
  },
};

export const FACILITY_TYPE_OPTIONS = Object.entries(FACILITY_TYPES).map(
  ([value, cfg]) => ({ value, label: cfg.label })
);
export const getFacilityTypeLabel = (code) =>
  FACILITY_TYPES?.[code]?.label || code;
