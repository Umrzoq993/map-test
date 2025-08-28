import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createFacility,
  deleteFacility,
  listFacilities,
  listFacilitiesPage,
  putFacility,
} from "../../api/facilities";
import FacilityForm from "../../components/facilities/FacilityForm";

/** Enum -> o‘zbekcha label (faqat kerakli 11 tur) */
const TYPE_LABELS = {
  GREENHOUSE: "Issiqxona",
  POULTRY_MEAT: "Tovuqxona (go‘sht)",
  POULTRY_EGG: "Tovuqxona (tuxum)",
  TURKEY: "Kurkaxona",
  COWSHED: "Molxona",
  SHEEPFOLD: "Qo‘yxona",
  WORKSHOP_SAUSAGE: "Sex (kolbasa)",
  WORKSHOP_COOKIE: "Sex (pechenye)",
  AUX_LAND: "Yordamchi xo‘jalik yeri",
  BORDER_LAND: "Chegara oldi yeri",
  FISHPOND: "Baliqchilik ko‘li",
};

/** URL slug -> enum (kanonik + legacy aliaslar) */
const SLUG_TO_ENUM = {
  greenhouse: "GREENHOUSE",
  "poultry-meat": "POULTRY_MEAT",
  "poultry-egg": "POULTRY_EGG",
  poultry: "POULTRY_MEAT", // legacy: eski bookmarklar
  turkey: "TURKEY",
  cowshed: "COWSHED",
  sheepfold: "SHEEPFOLD",
  "workshops-sausage": "WORKSHOP_SAUSAGE",
  "workshops-cookie": "WORKSHOP_COOKIE",
  workshops: "WORKSHOP_SAUSAGE", // legacy
  "aux-lands": "AUX_LAND",
  "border-lands": "BORDER_LAND",
  "fish-ponds": "FISHPOND",
  "fish-farm": "FISHPOND", // legacy
  "aux-land": "AUX_LAND",
  "border-land": "BORDER_LAND",
};

const ROUTE_LABELS = {
  "poultry-meat": "Tovuqxona (go‘sht)",
  "poultry-egg": "Tovuqxona (tuxum)",
  "workshops-sausage": "Sex (kolbasa)",
  "workshops-cookie": "Sex (pechenye)",
};

export default function GenericFacilityPage() {
  const { type: typeSlug } = useParams();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [mode, setMode] = useState("create");

  // Pagination state
  const [page, setPage] = useState(0); // zero-based
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / size));

  const from = total ? page * size + 1 : 0;
  const to = Math.min(total, (page + 1) * size);

  const lockedByRoute = !!typeSlug;

  const typeOptions = useMemo(() => {
    const allOpts = Object.entries(TYPE_LABELS).map(([v, l]) => ({
      value: v,
      label: l,
    }));
    if (lockedByRoute && type) {
      return [{ value: type, label: TYPE_LABELS[type] || type }];
    }
    return [{ value: "", label: "Barchasi" }, ...allOpts];
  }, [lockedByRoute, type]);

  const fetchData = async (over = {}) => {
    setLoading(true);
    try {
      const res = await listFacilitiesPage({
        q: over.q !== undefined ? over.q : q || undefined,
        type:
          over.type !== undefined ? over.type || undefined : type || undefined,
        page: over.page ?? page,
        size: over.size ?? size,
        // kerak bo‘lsa boshqa sortlar ham qo‘shish mumkin:
        sort: ["createdAt,desc"],
      });

      setItems(res?.content ?? []);
      setTotal(res?.totalElements ?? 0);
    } catch (e) {
      console.error(e);
      alert("Ma’lumot yuklashda xatolik");
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
    const enumVal = SLUG_TO_ENUM[(typeSlug || "").toLowerCase()] || "";
    setType(enumVal);
    fetchData({ type: enumVal });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeSlug]);

  useEffect(() => {
    if (!typeSlug) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // type (filtr), page, size o'zgarganda ro'yxatni qayta yuklaymiz
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
  const onDelete = async (row) => {
    if (!confirm(`O‘chirishga ishonchingiz komilmi? "${row.name}"`)) return;
    try {
      await deleteFacility(row.id);
      await fetchData();
    } catch (e) {
      alert(e.message || "O‘chirishda xatolik");
    }
  };

  const submitCreate = async (payload) => {
    try {
      await createFacility(payload);
      setModalOpen(false);
      await fetchData();
    } catch (e) {
      alert(e.message || "Saqlashda xatolik");
    }
  };
  const submitEdit = async (payload) => {
    try {
      await putFacility(editing.id, { ...payload });
      setModalOpen(false);
      await fetchData();
    } catch (e) {
      alert(e.message || "Yangilashda xatolik");
    }
  };

  const headerLabel =
    ROUTE_LABELS[(typeSlug || "").toLowerCase()] ||
    (type ? TYPE_LABELS[type] : "Barchasi");

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
              Page {page + 1} / {totalPages}
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
