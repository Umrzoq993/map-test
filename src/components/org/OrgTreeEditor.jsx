// src/components/org/OrgTreeEditor.jsx
import { useEffect, useMemo, useState } from "react";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";
import Modal from "../ui/Modal";
import MapPickerModal from "../map/MapPickerModal.jsx";
import {
  getOrgTree,
  createOrg,
  updateOrg,
  deleteOrg,
  moveOrg,
} from "../../api/org";

/* ------- yordamchi: tree flatten (parent zanjiri bilan) ------- */
function flattenWithParents(nodes, parentId = null, out = [], orderPath = []) {
  nodes.forEach((n, idx) => {
    const item = {
      id: n.id,
      name: n.name ?? n.title ?? "",
      parentId,
      order: n.sortOrder ?? idx,
      orderPath: [...orderPath, idx],
      children: n.children || [],
      lat: n.lat ?? null,
      lng: n.lng ?? null,
      zoom: n.zoom ?? null,
    };
    out.push(item);
    if (item.children?.length) {
      flattenWithParents(item.children, item.id, out, item.orderPath);
    }
  });
  return out;
}
const toNumberOrNull = (v) => {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export default function OrgTreeEditor() {
  const [tree, setTree] = useState([]);
  const flat = useMemo(() => flattenWithParents(tree), [tree]);

  const [loading, setLoading] = useState(false);

  // tanlangan tugun
  const [selected, setSelected] = useState(null);

  // CRUD modal holatlar
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // forma draft
  const [draft, setDraft] = useState({
    id: null,
    name: "",
    parentId: null,
    lat: "",
    lng: "",
    zoom: "",
  });

  // xarita tanlovchi
  const [pickOpen, setPickOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const t = await getOrgTree();
      setTree(Array.isArray(t) ? t : []);
      // selection ni yangilash (agar id hali mavjud bo'lsa)
      if (selected) {
        const hit = flattenWithParents(t).find((x) => x.id === selected.id);
        setSelected(hit ?? null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // ilk yuklash

  /* ---------- Tree <-> rc-tree format ---------- */
  const rcData = useMemo(() => {
    const convert = (nodes) =>
      nodes.map((n) => ({
        key: String(n.id),
        title: n.name ?? n.title ?? "",
        children: (n.children || []).length ? convert(n.children) : undefined,
      }));
    return convert(tree);
  }, [tree]);

  const onSelect = (keys) => {
    const id = Number(keys?.[0]);
    const row = flat.find((x) => x.id === id) || null;
    setSelected(row);
  };

  /* ---------- Actions (open modals) ---------- */
  const openCreateRoot = () => {
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
  const openCreateChild = () => {
    if (!selected) return alert("Avval bo‘lim tanlang");
    setDraft({
      id: null,
      name: "",
      parentId: selected.id,
      lat: "",
      lng: "",
      zoom: "",
    });
    setCreateOpen(true);
  };
  const openEdit = () => {
    if (!selected) return alert("Tanlov yo‘q");
    setDraft({
      id: selected.id,
      name: selected.name ?? "",
      parentId: selected.parentId ?? null,
      lat: selected.lat ?? "",
      lng: selected.lng ?? "",
      zoom: selected.zoom ?? "",
    });
    setEditOpen(true);
  };
  const openDelete = () => {
    if (!selected) return alert("Tanlov yo‘q");
    setDeleteOpen(true);
  };

  /* ---------- CRUD submitlar ---------- */
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
      await load();
    } catch (e) {
      console.error(e);
      alert("Yaratishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!draft.id) return;
    if (!draft.name.trim()) return alert("Nom majburiy");
    setLoading(true);
    try {
      await updateOrg(draft.id, {
        name: draft.name.trim(),
        parentId: toNumberOrNull(draft.parentId),
        lat: toNumberOrNull(draft.lat),
        lng: toNumberOrNull(draft.lng),
        zoom: toNumberOrNull(draft.zoom),
      });
      setEditOpen(false);
      await load();
    } catch (e) {
      console.error(e);
      alert("Saqlashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      await deleteOrg(selected.id);
      setDeleteOpen(false);
      setSelected(null);
      await load();
    } catch (e) {
      console.error(e);
      alert("O‘chirishda xatolik (bolalari bo‘lishi mumkin)");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Drag & drop (joyini o‘zgartirish) ---------- */
  const onDrop = async (info) => {
    const dragId = Number(info.dragNode.key);
    const dropId = info.node ? Number(info.node.key) : null;
    const dropToGap = info.dropToGap;
    // dropPosition: -1 => oldiga, 0 => ichiga, 1 => keyiniga
    const dropPosition = info.dropPosition;

    // default semantika: ichiga (child) tashlansa parent dropId bo‘ladi.
    // gapga tashlansa - parent dropId ning o‘zi bo‘ladi, order dropPosition ga qarab backend belgilaydi.
    try {
      await moveOrg(dragId, {
        targetId: dropId,
        asChild: !dropToGap && dropPosition === 0,
        // ixtiyoriy: oldinga/keyiniga qo‘yish — backend o‘zi hisoblayversin
      });
      await load();
    } catch (e) {
      console.error(e);
      alert("Ko‘chirishda xatolik");
    }
  };

  /* ---------- UI ---------- */
  return (
    <div className="org-tree-page">
      <div className="org-tree-toolbar">
        <div className="left">
          <button className="btn primary" onClick={openCreateRoot}>
            + Root
          </button>
          <button className="btn" onClick={openCreateChild}>
            + Child
          </button>
          <button className="btn" onClick={openEdit}>
            Edit
          </button>
          <button className="btn danger" onClick={openDelete}>
            Delete
          </button>
        </div>
        <div className="right muted">
          {selected ? (
            <span>
              Tanlangan: <b>{selected.name}</b>
            </span>
          ) : (
            <span>Tanlanmagan</span>
          )}
        </div>
      </div>

      <div className="org-tree-card">
        <div className="org-tree-box">
          <Tree
            treeData={rcData}
            draggable
            blockNode
            selectable
            onSelect={onSelect}
            onDrop={onDrop}
            defaultExpandAll
          />
        </div>
      </div>

      {/* CREATE MODAL (root/child ikkalasiga ham) */}
      <Modal
        open={createOpen}
        title="Bo‘lim qo‘shish"
        onClose={() => setCreateOpen(false)}
        dark={document.body.classList.contains("theme-dark")}
      >
        <div className="org-tree-modal">
          <div className="form-grid">
            <div className="field">
              <label>Nom *</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Masalan: Issiqxona bo‘limi"
                autoFocus
              />
            </div>

            <div className="field">
              <label>Ota bo‘lim (parentId)</label>
              <input
                value={draft.parentId ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, parentId: e.target.value })
                }
                placeholder="(ixtiyoriy, root uchun bo‘sh)"
              />
            </div>

            <div className="field three">
              <div>
                <label>Lat</label>
                <input
                  value={draft.lat}
                  onChange={(e) => setDraft({ ...draft, lat: e.target.value })}
                />
              </div>
              <div>
                <label>Lng</label>
                <input
                  value={draft.lng}
                  onChange={(e) => setDraft({ ...draft, lng: e.target.value })}
                />
              </div>
              <div>
                <label>Zoom</label>
                <input
                  value={draft.zoom}
                  onChange={(e) => setDraft({ ...draft, zoom: e.target.value })}
                />
              </div>
            </div>

            <div className="map-hint">
              <button className="btn" onClick={() => setPickOpen(true)}>
                Xaritadan tanlash
              </button>
              <span className="muted">
                Lat/Lng/Zoom maydonlari avtomatik to‘ladi
              </span>
            </div>
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
        dark={document.body.classList.contains("theme-dark")}
      >
        <div className="org-tree-modal">
          <div className="form-grid">
            <div className="field">
              <label>Nom *</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Ota bo‘lim (parentId)</label>
              <input
                value={draft.parentId ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, parentId: e.target.value })
                }
              />
            </div>
            <div className="field three">
              <div>
                <label>Lat</label>
                <input
                  value={draft.lat ?? ""}
                  onChange={(e) => setDraft({ ...draft, lat: e.target.value })}
                />
              </div>
              <div>
                <label>Lng</label>
                <input
                  value={draft.lng ?? ""}
                  onChange={(e) => setDraft({ ...draft, lng: e.target.value })}
                />
              </div>
              <div>
                <label>Zoom</label>
                <input
                  value={draft.zoom ?? ""}
                  onChange={(e) => setDraft({ ...draft, zoom: e.target.value })}
                />
              </div>
            </div>
            <div className="map-hint">
              <button className="btn" onClick={() => setPickOpen(true)}>
                Xaritadan tanlash
              </button>
              <span className="muted">
                Lat/Lng/Zoom maydonlari avtomatik to‘ladi
              </span>
            </div>
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

      {/* DELETE MODAL */}
      <Modal
        open={deleteOpen}
        title="Bo‘limni o‘chirish"
        onClose={() => setDeleteOpen(false)}
        width={440}
        dark={document.body.classList.contains("theme-dark")}
      >
        <div className="org-tree-modal">
          <div className="confirm">
            <p>
              <b>{selected?.name}</b> bo‘limini o‘chirishni tasdiqlaysizmi?
            </p>
            <p className="muted">
              * Agar bolalari bo‘lsa, backend 409 qaytaradi.
            </p>
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setDeleteOpen(false)}>
              Bekor
            </button>
            <button className="btn danger" onClick={handleDelete}>
              Ha, o‘chirish
            </button>
          </div>
        </div>
      </Modal>

      {/* XARITA MODALI (umumiy) */}
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
        dark={document.body.classList.contains("theme-dark")}
        size="xl"
      />

      {loading && (
        <div className="overlay">
          <div className="spinner" />
        </div>
      )}
    </div>
  );
}
