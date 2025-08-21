// src/pages/FacilitiesPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  createFacility,
  deleteFacility,
  listFacilities,
  patchFacility,
  putFacility,
} from "../api/facilities";
import FacilityForm from "../components/facilities/FacilityForm";

const TYPE_LABELS = {
  GREENHOUSE: "Issiqxona",
  POULTRY: "Tovuqxona",
  COWSHED: "Molxona",
  TURKEY: "Kurkaxona",
  SHEEPFOLD: "Qo‘yxona",
  WORKSHOP: "Ishlab chiqarish sexi",
  AUX_LAND: "Yordamchi xo‘jalik yer",
  BORDER_LAND: "Chegara oldi yer",
  FISHPOND: "Baliqchilik ko‘li",
};

export default function FacilitiesPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // FacilityRes yoki null
  const [mode, setMode] = useState("create"); // "create" | "edit"

  const typeOptions = useMemo(
    () => [
      { value: "", label: "Barchasi" },
      ...Object.entries(TYPE_LABELS).map(([v, l]) => ({ value: v, label: l })),
    ],
    []
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await listFacilities({
        q: q || undefined,
        type: type || undefined,
      });
      setItems(res);
    } catch (e) {
      alert(e.message || "Yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // first load

  const onSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const openCreate = () => {
    setEditing(null);
    setMode("create");
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setMode("edit");
    setModalOpen(true);
  };

  const onDelete = async (row) => {
    if (!confirm(`O'chirishga ishonchingiz komilmi? "${row.name}"`)) return;
    try {
      await deleteFacility(row.id);
      await fetchData();
    } catch (e) {
      alert(e.message || "O'chirishda xatolik");
    }
  };

  const submitCreate = async (payload) => {
    try {
      // create -> PUT semantics optional, backend POST bor
      await createFacility(payload);
      setModalOpen(false);
      await fetchData();
    } catch (e) {
      alert(e.message || "Saqlashda xatolik");
    }
  };

  const submitEdit = async (payload) => {
    try {
      // PUT to‘liq almashtirish uchun qulay; xohlasangiz patchFacility ham ishlaydi
      await putFacility(editing.id, {
        ...payload,
        // PUT talablarida orgId, name, type, status bo‘lishi kerak (formda bor)
      });
      setModalOpen(false);
      await fetchData();
    } catch (e) {
      alert(e.message || "Yangilashda xatolik");
    }
  };

  return (
    <div className="org-table-page">
      <div className="page-header">
        <h2>Inshootlar (Facilities)</h2>
        <div className="muted">
          9 tur bo‘yicha CRUD — Issiqxona, Tovuqxona, Molxona, Kurkaxona,
          Qo‘yxona, Sexlar, Yordamchi va Chegara yerlari, Baliqchilik ko‘llari.
        </div>
      </div>

      <div className="org-table-wrap">
        <form className="toolbar" onSubmit={onSearch}>
          <input
            className="search"
            placeholder="Qidiruv (nomi bo‘yicha)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="parent-filter"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button type="submit" className="btn">
            Qidirish
          </button>
          <div className="spacer" />
          <button type="button" className="btn primary" onClick={openCreate}>
            Yangi qo‘shish
          </button>
        </form>

        <div className="table-card">
          <table className="org-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>ID</th>
                <th>Nomi</th>
                <th>Turi</th>
                <th>Org ID</th>
                <th>Loc</th>
                <th style={{ width: 220 }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6}>
                    <div className="overlay">
                      <div className="spinner" />
                    </div>
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    Ma’lumot topilmadi
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((row) => (
                  <tr key={row.id}>
                    <td className="num">{row.id}</td>
                    <td>{row.name}</td>
                    <td>{TYPE_LABELS[row.type] || row.type}</td>
                    <td className="num">{row.orgId}</td>
                    <td className="muted">
                      {row.lat != null && row.lng != null
                        ? `${row.lat.toFixed(4)}, ${row.lng.toFixed(4)}`
                        : "—"}
                    </td>
                    <td className="actions">
                      <button className="btn" onClick={() => openEdit(row)}>
                        Tahrirlash
                      </button>
                      <button
                        className="btn danger"
                        onClick={() => onDelete(row)}
                      >
                        O‘chirish
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="paginator">
          <span className="muted">Topildi: {items.length}</span>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {mode === "create" ? "Yangi inshoot" : "Inshootni tahrirlash"}
              </div>
              <button
                className="modal-close"
                onClick={() => setModalOpen(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <FacilityForm
                initial={editing}
                onCancel={() => setModalOpen(false)}
                onSubmit={mode === "create" ? submitCreate : submitEdit}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
