import { useEffect, useMemo, useState } from "react";
import { debugError } from "../../utils/debug";
import { useParams } from "react-router-dom";
import {
  createFacility,
  deleteFacility,
  listFacilitiesPage,
  putFacility,
} from "../../api/facilities";
import FacilityForm from "../../components/facilities/FacilityForm";
import { toast } from "react-toastify";
import Modal from "../../components/ui/Modal";
import "../../styles/_facility_modal.scss";
import { useFacilityTypes } from "../../hooks/useFacilityTypes";

const ROUTE_LABELS = {
  "poultry-meat": "Tovuqxona (go‘sht)",
  "poultry-egg": "Tovuqxona (tuxum)",
  "workshops-sausage": "Ishlab chiqarish sexi (kolbasa)",
  "workshops-cookie": "Ishlab chiqarish sexi (pechenye)",
};

export default function GenericFacilityPage() {
  const { type: typeSlug } = useParams();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");

  const {
    types: typeDefs,
    codeFromSlug,
    label: labelFor,
    codes,
  } = useFacilityTypes();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [mode, setMode] = useState("create");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / size));

  const labelForType = (code) => labelFor(code) || code;

  const from = total ? page * size + 1 : 0;
  const to = Math.min(total, (page + 1) * size);
  const lockedByRoute = !!typeSlug;

  const typeOptions = useMemo(() => {
    const allOpts = (Array.isArray(typeDefs) ? typeDefs : []).map((t) => ({
      value: t.code,
      label: t.nameUz || t.nameRu || t.code,
    }));
    if (lockedByRoute && type) {
      const found = allOpts.find((o) => o.value === type);
      const label = found?.label || labelForType(type) || type;
      return [{ value: type, label }];
    }
    return [{ value: "", label: "Barchasi" }, ...allOpts];
  }, [lockedByRoute, type, typeDefs]);

  const fetchData = async (over = {}) => {
    setLoading(true);
    try {
      const res = await listFacilitiesPage({
        q: over.q !== undefined ? over.q : q || undefined,
        type:
          over.type !== undefined ? over.type || undefined : type || undefined,
        page: over.page ?? page,
        size: over.size ?? size,
        sort: ["createdAt,desc"],
      });
      setItems(res?.content ?? []);
      setTotal(res?.totalElements ?? 0);
    } catch (e) {
      debugError("GenericFacilityPage listFacilitiesPage failed", e);
      toast.error("Ma’lumot yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!typeSlug) {
      setType("");
      fetchData({ type: "" });
      return;
    }
    const enumVal = codeFromSlug(typeSlug) || "";
    setType(enumVal);
    fetchData({ type: enumVal });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeSlug, codes.join("")]);

  useEffect(() => {
    if (!typeSlug) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, page, size]);

  const onSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchData({ page: 0 });
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
    if (deleting) return;
    setDeleteTarget(null);
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
      await createFacility(payload);
      setModalOpen(false);
      await fetchData();
    } catch (e) {
      toast.error(e.message || "Saqlashda xatolik");
    }
  };
  const submitEdit = async (payload) => {
    try {
      await putFacility(editing.id, { ...payload });
      setModalOpen(false);
      await fetchData();
    } catch (e) {
      toast.error(e.message || "Yangilashda xatolik");
    }
  };

  const headerLabel =
    ROUTE_LABELS[(typeSlug || "").toLowerCase()] ||
    (type ? labelForType(type) : "Barchasi");

  return (
    <div className="org-table-page">
      <div className="page-header">
        <h2>Inshootlar</h2>
        <div className="muted">
          Jadval URL turiga mos ravishda: {headerLabel}
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
            disabled={lockedByRoute}
            title={
              lockedByRoute
                ? "URL bo‘yicha tur tanlangan"
                : "Tur bo‘yicha filtr"
            }
          >
            {typeOptions.map((o) => (
              <option key={`${o.value}_${o.label}`} value={o.value}>
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
                <th>Tashkilot</th>
                <th>Koordinata</th>
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
                    <td>{labelForType(row.type)}</td>
                    <td>
                      {row.orgId != null ? (
                        <a
                          href={`/orgs-table?focus=${row.orgId}`}
                          title={`Org #${row.orgId}`}
                        >
                          {row.orgName && String(row.orgName).trim().length
                            ? row.orgName
                            : `#${row.orgId}`}
                        </a>
                      ) : row.orgName && String(row.orgName).trim().length ? (
                        row.orgName
                      ) : (
                        "\u2014"
                      )}
                    </td>
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
          {/* Paginator */}
          <div className="paginator">
            <button
              className="btn"
              disabled={page === 0}
              onClick={() => setPage(0)}
              title="Birinchi sahifa"
            >
              «
            </button>
            <button
              className="btn"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              title="Oldingi sahifa"
            >
              ‹
            </button>

            <span className="muted">
              Sahifa {page + 1} / {totalPages}
            </span>

            <button
              className="btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              title="Keyingi sahifa"
            >
              ›
            </button>
            <button
              className="btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(totalPages - 1)}
              title="Oxirgi sahifa"
            >
              »
            </button>

            <div className="spacer" />

            <span className="muted">
              Ko‘rsatilmoqda {from}–{to} / {total}
            </span>

            <select
              className="select"
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(0);
              }}
              title="Sahifadagi qatorlar"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={500}>500</option>
            </select>
          </div>
        </div>

        <div className="paginator">
          <span className="muted">Topildi: {total}</span>
        </div>
      </div>

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

      {/* Delete confirm modal */}
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
                <span>{labelForType(deleteTarget.type)}</span>
              </div>
              <div className="row">
                <span className="k">Org:</span>
                <span>
                  {deleteTarget.orgId != null ? (
                    <a
                      href={`/orgs-table?focus=${deleteTarget.orgId}`}
                      title={`Org #${deleteTarget.orgId}`}
                    >
                      {deleteTarget.orgName &&
                      String(deleteTarget.orgName).trim().length
                        ? deleteTarget.orgName
                        : `#${deleteTarget.orgId}`}
                    </a>
                  ) : deleteTarget.orgName &&
                    String(deleteTarget.orgName).trim().length ? (
                    deleteTarget.orgName
                  ) : (
                    "\u2014"
                  )}
                </span>
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
                Agar ushbu obyekt xaritada qatlamlarga bog‘langan bo‘lsa, vizual
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
