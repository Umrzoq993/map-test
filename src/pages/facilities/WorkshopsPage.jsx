import FacilityCrudPage from "./_FacilityCrudPage";

export default function WorkshopsPage() {
  return (
    <FacilityCrudPage
      title="Ishlab chiqarish sexlari"
      type="WAREHOUSE" /* yoki FIELD — backenddagi mos typega almashtiring */
      columns={[
        { key: "areaM2", label: "Umumiy yer (m²)" },
        { key: "productKg", label: "Mahsulot (kg)" },
        { key: "revenueAmount", label: "Daromad" },
        { key: "netProfit", label: "Sof foyda" },
      ]}
      formSchema={[
        { name: "areaM2", label: "Umumiy yer maydoni (m²)", type: "number" },
        {
          name: "productKg",
          label: "Olinadigan mahsulot (kg)",
          type: "number",
        },
        { name: "revenueAmount", label: "Olinadigan daromad", type: "number" },
        { name: "netProfit", label: "Olingan sof foyda", type: "number" },
      ]}
    />
  );
}
