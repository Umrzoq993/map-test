import FacilityCrudPage from "./_FacilityCrudPage";

export default function FishPondsPage() {
  return (
    <FacilityCrudPage
      title="Baliqchilik ko‘llari"
      type="FISHFARM"
      columns={[
        { key: "areaM2", label: "Umumiy yer (m²)" },
        { key: "productAmount", label: "Mahsulot miqdori" },
        { key: "revenueAmount", label: "Daromad miqdori" },
        { key: "netProfit", label: "Sof foyda" },
        { key: "tenant", label: "Ijarachi" },
        { key: "govDecision", label: "Hukumat qarori" },
      ]}
      formSchema={[
        { name: "areaM2", label: "Umumiy yer maydoni (m²)", type: "number" },
        {
          name: "productAmount",
          label: "Olinadigan mahsulot miqdori",
          type: "number",
        },
        {
          name: "revenueAmount",
          label: "Olinadigan daromad miqdori",
          type: "number",
        },
        { name: "netProfit", label: "Olinadigan sof foyda", type: "number" },
        { name: "tenant", label: "Ijarachi" },
        { name: "govDecision", label: "Hukumat qarori" },
      ]}
    />
  );
}
