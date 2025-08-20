import OrgTable from "../components/org/OrgTable";

export default function OrgTablePage() {
  return (
    <div className="page org-table-page">
      <div className="page-header">
        <h2>Tashkilotlar (Jadval)</h2>
        <div className="muted">
          Bo‘limlarni jadvalda ko‘rish va CRUD (modal orqali)
        </div>
      </div>
      <OrgTable />
    </div>
  );
}
