import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createFacility,
  deleteFacility,
  listFacilities,
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
      const res = await listFacilities({
        q: over.q !== undefined ? over.q : q || undefined,
        type:
          over.type !== undefined ? over.type || undefined : type || undefined,
      });
      setItems(res?.content ?? res ?? []);
    } catch (e) {
      alert(e.message || "Yuklashda xatolik");
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
        <div className="muted">Jadval URL turiga mos ravishda: {headerLabel}</div>
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
            title={lockedByRoute ? "URL bo‘yicha tur tanlangan" : "Tur bo‘yicha filtr"}
          >
            {typeOptions.map((o) => (
              <option key={`${o.value}_${o.label}`} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <button type="submit" className="btn">Qidirish</button>
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
                    <div className="overlay"><div className="spinner" /></div>
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr><td colSpan={6} className="empty">Ma’lumot topilmadi</td></tr>
              )}
              {!loading && items.map((row) => (
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
                    <button className="btn" onClick={() => openEdit(row)}>Tahrirlash</button>
                    <button className="btn danger" onClick={() => onDelete(row)}>O‘chirish</button>
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

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {mode === "create" ? "Yangi inshoot" : "Inshootni tahrirlash"}
              </div>
              <button className="modal-close" onClick={() => setModalOpen(false)}>&times;</button>
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
