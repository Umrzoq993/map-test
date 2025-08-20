import { useEffect, useMemo, useState } from "react";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";
import {
  getOrgTree,
  createOrg,
  updateOrg,
  deleteOrg,
  moveOrg,
} from "../../api/org";

function flattenWithParents(nodes, parentId = null, out = [], orderPath = []) {
  nodes.forEach((n, idx) => {
    const item = {
      id: n.id,
      title: n.title,
      parentId,
      lat: n.lat ?? null,
      lng: n.lng ?? null,
      zoom: n.zoom ?? null,
      orderPath: [...orderPath, idx],
      children: n.children || [],
    };
    out.push(item);
    if (n.children?.length)
      flattenWithParents(n.children, n.id, out, item.orderPath);
  });
  return out;
}

function toRcTree(nodes) {
  return nodes.map((n) => ({
    key: String(n.id),
    title: n.title,
    children: n.children?.length ? toRcTree(n.children) : undefined,
  }));
}

export default function OrgTreeEditor() {
  const [loading, setLoading] = useState(false);
  const [tree, setTree] = useState([]); // backend tree
  const [selectedKey, setSelectedKey] = useState(null);
  const [search, setSearch] = useState("");

  // form state
  const [form, setForm] = useState({
    id: null,
    title: "",
    lat: "",
    lng: "",
    zoom: "",
  });

  // load
  const load = async () => {
    setLoading(true);
    try {
      const data = await getOrgTree();
      setTree(data || []);
    } catch (e) {
      console.error(e);
      alert("Tree yuklashda xatolik");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  // helpers
  const flat = useMemo(() => flattenWithParents(tree), [tree]);

  // search filter (parents preserved if child matches)
  const filteredTree = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tree;
    const filterRec = (nodes) => {
      const res = [];
      for (const n of nodes) {
        const title = (n.title || "").toLowerCase();
        const kids = n.children?.length ? filterRec(n.children) : [];
        if (title.includes(q) || kids.length) {
          res.push({ ...n, children: kids.length ? kids : undefined });
        }
      }
      return res;
    };
    return filterRec(tree);
  }, [tree, search]);

  const rcData = useMemo(() => toRcTree(filteredTree), [filteredTree]);

  const selected = useMemo(
    () =>
      selectedKey
        ? flat.find((x) => String(x.id) === String(selectedKey))
        : null,
    [selectedKey, flat]
  );

  useEffect(() => {
    if (!selected) {
      setForm({ id: null, title: "", lat: "", lng: "", zoom: "" });
    } else {
      setForm({
        id: selected.id,
        title: selected.title || "",
        lat: selected.lat ?? "",
        lng: selected.lng ?? "",
        zoom: selected.zoom ?? "",
      });
    }
  }, [selected]);

  // CRUD actions
  const createRoot = async () => {
    const title = prompt("Yangi bo‘lim nomi:");
    if (!title) return;
    setLoading(true);
    try {
      await createOrg({ title });
      await load();
    } catch (e) {
      console.error(e);
      alert("Yaratishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const createChild = async () => {
    if (!selected) return alert("Avval bo‘lim tanlang");
    const title = prompt(`"${selected.title}" ichida yangi bo‘lim nomi:`);
    if (!title) return;
    setLoading(true);
    try {
      await createOrg({ title, parentId: selected.id });
      await load();
    } catch (e) {
      console.error(e);
      alert("Yaratishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!form.id) return alert("Bo‘lim tanlanmagan");
    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        lat: form.lat === "" ? null : Number(form.lat),
        lng: form.lng === "" ? null : Number(form.lng),
        zoom: form.zoom === "" ? null : Number(form.zoom),
      };
      await updateOrg(form.id, payload);
      await load();
    } catch (e) {
      console.error(e);
      alert("Saqlashda xatolik");
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!selected) return alert("Bo‘lim tanlang");
    if (!confirm(`Bo‘limni o‘chirishni tasdiqlaysizmi?\n"${selected.title}"`))
      return;
    setLoading(true);
    try {
      await deleteOrg(selected.id);
      setSelectedKey(null);
      await load();
    } catch (e) {
      console.error(e);
      alert("O‘chirishda xatolik (ehtimol bolalari mavjud?)");
    } finally {
      setLoading(false);
    }
  };

  // drag & drop → move
  const onDrop = async (info) => {
    // info: { dragNode, node (drop target), dropToGap, dropPosition }
    try {
      const dragId = Number(info.dragNode.key);
      const dropId = Number(info.node.key);
      const dropToGap = info.dropToGap; // true => sibling sifatida; false => ichiga
      // parent aniqlash
      // parentMap tuzamiz
      const parentMap = new Map(); // childId -> parentId
      const walk = (nodes, parentId = null) => {
        nodes.forEach((n) => {
          parentMap.set(n.id, parentId);
          if (n.children?.length) walk(n.children, n.id);
        });
      };
      walk(tree);

      let newParentId;
      let orderIndex;

      if (dropToGap) {
        // drop targetning ota-onasi ichida joylash
        newParentId = parentMap.get(dropId) ?? null;
        // targetning bir ota ichidagi indeksini topamiz
        const siblings =
          (newParentId === null
            ? tree
            : flat.find((x) => x.id === newParentId)?.children) || [];

        const idxInSiblings = siblings.findIndex((x) => x.id === dropId);
        // dropPosition: -1 (oldiga), 1 (orqasiga)
        orderIndex = idxInSiblings + (info.dropPosition > 0 ? 1 : 0);
      } else {
        // target ichiga oxiriga qo‘yish
        newParentId = dropId;
        const target = flat.find((x) => x.id === dropId);
        const childCount = target?.children?.length || 0;
        orderIndex = childCount; // append to end
      }

      await moveOrg(dragId, { newParentId, orderIndex });
      await load();
    } catch (e) {
      console.error(e);
      alert("Ko‘chirishda xatolik");
    }
  };

  return (
    <div className="org-editor">
      <div className="org-left">
        <div className="org-toolbar">
          <input
            className="org-search"
            placeholder="Qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="spacer" />
          <button className="btn" onClick={createRoot}>
            + Root
          </button>
          <button className="btn" onClick={createChild} disabled={!selected}>
            + Child
          </button>
          <button
            className="btn btn-danger"
            onClick={remove}
            disabled={!selected}
          >
            Delete
          </button>
        </div>

        <div className="org-tree-wrap">
          <Tree
            treeData={rcData}
            selectable
            draggable
            blockNode
            onSelect={(keys) => setSelectedKey(keys?.[0] || null)}
            onDrop={onDrop}
            defaultExpandAll
          />
        </div>
      </div>

      <div className="org-right">
        <div className="card">
          <div className="card-header">Bo‘lim ma’lumotlari</div>
          <div className="card-body">
            {selected ? (
              <>
                <div className="field">
                  <label>Nom</label>
                  <input
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </div>

                <div className="grid-3">
                  <div className="field">
                    <label>Lat</label>
                    <input
                      type="number"
                      value={form.lat}
                      onChange={(e) =>
                        setForm({ ...form, lat: e.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Lng</label>
                    <input
                      type="number"
                      value={form.lng}
                      onChange={(e) =>
                        setForm({ ...form, lng: e.target.value })
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Zoom</label>
                    <input
                      type="number"
                      min={3}
                      max={19}
                      value={form.zoom}
                      onChange={(e) =>
                        setForm({ ...form, zoom: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="actions">
                  <button className="btn btn-primary" onClick={save}>
                    Saqlash
                  </button>
                </div>
                <div className="hint">
                  * Lat/Lng to‘ldirilsa, Map sahifasida yana shu bo‘lim markeri
                  va flyTo ishlaydi.
                </div>
              </>
            ) : (
              <div className="muted">
                Chapdan bo‘lim tanlang yoki yangi bo‘lim yarating.
              </div>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="overlay">
          <div className="spinner" />
        </div>
      )}
    </div>
  );
}
