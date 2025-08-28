// src/pages/OrgManager.jsx
import OrgTreeEditor from "../components/org/OrgTreeEditor";
import "../styles/_org_tree.scss";

export default function OrgManager() {
  return (
    <div className="page org-manager">
      <div className="page-header">
        <h2>Tashkilot tuzilmasi</h2>
        <div className="muted">
          Bo‘limlarni yaratish, tahrirlash, ko‘chirish va o‘chirish
        </div>
      </div>
      <OrgTreeEditor />
    </div>
  );
}
