import FacilityCrudPage from "./_FacilityCrudPage";

export default function CowshedPage() {
  return (
    <FacilityCrudPage
      title="Molxona"
      type="COWSHED"
      columns={[
        { key: "areaM2", label: "Umumiy yer (m²)" },
        { key: "capacity", label: "Umumiy sig‘imi (son)" },
        { key: "currentCount", label: "Hozirda mavjud (son)" },
        { key: "productKg", label: "Mahsulot (kg)" },
        { key: "revenueAmount", label: "Daromad" },
        { key: "netProfit", label: "Sof foyda" },
      ]}
      formSchema={[
        { name: "areaM2", label: "Umumiy yer maydoni (m²)", type: "number" },
        { name: "capacity", label: "Umumiy sig‘imi (son)", type: "number" },
        { name: "currentCount", label: "Hozirda mavjud (son)", type: "number" },
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
