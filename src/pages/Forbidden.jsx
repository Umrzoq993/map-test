// src/pages/Forbidden.jsx
import { Link } from "react-router-dom";

export default function Forbidden() {
  return (
    <div className="card" style={{ maxWidth: 680, margin: "40px auto" }}>
      <h2 style={{ marginTop: 0 }}>Ruxsat yo‘q (403)</h2>
      <p style={{ opacity: 0.85 }}>
        Ushbu sahifaga kirish huquqiga ega emassiz. Agar bu xato deb
        o‘ylasangiz, administrator bilan bog‘laning.
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <Link to="/dashboard" className="btn">
          Bosh sahifa
        </Link>
        <Link to="/map" className="btn primary">
          Xaritaga qaytish
        </Link>
      </div>
    </div>
  );
}

