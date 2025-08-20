// src/components/org/OrgTable.jsx
import { useEffect, useMemo, useState } from "react";
import Modal from "../ui/Modal";
import MapPickerModal from "../map/MapPickerModal.jsx";
import {
  listOrgsPage,
  getOrgTree,
  createOrg,
  updateOrg,
  moveOrg,
  deleteOrg,
} from "../../api/org";

/* ---------- Helpers ---------- */

function flattenTree(nodes, parentId = null, depth = 0, out = []) {
  (nodes || []).forEach((n) => {
    const id = Number(n.key);
    out.push({ id, name: n.title, depth, parentId, raw: n });
    if (n.children?.length) flattenTree(n.children, id, depth + 1, out);
  });
  return out;
}

function toNumberOrNull(v) {
  if (v === "" || v === null || v === undefined) return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}

// draft.id tugunning barcha avlodlarini topish (parent selectda o'ziga yoki avlodiga ko'chirishni bloklash)
function collectDescendantIds(tree, rootId, out = new Set()) {
  const walk = (n) => {
    if (!n) return;
    if (n.children?.length) {
      n.children.forEach((c) => {
        out.add(Number(c.key));
        walk(c);
      });
    }
  };
  const dfs = (nodes) => {
    for (const n of nodes) {
      if (Number(n.key) === Number(rootId)) {
        walk(n);
        return true;
      }
      if (n.children?.length && dfs(n.children)) return true;
    }
    return false;
  };
  dfs(tree);
  return out;
}

/* ---------- Component ---------- */

export default function OrgTable() {
  // Server-side listing
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0); // zero-based
  const [size, setSize] = useState(20);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / size));

  const [q, setQ] = useState("");
  const [parentId, setParentId] = useState(""); // filter (all if "")
  const [sort, setSort] = useState(["sortOrder,asc", "name,asc"]); // Spring pageable format

  // Tree (parent select uchun)
  const [tree, setTree] = useState([]);
  const flat = useMemo(() => flattenTree(tree), [tree]);

  const filterOptions = useMemo(() => {
    const arr = [{ value: "", label: "— Hammasi —" }];
    flat.forEach((r) => {
      arr.push({
        value: String(r.id),
        label: `${"".padStart(r.depth * 2, " ")}${r.name}`,
      });
    });
    return arr;
  }, [flat]);

  // CRUD modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [contextRow, setContextRow] = useState(null);

  const [draft, setDraft] = useState({
    id: null,
    name: "",
    parentId: null,
    lat: "",
    lng: "",
    zoom: "",
  });

  // Map picker modal
  const [pickOpen, setPickOpen] = useState(false);

  // Loading overlay
  const [loading, setLoading] = useState(false);

  /* ---------- Data loaders ---------- */

  const loadPage = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size,
        q: q.trim() || undefined,
        sort,
      };
      if (String(parentId).length) params.parentId = Number(parentId);

      const res = await listOrgsPage(params);
      setRows(res?.content || []);
      setTotal(res?.totalElements || 0);
    } catch (e) {
      console.error(e);
      alert("Ma'lumot yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const loadTree = async () => {
    try {
      const t = await getOrgTree();
      setTree(Array.isArray(t) ? t : []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);
  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size, sort, parentId]);

  const onSearch = () => {
    setPage(0);
    loadPage();
  };

  /* ---------- Sorting ---------- */

  const toggleSort = (col) => {
    const current = sort.find((s) => s.startsWith(`${col},`));
    let next;
    if (!current) {
      next = `${col},asc`;
    } else if (current.endsWith(",asc")) {
      next = `${col},desc`;
    } else {
      // remove column and fallback to default
      setSort(["sortOrder,asc", "name,asc"]);
      setPage(0);
      return;
    }
    const others = sort.filter((s) => !s.startsWith(`${col},`));
    setSort([next, ...others]);
    setPage(0);
  };

  const sortIcon = (col) => {
    const current = sort.find((s) => s.startsWith(`${col},`));
    if (!current) return "↕";
    return current.endsWith(",asc") ? "▲" : "▼";
  };

  /* ---------- Parent select options in modals (exclude self & descendants) ---------- */

  const modalParentOptions = useMemo(() => {
    const exclude = new Set();
    if (draft.id) {
      collectDescendantIds(tree, draft.id, exclude);
      exclude.add(Number(draft.id));
    }
    const opts = [{ value: "", label: "— Root —" }];
    flat.forEach((r) => {
      if (!exclude.has(r.id)) {
        opts.push({
          value: String(r.id),
          label: `${"".padStart(r.depth * 2, " ")}${r.name}`,
        });
      }
    });
    return opts;
  }, [tree, flat, draft.id]);

  /* ---------- CRUD handlers ---------- */

  const openCreateRoot = () => {
    setContextRow(null);
    setDraft({
      id: null,
      name: "",
      parentId: null,
      lat: "",
      lng: "",
      zoom: "",
    });
    setCreateOpen(true);
  };

  const openCreateChild = (row) => {
    setContextRow(row);
    setDraft({
      id: null,
      name: "",
      parentId: row?.id ?? null,
      lat: "",
      lng: "",
      zoom: "",
    });
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!draft.name.trim()) return alert("Nom majburiy");
    setLoading(true);
    try {
      await createOrg({
        name: draft.name.trim(),
        parentId: toNumberOrNull(draft.parentId),
        lat: toNumberOrNull(draft.lat),
        lng: toNumberOrNull(draft.lng),
        zoom: toNumberOrNull(draft.zoom),
      });
      setCreateOpen(false);
      await loadPage();
      await loadTree();
    } catch (e) {
      console.error(e);
      alert("Yaratishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (row) => {
    setContextRow(row);
    setDraft({
      id: row.id,
      name: row.name || "",
      parentId: row.parentId ?? null,
      lat: row.lat ?? "",
      lng: row.lng ?? "",
      zoom: row.zoom ?? "",
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!draft.id) return;
    if (!draft.name.trim()) return alert("Nom majburiy");
    setLoading(true);
    try {
      const originalParentId = contextRow?.parentId ?? null;
      const newParentId = toNumberOrNull(draft.parentId);

      // 1) update basic fields
      await updateOrg(draft.id, {
        name: draft.name.trim(),
        lat: toNumberOrNull(draft.lat),
        lng: toNumberOrNull(draft.lng),
        zoom: toNumberOrNull(draft.zoom),
      });

      // 2) parent o'zgargan bo'lsa — reparent (oxiriga)
      if (originalParentId !== newParentId) {
        await moveOrg(draft.id, { newParentId, orderIndex: 999999 });
      }

      setEditOpen(false);
      await loadPage();
      await loadTree();
    } catch (e) {
      console.error(e);
      alert("Saqlashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const openDelete = (row) => {
    setContextRow(row);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!contextRow) return;
    setLoading(true);
    try {
      await deleteOrg(contextRow.id);
      setDeleteOpen(false);
      await loadPage();
      await loadTree();
    } catch (e) {
      console.error(e);
      alert("O‘chirishda xatolik (ehtimol bolalari mavjud?)");
    } finally {
      setLoading(false);
    }
  };

  const onChangeParentFilter = (e) => {
    setParentId(e.target.value);
    setPage(0);
  };

  /* ---------- Render ---------- */

  return (
    <div className="org-table-wrap">
      <div className="toolbar">
        <input
          className="search"
          placeholder="Qidiruv..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />
        <select
          className="parent-filter"
          value={parentId}
          onChange={onChangeParentFilter}
        >
          {filterOptions.map((o) => (
            <option key={o.value ?? "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="spacer" />
        <select
          className="size"
          value={size}
          onChange={(e) => {
            setSize(Number(e.target.value));
            setPage(0);
          }}
        >
          {[10, 20, 30, 50, 100].map((s) => (
            <option key={s} value={s}>
              {s}/page
            </option>
          ))}
        </select>
        <button className="btn" onClick={onSearch}>
          Qidir
        </button>
        <button className="btn primary" onClick={openCreateRoot}>
          + Root qo‘shish
        </button>
      </div>

      <div className="table-card">
        <table className="org-table">
          <thead>
            <tr>
              <th style={{ width: 56 }}>ID</th>
              <th className="sortable" onClick={() => toggleSort("name")}>
                Nomi <span className="sort">{sortIcon("name")}</span>
              </th>
              <th className="sortable" onClick={() => toggleSort("sortOrder")}>
                Tartib <span className="sort">{sortIcon("sortOrder")}</span>
              </th>
              <th>Parent</th>
              <th className="sortable" onClick={() => toggleSort("lat")}>
                Lat <span className="sort">{sortIcon("lat")}</span>
              </th>
              <th className="sortable" onClick={() => toggleSort("lng")}>
                Lng <span className="sort">{sortIcon("lng")}</span>
              </th>
              <th className="sortable" onClick={() => toggleSort("zoom")}>
                Zoom <span className="sort">{sortIcon("zoom")}</span>
              </th>
              <th style={{ width: 220 }}>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="num">{r.id}</td>
                <td>
                  <span
                    className="indent"
                    style={{ paddingLeft: (r.depth || 0) * 16 }}
                  />
                  {r.name}
                </td>
                <td className="num">{r.sortOrder ?? "—"}</td>
                <td className="muted">
                  {r.parentName ?? (r.parentId ? r.parentId : "— Root —")}
                </td>
                <td className="num">{r.lat ?? "—"}</td>
                <td className="num">{r.lng ?? "—"}</td>
                <td className="num">{r.zoom ?? "—"}</td>
                <td>
                  <div className="actions">
                    <button className="btn" onClick={() => openCreateChild(r)}>
                      + Child
                    </button>
                    <button className="btn" onClick={() => openEdit(r)}>
                      Edit
                    </button>
                    <button
                      className="btn danger"
                      onClick={() => openDelete(r)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">
                  Hech narsa topilmadi
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginator */}
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
          Page {page + 1} / {totalPages}
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
        <span className="muted">Total: {total}</span>
      </div>

      {/* CREATE MODAL */}
      <Modal
        open={createOpen}
        title="Bo‘lim qo‘shish"
        onClose={() => setCreateOpen(false)}
      >
        <div className="form-grid">
          <div className="field">
            <label>Nom *</label>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Masalan: Issiqxona bo‘limi"
            />
          </div>
          <div className="field">
            <label>Parent</label>
            <select
              value={draft.parentId ?? ""}
              onChange={(e) => setDraft({ ...draft, parentId: e.target.value })}
            >
              {modalParentOptions.map((o) => (
                <option key={o.value ?? "root"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid3">
            <div className="field">
              <label>Lat</label>
              <input
                type="number"
                value={draft.lat}
                onChange={(e) => setDraft({ ...draft, lat: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Lng</label>
              <input
                type="number"
                value={draft.lng}
                onChange={(e) => setDraft({ ...draft, lng: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Zoom</label>
              <input
                type="number"
                min={3}
                max={19}
                value={draft.zoom}
                onChange={(e) => setDraft({ ...draft, zoom: e.target.value })}
              />
            </div>
          </div>

          <div>
            <button className="btn" onClick={() => setPickOpen(true)}>
              Mapdan tanlash
            </button>
            <span className="muted" style={{ marginLeft: 8 }}>
              * Xarita oynasini ochib, nuqtani bosing.
            </span>
          </div>

          <div className="modal-actions">
            <button className="btn" onClick={() => setCreateOpen(false)}>
              Bekor
            </button>
            <button className="btn primary" onClick={handleCreate}>
              Saqlash
            </button>
          </div>
        </div>
      </Modal>

      {/* EDIT MODAL */}
      <Modal
        open={editOpen}
        title="Bo‘limni tahrirlash"
        onClose={() => setEditOpen(false)}
      >
        <div className="form-grid">
          <div className="field">
            <label>Nom *</label>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Parent</label>
            <select
              value={draft.parentId ?? ""}
              onChange={(e) => setDraft({ ...draft, parentId: e.target.value })}
            >
              {modalParentOptions.map((o) => (
                <option key={o.value ?? "root"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid3">
            <div className="field">
              <label>Lat</label>
              <input
                type="number"
                value={draft.lat}
                onChange={(e) => setDraft({ ...draft, lat: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Lng</label>
              <input
                type="number"
                value={draft.lng}
                onChange={(e) => setDraft({ ...draft, lng: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Zoom</label>
              <input
                type="number"
                min={3}
                max={19}
                value={draft.zoom}
                onChange={(e) => setDraft({ ...draft, zoom: e.target.value })}
              />
            </div>
          </div>

          <div>
            <button className="btn" onClick={() => setPickOpen(true)}>
              Mapdan tanlash
            </button>
            <span className="muted" style={{ marginLeft: 8 }}>
              * Tanlang va “Tanlash” tugmasini bosing.
            </span>
          </div>

          <div className="modal-actions">
            <button className="btn" onClick={() => setEditOpen(false)}>
              Bekor
            </button>
            <button className="btn primary" onClick={handleEdit}>
              Saqlash
            </button>
          </div>
        </div>
      </Modal>

      {/* DELETE CONFIRM */}
      <Modal
        open={deleteOpen}
        title="Bo‘limni o‘chirish"
        onClose={() => setDeleteOpen(false)}
        width={440}
      >
        <div className="confirm">
          <p>
            <b>{contextRow?.name}</b> bo‘limini o‘chirishni tasdiqlaysizmi?
          </p>
          <p className="muted">* Bolalari bo‘lsa, backend 409 qaytaradi.</p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setDeleteOpen(false)}>
              Bekor
            </button>
            <button className="btn danger" onClick={handleDelete}>
              O‘chirish
            </button>
          </div>
        </div>
      </Modal>

      {/* MAP PICKER MODAL */}
      <MapPickerModal
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        value={{
          lat: toNumberOrNull(draft.lat),
          lng: toNumberOrNull(draft.lng),
          zoom: toNumberOrNull(draft.zoom),
        }}
        onSave={({ lat, lng, zoom }) => {
          setDraft((d) => ({ ...d, lat, lng, zoom }));
        }}
      />

      {loading && (
        <div className="overlay">
          <div className="spinner" />
        </div>
      )}
    </div>
  );
}
