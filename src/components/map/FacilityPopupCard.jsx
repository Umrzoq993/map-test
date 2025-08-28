// src/components/map/FacilityPopupCard.jsx
export default function FacilityPopupCard({ f, onEdit, onDelete }) {
  return (
    <div style={{ minWidth: 220 }}>
      <div style={{ fontWeight: 700 }}>{f.name}</div>
      <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
        {f.type} • {f.status}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={onEdit}
          style={{
            padding: "6px 10px",
            border: "1px solid #e3e6eb",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          style={{
            padding: "6px 10px",
            border: "1px solid #e3e6eb",
            borderRadius: 6,
            cursor: "pointer",
            background: "#fff0f0",
          }}
        >
          Delete
        </button>
      </div>
      {f.attributes?.notes && (
        <div style={{ marginTop: 10, fontSize: 12 }}>
          {String(f.attributes.notes)}
        </div>
      )}
    </div>
  );
}
