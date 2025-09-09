// src/pages/OrgTablePage.jsx
import { useLocation } from "react-router-dom";
import OrgTable from "../components/org/OrgTable";
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
        <h2>Bo'linmalar (Jadval)</h2>
      </div>
      <OrgTable isAdmin={isAdmin} focusId={focusId} />
    </div>
  );
}
