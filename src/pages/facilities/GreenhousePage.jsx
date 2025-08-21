import FacilityCrudPage from "./_FacilityCrudPage";

export default function GreenhousePage() {
  return (
    <FacilityCrudPage
      title="Issiqxona"
      type="GREENHOUSE"
      columns={[
        { key: "areaHa", label: "Umumiy yer (ga)" },
        { key: "heatingType", label: "Isitish turi" },
        { key: "yieldAmount", label: "Hosildorlik" },
        { key: "revenueAmount", label: "Daromad" },
        { key: "netProfit", label: "Sof foyda" },
      ]}
      formSchema={[
        { name: "areaHa", label: "Umumiy yer maydoni (ga)", type: "number" },
        { name: "heatingType", label: "Isitish tizimi turi" },
        {
          name: "yieldAmount",
          label: "Olinadigan hosildorlik miqdori",
          type: "number",
        },
        {
          name: "revenueAmount",
          label: "Olinadigan daromad miqdori",
          type: "number",
        },
        { name: "netProfit", label: "Olingan sof foyda", type: "number" },
      ]}
    />
  );
}
