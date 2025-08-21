// src/pages/facilities/index.jsx
import FacilityCrudPage from "./FacilityCrudPage";

/** 1) Issiqxona (GREENHOUSE) */
export const GreenhousePage = () => (
  <FacilityCrudPage
    title="Issiqxona"
    type="GREENHOUSE"
    nameLabel="Issiqxona nomi"
    columns={[
      {
        key: "areaHa",
        label: "Umumiy yer maydoni",
        input: "number",
        unit: "gektar",
      },
      {
        key: "heatingType",
        label: "Isitish tizimi turi",
        input: "select",
        selectOptions: [
          { value: "none", label: "Yo‘q" },
          { value: "coal", label: "Ko‘mir" },
          { value: "gas", label: "Gaz" },
          { value: "electric", label: "Elektr" },
          { value: "other", label: "Boshqa" },
        ],
      },
      {
        key: "yieldAmount",
        label: "Olinadigan hosildorlik miqdori",
        input: "number",
        unit: "tonna",
      },
      {
        key: "revenue",
        label: "Olinadigan daromad miqdori",
        input: "number",
        unit: "so‘m",
      },
      {
        key: "netProfit",
        label: "Olingan sof foyda",
        input: "number",
        unit: "so‘m",
      },
    ]}
    allowGeometry
  />
);

/** 2) Tovuqxona (POULTRY) */
export const PoultryPage = () => (
  <FacilityCrudPage
    title="Tovuqxona (go‘sht / tuxum)"
    type="POULTRY"
    nameLabel="Tovuqxona nomi"
    columns={[
      {
        key: "areaM2",
        label: "Umumiy yer maydoni",
        input: "number",
        unit: "m²",
      },
      {
        key: "capacity",
        label: "Umumiy sig‘imi",
        input: "number",
        unit: "son",
      },
      { key: "current", label: "Hozirda mavjud", input: "number", unit: "son" },
      {
        key: "productUnit",
        label: "Mahsulot birligi",
        input: "select",
        selectOptions: [
          { value: "kg", label: "kg" },
          { value: "dona", label: "dona (tuxum)" },
        ],
      },
      { key: "productAmount", label: "Olinadigan mahsulot", input: "number" },
      {
        key: "revenue",
        label: "Olinadigan daromad",
        input: "number",
        unit: "so‘m",
      },
      {
        key: "netProfit",
        label: "Olingan sof foyda",
        input: "number",
        unit: "so‘m",
      },
    ]}
    allowGeometry
  />
);

/** 3) Molxona (COWSHED) */
export const CowshedPage = () => (
  <FacilityCrudPage
    title="Molxona"
    type="COWSHED"
    nameLabel="Molxona nomi"
    columns={[
      {
        key: "areaM2",
        label: "Umumiy yer maydoni",
        input: "number",
        unit: "m²",
      },
      {
        key: "capacity",
        label: "Umumiy sig‘imi",
        input: "number",
        unit: "son",
      },
      { key: "current", label: "Hozirda mavjud", input: "number", unit: "son" },
      {
        key: "productAmount",
        label: "Olinadigan mahsulot",
        input: "number",
        unit: "kg",
      },
      {
        key: "revenue",
        label: "Olinadigan daromad",
        input: "number",
        unit: "so‘m",
      },
      {
        key: "netProfit",
        label: "Olingan sof foyda",
        input: "number",
        unit: "so‘m",
      },
    ]}
    allowGeometry
  />
);

/** 4) Kurkaxona (FUR farm sifatida POULTRY ga o‘xshash emas — alohida tur yo‘q, STABLE yoki WAREHOUSE mos emas.
 *   Backend enum’da yo‘q bo‘lsa, POULTRY bilan aralashtirib yubormaslik uchun STABLE’dan foydalanmaymiz.
 *   Tavsiya: Agar ko‘p ishlatilsa, backend enum’ga FURFARM qo‘shib yuboring.
 *   Hozircha WAREHOUSE o‘rnida foydalanamiz (faqat atributlar muhim).
 */
export const FurFarmPage = () => (
  <FacilityCrudPage
    title="Kurkaxona"
    type="WAREHOUSE"
    nameLabel="Kurkaxona nomi"
    columns={[
      {
        key: "areaM2",
        label: "Umumiy yer maydoni",
        input: "number",
        unit: "m²",
      },
      {
        key: "capacity",
        label: "Umumiy sig‘imi",
        input: "number",
        unit: "son",
      },
      { key: "current", label: "Hozirda mavjud", input: "number", unit: "son" },
      {
        key: "productAmount",
        label: "Olinadigan mahsulot",
        input: "number",
        unit: "kg",
      },
      {
        key: "revenue",
        label: "Olinadigan daromad",
        input: "number",
        unit: "so‘m",
      },
      {
        key: "netProfit",
        label: "Olingan sof foyda",
        input: "number",
        unit: "so‘m",
      },
    ]}
    allowGeometry
  />
);

/** 5) Qo‘yxona (qo‘y) — POULTRYga o‘xshash, lekin qo‘y.
 *   Backend enum’da SHEEPFOLD yo‘q; eng yaqin: FIELD emas. Amaliyot uchun APIARY yoki WAREHOUSE ham mos kelmaydi.
 *   Hozircha STABLE dan foydalanamiz.
 */
export const SheepfoldPage = () => (
  <FacilityCrudPage
    title="Qo‘yxona"
    type="STABLE"
    nameLabel="Qo‘yxona nomi"
    columns={[
      {
        key: "areaM2",
        label: "Umumiy yer maydoni",
        input: "number",
        unit: "m²",
      },
      {
        key: "capacity",
        label: "Umumiy sig‘imi",
        input: "number",
        unit: "son",
      },
      { key: "current", label: "Hozirda mavjud", input: "number", unit: "son" },
      {
        key: "productAmount",
        label: "Olinadigan mahsulot",
        input: "number",
        unit: "kg",
      },
      {
        key: "revenue",
        label: "Olinadigan daromad",
        input: "number",
        unit: "so‘m",
      },
      {
        key: "netProfit",
        label: "Olingan sof foyda",
        input: "number",
        unit: "so‘m",
      },
    ]}
    allowGeometry
  />
);

/** 6) Ishlab chiqarish sexlari (kolbasa, pechenye) — WAREHOUSE yoki FIELD emas, “workType” bilan farqlaymiz */
export const WorkshopsPage = () => (
  <FacilityCrudPage
    title="Ishlab chiqarish sexlari"
    type="WAREHOUSE"
    nameLabel="Sex nomi"
    columns={[
      {
        key: "areaM2",
        label: "Umumiy yer maydoni",
        input: "number",
        unit: "m²",
      },
      {
        key: "workType",
        label: "Yo‘nalish",
        input: "select",
        selectOptions: [
          { value: "kolbasa", label: "Kolbasa" },
          { value: "pechenye", label: "Pechenye" },
          { value: "boshqa", label: "Boshqa" },
        ],
      },
      {
        key: "productAmount",
        label: "Olinadigan mahsulot",
        input: "number",
        unit: "kg",
      },
      {
        key: "revenue",
        label: "Olinadigan daromad",
        input: "number",
        unit: "so‘m",
      },
      {
        key: "netProfit",
        label: "Olingan sof foyda",
        input: "number",
        unit: "so‘m",
      },
    ]}
    allowGeometry
  />
);

/** 7) Yordamchi xo‘jalik yerlari — FIELD */
export const AuxiliaryLandsPage = () => (
  <FacilityCrudPage
    title="Yordamchi xo‘jalik yerlari"
    type="FIELD"
    nameLabel="Joy nomi"
    columns={[
      {
        key: "areaM2",
        label: "Umumiy yer maydoni",
        input: "number",
        unit: "m²",
      },
      {
        key: "cropYield",
        label: "Olinadigan hosil miqdori",
        input: "number",
        unit: "kg",
      },
      {
        key: "revenue",
        label: "Olinadigan daromad miqdori",
        input: "number",
        unit: "so‘m",
      },
      {
        key: "netProfit",
        label: "Olinadigan sof foyda",
        input: "number",
        unit: "so‘m",
      },
      { key: "tenant", label: "Ijarachi", input: "text" },
      { key: "govDecision", label: "Hukumat qarori", input: "text" },
    ]}
    allowGeometry
  />
);

/** 8) Chegara oldi yer maydonlari — FIELD (alohida atributlar bir xil) */
export const BorderLandsPage = () => (
  <FacilityCrudPage
    title="Chegara oldi yer maydonlari"
    type="FIELD"
    nameLabel="Joy nomi"
    columns={[
      {
        key: "areaM2",
        label: "Umumiy yer maydoni",
        input: "number",
        unit: "m²",
      },
      {
        key: "cropYield",
        label: "Olinadigan hosil miqdori",
        input: "number",
        unit: "kg",
      },
      {
        key: "revenue",
        label: "Olinadigan daromad miqdori",
        input: "number",
        unit: "so‘m",
      },
      {
        key: "netProfit",
        label: "Olinadigan sof foyda",
        input: "number",
        unit: "so‘m",
      },
      { key: "tenant", label: "Ijarachi", input: "text" },
      { key: "govDecision", label: "Hukumat qarori", input: "text" },
    ]}
    allowGeometry
  />
);

/** 9) Baliqchilik ko‘llari — FISHFARM */
export const FishPondsPage = () => (
  <FacilityCrudPage
    title="Baliqchilik ko‘llari"
    type="FISHFARM"
    nameLabel="Hovuz nomi"
    columns={[
      {
        key: "areaM2",
        label: "Umumiy yer maydoni",
        input: "number",
        unit: "m²",
      },
      {
        key: "productAmount",
        label: "Olinadigan mahsulot miqdori",
        input: "number",
        unit: "kg",
      },
      {
        key: "revenue",
        label: "Olinadigan daromad miqdori",
        input: "number",
        unit: "so‘m",
      },
      {
        key: "netProfit",
        label: "Olinadigan sof foyda",
        input: "number",
        unit: "so‘m",
      },
      { key: "tenant", label: "Ijarachi", input: "text" },
      { key: "govDecision", label: "Hukumat qarori", input: "text" },
    ]}
    allowGeometry
  />
);
