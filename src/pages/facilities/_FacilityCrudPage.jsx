import React, { useEffect, useMemo, useState } from "react";
import Modal from "../../components/ui/Modal";
import {
  listFacilities,
  createFacility,
  patchFacility,
  deleteFacility,
} from "../../api/facilities";
import { getToken } from "../../api/auth"; // sizda shu bor — yo‘q bo‘lsa pastdagi helperdan foydalaning

/** Token’dan orgId olish (fallback) */
function decodeOrgIdFromToken() {
  try {
    const t = getToken?.() || localStorage.getItem("token");
    if (!t) return null;
    const [, payload] = t.split(".");
    const data = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
    );
    return data.orgId ?? null;
  } catch {
    return null;
  }
}

/**
 * Generic CRUD page:
 * props: {
 *   title: string,
 *   type: string (FacilityType),
 *   columns: [{key, label, render?: (row)=>ReactNode}],
 *   formSchema: [{name,label,type,placeholder?}],
 * }
 * - Jadval ko‘rinadi
 * - “Qo‘shish” bosilsa modal ochiladi
 * - Edit/Delete ham modallar orqali
 */
export default function FacilityCrudPage({ title, type, columns, formSchema }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [error, setError] = useState(null);

  // Modallar
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  // Form states
  const [draft, setDraft] = useState({});
  const [editRow, setEditRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  const orgId = useMemo(() => decodeOrgIdFromToken(), []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listFacilities({ orgId, types: [type], q });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, q]);

  function openCreateModal() {
    setDraft({});
    setOpenCreate(true);
  }
  function openEditModal(row) {
    setEditRow(row);
    // attributes ichidan form qiymatlarini to‘ldiramiz
    const a = row.attributes || {};
    const initial = {};
    formSchema.forEach((f) => {
      initial[f.name] = a[f.name] ?? "";
    });
    setDraft(initial);
    setOpenEdit(true);
  }
  function openDeleteModal(row) {
    setDeleteRow(row);
    setOpenDelete(true);
  }

  function closeAll() {
    setOpenCreate(false);
    setOpenEdit(false);
    setOpenDelete(false);
    setDraft({});
    setEditRow(null);
    setDeleteRow(null);
  }

  function onDraftChange(name, value) {
    setDraft((d) => ({ ...d, [name]: value }));
  }

  async function submitCreate(e) {
    e?.preventDefault();
    try {
      const payload = {
        orgId,
        name: `${title} — ${new Date().toLocaleDateString()}`,
        type,
        status: "ACTIVE",
        attributes: draft,
      };
      await createFacility(payload);
      closeAll();
      await load();
    } catch (e2) {
      alert(e2?.message || "Saqlashda xatolik");
    }
  }

  async function submitEdit(e) {
    e?.preventDefault();
    try {
      await patchFacility(editRow.id, {
        attributes: draft, // deep-merge bo‘ladi (backend)
      });
      closeAll();
      await load();
    } catch (e2) {
      alert(e2?.message || "Yangilashda xatolik");
    }
  }

  async function submitDelete() {
    try {
      await deleteFacility(deleteRow.id);
      closeAll();
      await load();
    } catch (e2) {
      alert(e2?.message || "O‘chirishda xatolik");
    }
  }

  return (
    <div className="org-table-page">
      <div className="page-header">
        <h2>{title}</h2>
        <div className="muted">
          Jadval ko‘rinishida. CRUD amallari popup modal orqali bajariladi.
        </div>
      </div>

      <div className="org-table-wrap">
        <div className="toolbar">
          <input
            className="search"
            placeholder="Qidirish..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="spacer" />
          <button className="btn primary" onClick={openCreateModal}>
            + Qo‘shish
          </button>
        </div>

        <div className="table-card">
          <table className="org-table org-table--scoped">
            <thead>
              <tr>
                <th>#</th>
                {columns.map((c) => (
                  <th key={c.key}>{c.label}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="empty" colSpan={columns.length + 2}>
                    Yuklanmoqda...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td className="empty" colSpan={columns.length + 2}>
                    {error}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="empty" colSpan={columns.length + 2}>
                    Ma’lumot topilmadi
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => {
                  const a = r.attributes || {};
                  return (
                    <tr key={r.id}>
                      <td className="num">{i + 1}</td>
                      {columns.map((c) => (
                        <td key={c.key}>
                          {c.render ? c.render(r, a) : a[c.key] ?? ""}
                        </td>
                      ))}
                      <td className="actions">
                        <button
                          className="btn"
                          onClick={() => openEditModal(r)}
                        >
                          Tahrirlash
                        </button>
                        <button
                          className="btn danger"
                          onClick={() => openDeleteModal(r)}
                        >
                          O‘chirish
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE */}
      <Modal
        open={openCreate}
        title={`${title} — Qo‘shish`}
        onClose={closeAll}
        footer={
          <>
            <button className="btn" onClick={closeAll}>
              Bekor qilish
            </button>
            <button className="btn primary" onClick={submitCreate}>
              Saqlash
            </button>
          </>
        }
      >
        <form className="form-grid" onSubmit={submitCreate}>
          {formSchema.map((f) => (
            <div className="field" key={f.name}>
              <label>{f.label}</label>
              <input
                type={f.type || "text"}
                placeholder={f.placeholder || ""}
                value={draft[f.name] ?? ""}
                onChange={(e) => onDraftChange(f.name, e.target.value)}
              />
            </div>
          ))}
        </form>
      </Modal>

      {/* EDIT */}
      <Modal
        open={openEdit}
        title={`${title} — Tahrirlash`}
        onClose={closeAll}
        footer={
          <>
            <button className="btn" onClick={closeAll}>
              Bekor qilish
            </button>
            <button className="btn primary" onClick={submitEdit}>
              Yangilash
            </button>
          </>
        }
      >
        <form className="form-grid" onSubmit={submitEdit}>
          {formSchema.map((f) => (
            <div className="field" key={f.name}>
              <label>{f.label}</label>
              <input
                type={f.type || "text"}
                placeholder={f.placeholder || ""}
                value={draft[f.name] ?? ""}
                onChange={(e) => onDraftChange(f.name, e.target.value)}
              />
            </div>
          ))}
        </form>
      </Modal>

      {/* DELETE */}
      <Modal
        open={openDelete}
        title="O‘chirishni tasdiqlang"
        onClose={closeAll}
        footer={
          <>
            <button className="btn" onClick={closeAll}>
              Bekor qilish
            </button>
            <button className="btn danger" onClick={submitDelete}>
              Ha, o‘chirish
            </button>
          </>
        }
      >
        <div className="fd-alert">
          <div>
            <strong>Diqqat!</strong> ushbu yozuvni o‘chirmoqchisiz.
          </div>
        </div>
      </Modal>
    </div>
  );
}
