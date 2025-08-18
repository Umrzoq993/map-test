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
  deleteFacility,
  patchFacility,
} from "../api/facilities"; // ⬅️ qo'shildi
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
  }, [target?.ts]);
  return null;
}

/** Viewport watcher: moveend da BBOX yuboradi ("minLng,minLat,maxLng,maxLat") */
function ViewportWatcher({ onBboxChange }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const toBBox = (b) =>
      `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;

    const update = () => {
      const b = map.getBounds();
      onBboxChange(toBBox(b));
    };

    map.whenReady(update);
    map.on("moveend", update);
    map.on("zoomend", update);

    return () => {
      map.off("moveend", update);
      map.off("zoomend", update);
    };
  }, [map, onBboxChange]);

  return null;
}

export default function MapDraw({
  center = [41.3111, 69.2797],
  zoom = 12,
  height = "calc(100vh - 100px)",
  dark = false,
  orgTree = [], // [{ key, title, pos:[lat,lng], zoom?, children:[] }]
  hideTree = false, // drawer ochiq bo‘lsa true qilib tree overlay'ni yashirish
}) {
  const featureGroupRef = useRef(null);

  // Draw qatlami uchun state
  const [geojson, setGeojson] = useState(null);

  // Tree state’lari
  const [checkedKeys, setCheckedKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [navTarget, setNavTarget] = useState(null); // {lat,lng,zoom,ts}

  // 🔎 Qidiruv: input (debounce bilan) -> query
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);
  const onClearSearch = () => setSearchInput("");

  // Viewport BBOX
  const [bbox, setBbox] = useState(null); // "minLng,minLat,maxLng,maxLat"

  // Facilities (obyektlar) va filter
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

  // 🔁 Reload trigger — fetchni majburan qayta ishlatish uchun
  const [reloadKey, setReloadKey] = useState(0); // ⬅️ qo'shildi

  // ✅ Tanlangan turlar ro'yxati (CSV uchun)
  const enabledTypes = useMemo(
    () =>
      Object.entries(typeFilter)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [typeFilter]
  );

  // Draw → GeoJSON panel
  const updateGeoJSON = useCallback(() => {
    const fg = featureGroupRef.current;
    if (!fg) return;
    setGeojson(fg.toGeoJSON());
  }, []);
  const onCreated = useCallback(updateGeoJSON, [updateGeoJSON]);
  const onEdited = useCallback(updateGeoJSON, [updateGeoJSON]);
  const onDeleted = useCallback(updateGeoJSON, [updateGeoJSON]);

  // Backend'dan oxirgi chizmani yuklash (bor bo‘lsa)
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

  // Org daraxtini tekislash (key → node topish uchun)
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

  // Matnni highlight qilish
  const highlight = (text, q) => {
    if (!q) return text;
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) return text;
    const before = text.slice(0, i);
    const hit = text.slice(i, i + q.length);
    const after = text.slice(i + q.length);
    return (
      <span>
        {before}
        <mark>{hit}</mark>
        {after}
      </span>
    );
  };

  // REAL FILTER: faqat mos tugunlar va ularning ajdodlari ko‘rinadi
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

  // rc-tree data (highlight bilan)
  const rcData = useMemo(() => {
    const q = query;
    const mapNode = (n) => ({
      key: String(n.key),
      title: typeof n.title === "string" ? highlight(n.title, q) : n.title,
      children: n.children ? n.children.map(mapNode) : undefined,
    });
    return (filteredTree || []).map(mapNode);
  }, [filteredTree, query]);

  // Checkbox’larga mos org markerlar (oldingi funksionallik)
  const visibleMarkers = useMemo(
    () => flatNodes.filter((n) => n.pos && checkedKeys.includes(String(n.key))),
    [flatNodes, checkedKeys]
  );

  // Tanlangan orgId (backend tree key = id string)
  const selectedOrgId = useMemo(() => {
    const k = selectedKeys?.[0];
    if (!k) return null;
    const n = flatNodes.find((x) => String(x.key) === String(k));
    return n ? Number(n.key) : null;
  }, [selectedKeys, flatNodes]);

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

  // 🔥 BBOX + filter bo‘yicha facilities fetch (debounce 250ms, BIRTA so‘rov)
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
          types: enabledTypes, // ko‘p tur bitta paramda (CSV) ketadi — fetch ichida birlashtiriladi
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
  }, [bbox, selectedOrgId, enabledTypes, reloadKey]); // ⬅️ reloadKey qo'shildi

  // GeoJSON import (textarea dan)
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

        {/* Viewport listener: harakatda BBOX yangilanadi */}
        <ViewportWatcher onBboxChange={setBbox} />

        {/* FlyTo (org tanlanganda) */}
        <MapFlyer target={navTarget} />

        {/* Org markerlar (checkbox'lar bo'yicha) */}
        {visibleMarkers.map((n) => (
          <Marker key={n.key} position={n.pos}>
            <Popup>{n.title}</Popup>
          </Marker>
        ))}

        {/* Facilities (bbox + filter) */}
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
                        const newName = window.prompt("Yangi nom:", f.name);
                        if (newName == null) return; // bekor qilindi
                        const newStatus = window.prompt(
                          "Status (ACTIVE/INACTIVE/UNDER_MAINTENANCE):",
                          f.status
                        );
                        if (newStatus == null) return;

                        try {
                          await patchFacility(f.id, {
                            name: newName,
                            status: newStatus,
                          });
                          setReloadKey((k) => k + 1); // ro'yxatni yangilash
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
                        if (!window.confirm(`O'chirilsinmi: ${f.name}?`))
                          return;
                        try {
                          await deleteFacility(f.id);
                          setReloadKey((k) => k + 1); // ro'yxatni yangilash
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

      {/* Org tree — overlay (qidiruv + filter) */}
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
