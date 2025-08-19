import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";

import { getLatestDrawing, saveDrawing } from "../api/drawings";
import {
  fetchFacilities,
  patchFacility,
  deleteFacility,
  createFacility,
} from "../api/facilities";
import { iconFor } from "./mapIcons";

/** FlyTo: async EMAS; yon ta'sirlar useEffect ichida */
function MapFlyer({ target } = {}) {
  const map = useMap();
  useEffect(() => {
    if (!target || typeof target !== "object") return;
    const { lat, lng, zoom = 13 } = target;
    if (typeof lat !== "number" || typeof lng !== "number") return;

    const curZoom = map.getZoom();
    const midZoom = Math.max(3, curZoom - 3);

    map.flyTo(map.getCenter(), midZoom, {
      duration: 0.6,
      easeLinearity: 0.15,
      animate: true,
    });
    const t = setTimeout(() => {
      map.flyTo([lat, lng], zoom, {
        duration: 1.2,
        easeLinearity: 0.25,
        animate: true,
      });
    }, 650);

    return () => clearTimeout(t);
  }, [target?.ts]); // ts -> retrigger
  return null;
}

/** Viewport watcher: moveend da BBOX yuboradi ("minLng,minLat,maxLng,maxLat") */
function ViewportWatcher({ onBboxChange }) {
  const map = useMap();
  useEffect(() => {
    const toBBox = (b) =>
      `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
    const update = () => onBboxChange(toBBox(map.getBounds()));
    map.whenReady(update);
    map.on("moveend", update);
    return () => map.off("moveend", update);
  }, [map, onBboxChange]);
  return null;
}

export default function MapDraw({
  center = [41.3111, 69.2797],
  zoom = 12,
  height = "calc(100vh - 100px)",
  dark = false,
  orgTree = [], // [{ key, title, pos:[lat,lng], zoom?, children:[] }]
  hideTree = false, // drawer ochiq bo‘lsa true
}) {
  const featureGroupRef = useRef(null);

  // Draw qatlami
  const [geojson, setGeojson] = useState(null);

  // Org tree
  const [checkedKeys, setCheckedKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [navTarget, setNavTarget] = useState(null);

  // Qidiruv (debounce)
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);
  const onClearSearch = () => setSearchInput("");

  // BBOX
  const [bbox, setBbox] = useState(null);

  // Facilitylar
  const [facilities, setFacilities] = useState([]);
  const [typeFilter, setTypeFilter] = useState({
    GREENHOUSE: true,
    COWSHED: true,
    STABLE: true,
    FISHFARM: true,
    WAREHOUSE: false,
    ORCHARD: false,
    FIELD: false,
    POULTRY: false,
    APIARY: false,
  });
  const enabledTypes = useMemo(
    () =>
      Object.entries(typeFilter)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [typeFilter]
  );
  const [reloadKey, setReloadKey] = useState(0);

  // Create Facility drawer
  const [createOpen, setCreateOpen] = useState(false);
  const [draftGeom, setDraftGeom] = useState(null); // GeoJSON Geometry
  const [draftCenter, setDraftCenter] = useState(null); // {lat,lng}
  const [form, setForm] = useState({
    orgId: null,
    name: "",
    type: "GREENHOUSE",
    status: "ACTIVE",
    zoom: 15,
    attributes: { notes: "" },
  });

  // Draw → GeoJSON panel
  const updateGeoJSON = useCallback(() => {
    const fg = featureGroupRef.current;
    if (!fg) return;
    setGeojson(fg.toGeoJSON());
  }, []);
  const onEdited = useCallback(updateGeoJSON, [updateGeoJSON]);
  const onDeleted = useCallback(updateGeoJSON, [updateGeoJSON]);

  // Draw created → Facility create drawer
  const onCreated = useCallback(
    (e) => {
      updateGeoJSON();
      const layer = e.layer;
      const type = e.layerType; // "polygon" | "rectangle" | "marker" | ...

      if (!["marker", "polygon", "rectangle"].includes(type)) return;

      const gj = layer.toGeoJSON();
      const geometry = gj.geometry;

      let lat, lng;
      if (type === "marker") {
        const ll = layer.getLatLng();
        lat = ll.lat;
        lng = ll.lng;
      } else {
        const c = layer.getBounds().getCenter();
        lat = c.lat;
        lng = c.lng;
      }

      setDraftGeom(geometry);
      setDraftCenter({ lat, lng });
      setCreateOpen(true);
    },
    [updateGeoJSON]
  );

  // Backend'dan oxirgi chizmani yuklash
  useEffect(() => {
    (async () => {
      try {
        if (!getLatestDrawing) return;
        const latest = await getLatestDrawing();
        if (!latest?.geojson) return;
        const fg = featureGroupRef.current;
        if (!fg) return;
        fg.clearLayers();
        L.geoJSON(latest.geojson).eachLayer((lyr) => fg.addLayer(lyr));
        setGeojson(latest.geojson);
      } catch (e) {
        console.error("Load latest drawing failed:", e);
      }
    })();
  }, []);

  // Org daraxtini tekislash
  const flatNodes = useMemo(() => {
    const out = [];
    const walk = (arr) => {
      arr.forEach((n) => {
        out.push({ ...n, key: String(n.key) });
        if (n.children) walk(n.children);
      });
    };
    walk(orgTree);
    return out;
  }, [orgTree]);

  // Highlight
  const highlight = (text, q) => {
    if (!q) return text;
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) return text;
    return (
      <span>
        {text.slice(0, i)}
        <mark>{text.slice(i, i + q.length)}</mark>
        {text.slice(i + q.length)}
      </span>
    );
  };

  // REAL FILTER: faqat mos tugunlar va ajdodlari
  const [expandedKeys, setExpandedKeys] = useState(undefined);
  const { filteredTree, visibleKeySet } = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return { filteredTree: orgTree, visibleKeySet: null };
    const visible = new Set();
    const prune = (nodes) => {
      const res = [];
      for (const n of nodes) {
        const keyStr = String(n.key);
        const titleStr = typeof n.title === "string" ? n.title : "";
        const selfMatch = titleStr.toLowerCase().includes(q);
        const childPruned = n.children ? prune(n.children) : null;
        if (selfMatch || (childPruned && childPruned.length)) {
          visible.add(keyStr);
          res.push({
            ...n,
            children:
              childPruned && childPruned.length ? childPruned : undefined,
          });
        }
      }
      return res;
    };
    const filtered = prune(orgTree);
    return { filteredTree: filtered, visibleKeySet: visible };
  }, [orgTree, query]);

  useEffect(() => {
    if (visibleKeySet) setExpandedKeys(Array.from(visibleKeySet));
    else setExpandedKeys(undefined);
  }, [visibleKeySet]);

  // rc-tree data
  const rcData = useMemo(() => {
    const q = query;
    const mapNode = (n) => ({
      key: String(n.key),
      title: typeof n.title === "string" ? highlight(n.title, q) : n.title,
      children: n.children ? n.children.map(mapNode) : undefined,
    });
    return (filteredTree || []).map(mapNode);
  }, [filteredTree, query]);

  // Checkbox org markerlar
  const visibleMarkers = useMemo(
    () => flatNodes.filter((n) => n.pos && checkedKeys.includes(String(n.key))),
    [flatNodes, checkedKeys]
  );

  // Tanlangan orgId
  const selectedOrgId = useMemo(() => {
    const k = selectedKeys?.[0];
    if (!k) return null;
    const n = flatNodes.find((x) => String(x.key) === String(k));
    return n ? Number(n.key) : null;
  }, [selectedKeys, flatNodes]);

  // Tanlangan orgId -> forma
  useEffect(() => {
    setForm((f) => ({ ...f, orgId: selectedOrgId || null }));
  }, [selectedOrgId]);

  // Tree eventlari
  const onTreeCheck = (keys) => setCheckedKeys(keys.map(String));
  const onTreeSelect = (keys) => {
    setSelectedKeys(keys);
    const k = keys?.[0] ? String(keys[0]) : null;
    if (!k) return;
    const n = flatNodes.find((x) => String(x.key) === k);
    if (n?.pos && Array.isArray(n.pos)) {
      setNavTarget({
        lat: n.pos[0],
        lng: n.pos[1],
        zoom: Number.isFinite(n.zoom) ? n.zoom : 13,
        ts: Date.now(),
      });
    }
  };
  const onTreeExpand = (keys) => setExpandedKeys(keys);

  // BBOX + filter bo‘yicha facilities fetch (debounce 250ms, BIRTA so‘rov)
  useEffect(() => {
    let cancelled = false;
    if (!bbox || !selectedOrgId || enabledTypes.length === 0) {
      setFacilities([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await fetchFacilities({
          orgId: selectedOrgId,
          types: enabledTypes,
          bbox,
        });
        if (!cancelled) setFacilities(data);
      } catch (e) {
        if (!cancelled) console.error("fetchFacilities failed:", e);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [bbox, selectedOrgId, enabledTypes, reloadKey]);

  // GeoJSON import (textarea)
  const geojsonPretty = geojson ? JSON.stringify(geojson, null, 2) : "";
  const importFromTextarea = () => {
    const text = document.getElementById("gj-input")?.value;
    try {
      const parsed = JSON.parse(text);
      const fg = featureGroupRef.current;
      if (!fg) return;
      fg.clearLayers();
      L.geoJSON(parsed).eachLayer((lyr) => fg.addLayer(lyr));
      setGeojson(parsed);
    } catch {
      alert("Noto‘g‘ri JSON!");
    }
  };

  return (
    <div className="map-wrapper" style={{ position: "relative" }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height, width: "100%" }}
      >
        <TileLayer
          url={
            dark
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          attribution="&copy; OSM &copy; Carto"
        />

        {/* Viewport listener */}
        <ViewportWatcher onBboxChange={setBbox} />

        {/* FlyTo */}
        <MapFlyer target={navTarget} />

        {/* Org markerlar */}
        {visibleMarkers.map((n) => (
          <Marker key={n.key} position={n.pos}>
            <Popup>{n.title}</Popup>
          </Marker>
        ))}

        {/* Facilities markers */}
        {facilities.map((f) =>
          typeof f.lat === "number" && typeof f.lng === "number" ? (
            <Marker
              key={`f-${f.id}`}
              position={[f.lat, f.lng]}
              icon={iconFor(f.type)}
            >
              <Popup>
                <div style={{ minWidth: 220 }}>
                  <div style={{ fontWeight: 700 }}>{f.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
                    {f.type} • {f.status}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={async () => {
                        const name = prompt("Yangi nom:", f.name);
                        if (name == null) return;
                        const status = prompt(
                          "Status (ACTIVE/INACTIVE/UNDER_MAINTENANCE):",
                          f.status
                        );
                        if (status == null) return;
                        try {
                          await patchFacility(f.id, { name, status });
                          setReloadKey((k) => k + 1);
                        } catch (e) {
                          alert("Yangilashda xatolik");
                          console.error(e);
                        }
                      }}
                      style={{
                        padding: "6px 10px",
                        border: "1px solid #e3e6eb",
                        borderRadius: 6,
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>

                    <button
                      onClick={async () => {
                        if (!confirm(`O'chirilsinmi: ${f.name}?`)) return;
                        try {
                          await deleteFacility(f.id);
                          setReloadKey((k) => k + 1);
                        } catch (e) {
                          alert("O'chirishda xatolik");
                          console.error(e);
                        }
                      }}
                      style={{
                        padding: "6px 10px",
                        border: "1px solid #e3e6eb",
                        borderRadius: 6,
                        cursor: "pointer",
                        background: "#fff0f0",
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  {f.attributes?.notes && (
                    <div style={{ marginTop: 10, fontSize: 12 }}>
                      {String(f.attributes.notes)}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ) : null
        )}

        {/* Draw */}
        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topright"
            onCreated={onCreated}
            onEdited={onEdited}
            onDeleted={onDeleted}
            draw={{
              polyline: true,
              polygon: true,
              rectangle: true,
              circle: false,
              circlemarker: false,
              marker: true,
            }}
          />
        </FeatureGroup>
      </MapContainer>

      {/* Org tree — overlay */}
      <div className={`org-tree-card ${hideTree ? "is-hidden" : ""}`}>
        <div className="org-tree-card__header">
          Tashkilot tuzilmasi
          <div className="org-tree-search-wrap">
            <input
              className="org-tree-search"
              type="text"
              placeholder="Qidirish..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") onClearSearch();
                if (e.key === "Enter") setQuery(searchInput.trim());
              }}
            />
            {searchInput && (
              <button
                className="org-tree-search__clear"
                onClick={onClearSearch}
                aria-label="Qidiruvni tozalash"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="org-tree-card__body">
          {rcData.length ? (
            <Tree
              checkable
              selectable
              treeData={rcData}
              checkedKeys={checkedKeys}
              selectedKeys={selectedKeys}
              expandedKeys={expandedKeys}
              onExpand={onTreeExpand}
              onCheck={onTreeCheck}
              onSelect={onTreeSelect}
              defaultExpandAll={!query}
              autoExpandParent
              virtual={false}
            />
          ) : (
            <div style={{ fontSize: 13, color: "#888" }}>
              Hech narsa topilmadi{query ? `: "${query}"` : ""}
            </div>
          )}
        </div>

        <div className="org-tree-card__hint">
          ✔ marker ko‘rsatadi · 1× click → joyga uchish
          {bbox && (
            <div style={{ marginTop: 4, opacity: 0.8 }}>BBOX: {bbox}</div>
          )}
        </div>

        {/* Facility turlari filteri */}
        <div
          className="org-tree-card__body"
          style={{ borderTop: "1px solid var(--border,#e9ecf1)" }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Obyekt turlari</div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}
          >
            {Object.keys(typeFilter).map((k) => (
              <label
                key={k}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <input
                  type="checkbox"
                  checked={typeFilter[k]}
                  onChange={(e) =>
                    setTypeFilter((s) => ({ ...s, [k]: e.target.checked }))
                  }
                />
                <span style={{ fontSize: 13 }}>{k}</span>
              </label>
            ))}
          </div>
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
            {selectedOrgId ? `Org #${selectedOrgId}` : "Org tanlang"} • Topildi:{" "}
            {facilities.length}
          </div>
        </div>
      </div>

      {/* Create Facility Drawer */}
      {createOpen && (
        <div className="facility-drawer">
          <div className="facility-drawer__header">
            Yangi obyekt yaratish
            <button className="fd-close" onClick={() => setCreateOpen(false)}>
              ×
            </button>
          </div>

          <div className="facility-drawer__body">
            {!selectedOrgId && (
              <div className="fd-alert">
                Avval tree’dan bo‘limni tanlang (org). Shunda obyekt shu
                bo‘limga biriktiriladi.
              </div>
            )}

            <div className="fd-field">
              <label>Bo‘lim (Org ID)</label>
              <input
                type="number"
                value={form.orgId || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    orgId: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="Masalan: 1"
              />
              <div className="fd-hint">
                Tree’dan tanlaganingizda bu maydon avtomatik to‘ladi.
              </div>
            </div>

            <div className="fd-field">
              <label>Nomi</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Masalan: Issiqxona A"
              />
            </div>

            <div className="fd-grid">
              <div className="fd-field">
                <label>Turi</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {[
                    "GREENHOUSE",
                    "COWSHED",
                    "STABLE",
                    "FISHFARM",
                    "WAREHOUSE",
                    "ORCHARD",
                    "FIELD",
                    "POULTRY",
                    "APIARY",
                  ].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="fd-field">
                <label>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  {["ACTIVE", "INACTIVE", "UNDER_MAINTENANCE"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="fd-field">
                <label>Zoom</label>
                <input
                  type="number"
                  min="3"
                  max="19"
                  value={form.zoom ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      zoom: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </div>
            </div>

            <div className="fd-field">
              <label>Izoh (attributes.notes)</label>
              <textarea
                rows={3}
                value={form.attributes?.notes ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    attributes: {
                      ...(form.attributes || {}),
                      notes: e.target.value,
                    },
                  })
                }
                placeholder="Qo‘shimcha izoh..."
              />
            </div>

            <div className="fd-geom">
              <div>
                <b>Geometriya:</b> {draftGeom?.type}
              </div>
              {draftCenter && (
                <div className="fd-hint">
                  Markaz: {draftCenter.lat.toFixed(6)},{" "}
                  {draftCenter.lng.toFixed(6)}
                </div>
              )}
            </div>
          </div>

          <div className="facility-drawer__footer">
            <button
              className="fd-secondary"
              onClick={() => setCreateOpen(false)}
            >
              Bekor qilish
            </button>
            <button
              className="fd-primary"
              onClick={async () => {
                try {
                  if (!form.orgId) {
                    alert("Org ID tanlang yoki kiriting.");
                    return;
                  }
                  if (!form.name.trim()) {
                    alert("Nomi kerak.");
                    return;
                  }
                  if (!draftGeom) {
                    alert("Geometriya yo‘q (polygon/marker chizing).");
                    return;
                  }
                  const payload = {
                    orgId: form.orgId,
                    name: form.name.trim(),
                    type: form.type,
                    status: form.status,
                    lat: draftCenter?.lat ?? null,
                    lng: draftCenter?.lng ?? null,
                    zoom: form.zoom ?? null,
                    attributes: form.attributes || null,
                    geometry: draftGeom,
                  };
                  await createFacility(payload);
                  setCreateOpen(false);
                  setDraftGeom(null);
                  setDraftCenter(null);
                  setForm((f) => ({
                    ...f,
                    name: "",
                    attributes: { notes: "" },
                  }));
                  const fg = featureGroupRef.current;
                  if (fg) fg.clearLayers();
                  setReloadKey((k) => k + 1);
                  alert("Obyekt saqlandi!");
                } catch (e) {
                  console.error(e);
                  alert("Saqlashda xatolik.");
                }
              }}
            >
              Saqlash
            </button>
          </div>
        </div>
      )}

      {/* Pastki panel: GeoJSON import/export + save backend */}
      <div className="panel">
        <div className="panel-col">
          <h4>GeoJSON (readonly)</h4>
          <textarea readOnly value={geojsonPretty} />
        </div>
        <div className="panel-col">
          <h4>GeoJSON import</h4>
          <textarea
            id="gj-input"
            placeholder='{"type":"FeatureCollection","features":[...]}'
          />
          <div className="panel-actions">
            <button onClick={importFromTextarea}>Import</button>
            <a
              href={
                "data:application/json;charset=utf-8," +
                encodeURIComponent(geojsonPretty || "{}")
              }
              download="drawings.geojson"
            >
              <button disabled={!geojsonPretty}>Download .geojson</button>
            </a>
            <button
              onClick={async () => {
                try {
                  if (!saveDrawing)
                    return alert("Backend API ulanishi topilmadi.");
                  const data = geojson || {};
                  await saveDrawing(data, "map-drawings");
                  alert("Saqlash muvaffaqiyatli!");
                } catch (e) {
                  console.error(e);
                  alert("Saqlashda xatolik");
                }
              }}
              disabled={!geojson}
            >
              Save to backend
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
