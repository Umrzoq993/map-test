import OrgTable from "../components/org/OrgTable";
import { useAuth } from "../hooks/useAuth";
import "../styles/org-table.scss";

export default function OrgTablePage() {
  const { isAdmin } = useAuth();
  return (
    <div className="page org-table-page">
      <div className="page-header">
        <h2>Tashkilotlar (Jadval)</h2>
        <div className="muted">
          Bo‘limlarni jadvalda ko‘rish va CRUD (modal orqali)
        </div>
      </div>
      <OrgTable isAdmin={isAdmin} />
    </div>
  );
}
