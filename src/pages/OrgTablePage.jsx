// src/pages/OrgTablePage.jsx
import OrgTable from "../components/org/OrgTable";
import { useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "../styles/_org_table.scss";

export default function OrgTablePage() {
  const { isAdmin } = useAuth();
  const loc = useLocation();
  const params = new URLSearchParams(loc.search);
  const focusId = params.get("focus");
  return (
    <div className="page org-table-page">
      <div className="page-header">
        <h2>Tashkilotlar (Jadval)</h2>
        <div className="muted">
          Bo‘limlarni jadvalda ko‘rish va CRUD (modal orqali)
        </div>
      </div>
      <OrgTable isAdmin={isAdmin} focusId={focusId} />
    </div>
  );
}
