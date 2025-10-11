import { useEffect, useState } from "react";
import { api } from "../../api/http";
import {
  createFacilityTypeDef,
  deleteFacilityTypeDef,
  pageFacilityTypes,
  updateFacilityTypeDef,
} from "../../api/facilityTypes";
import Modal from "../../components/ui/Modal";
import { toast } from "react-toastify";
// import { api } from "../../api/http"; // not used

function emptyForm() {
  return {
    code: "",
    slug: "",
    nameUz: "",
    nameRu: "",
    iconEmoji: "",
    iconUrl: "",
    color: "",
    sortOrder: 0,
    active: true,
    schema: [],
  };
}

function SchemaEditor({ value, onChange, onRawTextChange }) {
  const [text, setText] = useState(() => JSON.stringify(value ?? [], null, 2));
  useEffect(() => {
    setText(JSON.stringify(value ?? [], null, 2));
  }, [value]);
  const apply = () => {
    try {
      const obj = JSON.parse(text);
      onChange(obj);
    } catch (e) {
      toast.error("JSON xato: " + e.message);
    }
  };
  return (
    <div className="field">
      <label>Schema (JSON)</label>
      <textarea
        rows={10}
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          onRawTextChange?.(v);
        }}
        onBlur={apply}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            apply();
          }
        }}
        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" type="button" onClick={apply}>
          JSONni qo'llash
        </button>
        <div className="hint">
          Massiv: [{"{"}key,label,type,suffix?{"}"}]
        </div>
      </div>
    </div>
  );
}
export default function FacilityTypesPage() {
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [schemaText, setSchemaText] = useState(() =>
    JSON.stringify([], null, 2)
  );

  const totalPages = Math.max(1, Math.ceil(total / size));

  const fetchPage = async (over = {}) => {
    setLoading(true);
    try {
      const res = await pageFacilityTypes({
        page: over.page ?? page,
        size: over.size ?? size,
        sort: "sortOrder,asc",
      });
      setItems(res?.content ?? []);
      setTotal(res?.totalElements ?? res?.total ?? 0);
    } catch {
      toast.error("Yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setSchemaText(JSON.stringify([], null, 2));
    setOpen(true);
  };
  const openEdit = (row) => {
    setEditing(row);
    setForm({
      code: row.code ?? "",
      slug: row.slug ?? "",
      nameUz: row.nameUz ?? "",
      nameRu: row.nameRu ?? "",
      iconEmoji: row.iconEmoji ?? "",
      iconUrl: row.iconUrl ?? "",
      color: row.color ?? "",
      sortOrder: row.sortOrder ?? 0,
      active: row.active ?? true,
      schema: row.schema ?? [],
      id: row.id,
    });
    setSchemaText(JSON.stringify(row.schema ?? [], null, 2));
    setOpen(true);
  };
  const onDelete = async (row) => {
    if (!window.confirm(`${row.code} turini o'chirish?`)) return;
    try {
      await deleteFacilityTypeDef(row.id);
      toast.success("O'chirildi");
      fetchPage();
    } catch (e) {
      toast.error(e.message || "O'chirishda xatolik");
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      // Ensure latest schema text is parsed and applied
      let parsedSchema = form.schema;
      if (schemaText && typeof schemaText === "string") {
        try {
          const obj = JSON.parse(schemaText);
          parsedSchema = obj;
        } catch (err) {
          toast.error("Schema JSON xato: " + err.message);
          return;
        }
      }
      const payload = {
        ...form,
        code: String(form.code || "")
          .trim()
          .toUpperCase(),
        slug: String(form.slug || "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, ""),
        schema: parsedSchema,
      };
      if (!payload.code) {
        toast.warn("Code majburiy");
        return;
      }
      if (editing) await updateFacilityTypeDef(editing.id, payload);
      else await createFacilityTypeDef(payload);
      setOpen(false);
      fetchPage();
    } catch (err) {
      toast.error(err.message || "Saqlashda xatolik");
    }
  };

  return (
    <div className="org-table-page">
      <div className="page-header">
        <h2>Inshoot turlari</h2>
        <div className="muted">
          Admin uchun: kod, nom, ikonka, rang, schema va h.k.
        </div>
      </div>

      <div className="org-table-wrap">
        <div className="toolbar">
          <button className="btn primary" onClick={openCreate}>
            Yangi tur
          </button>
          <div className="spacer" />
        </div>

        <div className="table-card">
          <table className="org-table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>ID</th>
                <th style={{ width: 120 }}>Code</th>
                <th style={{ width: 160 }}>Slug</th>
                <th>Nomi</th>
                <th>Icon</th>
                <th>Rang</th>
                <th>Active</th>
                <th>Order</th>
                <th style={{ width: 220 }}>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8}>
                    <div className="overlay">
                      <div className="spinner" />
                    </div>
                  </td>
                </tr>
              )}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="empty">
                    Ma’lumot yo‘q
                  </td>
                </tr>
              )}
              {!loading &&
                items.map((row) => (
                  <tr key={row.id}>
                    <td className="num">{row.id}</td>
                    <td>
                      <code>{row.code}</code>
                    </td>
                    <td>
                      <code>{row.slug || ""}</code>
                    </td>
                    <td>{row.nameUz || row.nameRu || row.code}</td>
                    <td>
                      {row.iconEmoji && (
                        <span style={{ fontSize: 18 }}>{row.iconEmoji}</span>
                      )}
                      {row.iconUrl && (
                        <img
                          src={row.iconUrl}
                          alt="icon"
                          style={{
                            width: 22,
                            height: 22,
                            objectFit: "contain",
                            marginLeft: 6,
                          }}
                        />
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          display: "inline-block",
                          width: 20,
                          height: 12,
                          background: row.color || "#ccc",
                          borderRadius: 3,
                        }}
                      />
                      <span className="muted" style={{ marginLeft: 6 }}>
                        {row.color}
                      </span>
                    </td>
                    <td>{row.active ? "Ha" : "Yo‘q"}</td>
                    <td className="num">{row.sortOrder ?? 0}</td>
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

          <div className="paginator">
            <button
              className="btn"
              disabled={page === 0}
              onClick={() => setPage(0)}
            >
              «
            </button>
            <button
              className="btn"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ‹
            </button>
            <span className="muted">
              Sahifa {page + 1} / {Math.max(1, Math.ceil(total / size))}
            </span>
            <button
              className="btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              ›
            </button>
            <button
              className="btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(totalPages - 1)}
            >
              »
            </button>
            <div className="spacer" />
            <select
              className="select"
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(0);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="lg"
        title={editing ? "Tur tahrirlash" : "Yangi tur"}
      >
        <form onSubmit={onSubmit} className="facility-form-inner">
          <div className="form-grid">
            <div className="grid3">
              <div className="field">
                <label>Code *</label>
                <input
                  value={form.code ?? ""}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="e.g. GREENHOUSE"
                />
              </div>
              <div className="field">
                <label>Slug (ixtiyoriy)</label>
                <input
                  value={form.slug ?? ""}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="e.g. greenhouse"
                />
              </div>
              <div className="field">
                <label>Nomi (uz)</label>
                <input
                  value={form.nameUz ?? ""}
                  onChange={(e) => setForm({ ...form, nameUz: e.target.value })}
                />
              </div>
              <div className="field">
                <label>Nomi (ru)</label>
                <input
                  value={form.nameRu ?? ""}
                  onChange={(e) => setForm({ ...form, nameRu: e.target.value })}
                />
              </div>
            </div>

            <div className="grid3">
              <div className="field">
                <label>Emoji</label>
                <input
                  value={form.iconEmoji ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, iconEmoji: e.target.value })
                  }
                  placeholder="🌿"
                />
              </div>
              <div className="field">
                <label>Icon URL</label>
                <input
                  value={form.iconUrl ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, iconUrl: e.target.value })
                  }
                  placeholder="/uploads/icons/greenhouse.png"
                />
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginTop: 6,
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const fd = new FormData();
                      fd.append("file", f);
                      try {
                        const res = await api.post("/admin/uploads/icon", fd, {
                          headers: { "Content-Type": "multipart/form-data" },
                        });
                        const url = res?.data?.url;
                        if (url) {
                          setForm((prev) => ({ ...prev, iconUrl: url }));
                          toast.success("Yuklandi");
                        }
                      } catch (err) {
                        toast.error(err?.message || "Yuklashda xato");
                      } finally {
                        e.target.value = "";
                      }
                    }}
                  />
                  {form.iconUrl && (
                    <img
                      src={form.iconUrl}
                      alt="icon"
                      style={{ width: 24, height: 24, objectFit: "contain" }}
                    />
                  )}
                </div>
              </div>
              <div className="field">
                <label>Rangi (HEX)</label>
                <input
                  value={form.color ?? ""}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  placeholder="#16a34a"
                />
              </div>
            </div>

            <div className="grid3">
              <div className="field">
                <label>Active</label>
                <select
                  value={form.active ? "1" : "0"}
                  onChange={(e) =>
                    setForm({ ...form, active: e.target.value === "1" })
                  }
                >
                  <option value="1">Ha</option>
                  <option value="0">Yo‘q</option>
                </select>
              </div>
              <div className="field">
                <label>Sort order</label>
                <input
                  type="number"
                  value={form.sortOrder ?? 0}
                  onChange={(e) =>
                    setForm({ ...form, sortOrder: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            <SchemaEditor
              value={form.schema ?? []}
              onChange={(v) => setForm({ ...form, schema: v })}
              onRawTextChange={setSchemaText}
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn"
              onClick={() => setOpen(false)}
            >
              Bekor
            </button>
            <button type="submit" className="btn primary">
              Saqlash
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
