// src/pages/FacilitiesPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  createFacility,
  deleteFacility,
  listFacilities,
  putFacility,
} from "../api/facilities";
import FacilityForm from "../components/facilities/FacilityForm";
import { toast } from "react-toastify";
import Modal from "../components/ui/Modal";
import "../styles/_facility_modal.scss"; // styling for facility modal
import { TYPE_LABELS } from "../constants/facilityTypes";

export default function FacilitiesPage() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // FacilityRes yoki null
  const [mode, setMode] = useState("create"); // "create" | "edit"
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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
      toast.error(e.message || "Yuklashda xatolik");
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

  const requestDelete = (row) => setDeleteTarget(row);
  const cancelDelete = () => {
    if (!deleting) setDeleteTarget(null);
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFacility(deleteTarget.id);
      setDeleteTarget(null);
      await fetchData();
    } catch (e) {
      toast.error(e.message || "O‘chirishda xatolik");
    } finally {
      setDeleting(false);
    }
  };

  const submitCreate = async (payload) => {
    try {
      // create -> PUT semantics optional, backend POST bor
      await createFacility(payload);
      setModalOpen(false);
      await fetchData();
    } catch (e) {
      toast.error(e.message || "Saqlashda xatolik");
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
      toast.error(e.message || "Yangilashda xatolik");
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
                        onClick={() => requestDelete(row)}
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
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={mode === "create" ? "Yangi inshoot" : "Inshootni tahrirlash"}
        size="lg"
        className="facility-create-modal"
      >
        <div className="facility-form">
          <FacilityForm
            initial={editing}
            onCancel={() => setModalOpen(false)}
            onSubmit={mode === "create" ? submitCreate : submitEdit}
          />
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={cancelDelete}
        title="O‘chirishni tasdiqlang"
        size="sm"
        className="facility-delete-modal"
        preventCloseOnBackdrop={deleting}
        disableEscapeClose={deleting}
      >
        {deleteTarget && (
          <div className="confirm-body">
            <div style={{ display: "flex", gap: 16 }}>
              <div className="danger-icon">⚠️</div>
              <div style={{ display: "grid", gap: 8 }}>
                <h3 className="headline">{deleteTarget.name}</h3>
                <p className="desc">
                  Ushbu inshootni o‘chirmoqchisiz. Bu amal{" "}
                  <b>bekor qilinmaydi</b>.
                </p>
              </div>
            </div>
            <div className="meta-box">
              <div className="row">
                <span className="k">ID:</span>
                <span>{deleteTarget.id}</span>
              </div>
              <div className="row">
                <span className="k">Tur:</span>
                <span>
                  {TYPE_LABELS[deleteTarget.type] || deleteTarget.type}
                </span>
              </div>
              <div className="row">
                <span className="k">Org:</span>
                <span>{deleteTarget.orgId}</span>
              </div>
              {deleteTarget.lat != null && deleteTarget.lng != null && (
                <div className="row">
                  <span className="k">Loc:</span>
                  <span>
                    {deleteTarget.lat.toFixed(4)}, {deleteTarget.lng.toFixed(4)}
                  </span>
                </div>
              )}
            </div>
            <div className="warn-box">
              <span>⚠️</span>
              <span>
                Agar obyekt xaritada qatlamlarga bog‘langan bo‘lsa, vizual
                komponentlar ham yo‘qoladi.
              </span>
            </div>
            <div className="modal-actions">
              <button
                className="btn"
                disabled={deleting}
                onClick={cancelDelete}
              >
                Bekor
              </button>
              <button
                className="btn danger"
                disabled={deleting}
                onClick={confirmDelete}
              >
                {deleting ? "O‘chirilmoqda…" : "Ha, o‘chirish"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
