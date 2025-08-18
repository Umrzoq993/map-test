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

/** Ichki "uchirish" komponenti: target o‘zgarsa, zoom-out → flyTo bajaradi */
function MapFlyer({ target }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    const { lat, lng, zoom = 13 } = target;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const curZoom = map.getZoom();
    const midZoom = Math.max(3, curZoom - 3);

    // 1) Tepaga chiqish (zoom-out)
    map.flyTo(map.getCenter(), midZoom, {
      duration: 0.6,
      easeLinearity: 0.15,
      animate: true,
    });

    // 2) Keyin manzilga uchish
    const t = setTimeout(() => {
      map.flyTo([lat, lng], zoom, {
        duration: 1.2,
        easeLinearity: 0.25,
        animate: true,
      });
    }, 650);

    return () => clearTimeout(t);
  }, [target?.ts]); // ts -> bir xil joyni qayta tanlashda ham qayta ishga tushadi

  return null;
}

export default function MapDraw({
  center = [41.3111, 69.2797],
  zoom = 12,
  height = "calc(100vh - 100px)",
  dark = false,
  orgTree = [], // [{ key, title, pos:[lat,lng], zoom?, children:[] }]
  hideTree = false, // drawer ochiq bo‘lsa true berib, tree ni yashirasiz
}) {
  const featureGroupRef = useRef(null);

  const [geojson, setGeojson] = useState(null);
  const [checkedKeys, setCheckedKeys] = useState([]); // checkbox holati
  const [selectedKeys, setSelectedKeys] = useState([]); // tanlangan node
  const [navTarget, setNavTarget] = useState(null); // {lat,lng,zoom,ts}

  // 🔎 Qidiruv holati: input + debounce qilingan query
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setQuery(searchInput.trim()), 300); // debounce 300ms
    return () => clearTimeout(id);
  }, [searchInput]);

  const onClearSearch = () => setSearchInput("");

  // Draw → GeoJSON panel
  const updateGeoJSON = useCallback(() => {
    const fg = featureGroupRef.current;
    if (!fg) return;
    setGeojson(fg.toGeoJSON());
  }, []);
  const onCreated = useCallback(updateGeoJSON, [updateGeoJSON]);
  const onEdited = useCallback(updateGeoJSON, [updateGeoJSON]);
  const onDeleted = useCallback(updateGeoJSON, [updateGeoJSON]);

  // Org daraxtini tekislash (key → node)
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

  // Matnni highlight qilish (title ichida mos bo‘lagini <mark> bilan)
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

  // REAL FILTER: faqat mos tugunlar va ularning ajdodlari qoladi
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

  // Qidiruv paytida auto-expand: ko‘rinadigan barcha tugunlar ochiladi
  useEffect(() => {
    if (visibleKeySet) setExpandedKeys(Array.from(visibleKeySet));
    else setExpandedKeys(undefined);
  }, [visibleKeySet]);

  // rc-tree uchun data (REAL FILTER + highlight)
  const rcData = useMemo(() => {
    const q = query;
    const mapNode = (n) => ({
      key: String(n.key),
      title: typeof n.title === "string" ? highlight(n.title, q) : n.title,
      children: n.children ? n.children.map(mapNode) : undefined,
    });
    return (filteredTree || []).map(mapNode);
  }, [filteredTree, query]);

  // Checkbox’larga mos markerlar
  const visibleMarkers = useMemo(
    () => flatNodes.filter((n) => n.pos && checkedKeys.includes(String(n.key))),
    [flatNodes, checkedKeys]
  );

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

  // GeoJSON import
  const geojsonPretty = geojson ? JSON.stringify(geojson, null, 2) : "";
  const importFromTextarea = () => {
    const text = document.getElementById("gj-input")?.value;
    try {
      const parsed = JSON.parse(text);
      const fg = featureGroupRef.current;
      if (!fg) return;
      fg.clearLayers();
      const layer = L.geoJSON(parsed);
      layer.eachLayer((lyr) => fg.addLayer(lyr));
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

        {/* Nav target bo‘lsa animatsiya */}
        <MapFlyer target={navTarget} />

        {/* Checkbox markerlar */}
        {visibleMarkers.map((n) => (
          <Marker key={n.key} position={n.pos}>
            <Popup>{n.title}</Popup>
          </Marker>
        ))}

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

      {/* Org tree — REAL FILTER overlay */}
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
                if (e.key === "Enter") setQuery(searchInput.trim()); // Enter bosilsa darhol qidir
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
          ✔ marker ko‘rsatadi · 1× click → joyga uchish · Qidiruv: faqat mos
          tugunlar va ajdodlari ko‘rinadi
        </div>
      </div>

      {/* Pastki panel: GeoJSON import/export */}
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
          </div>
        </div>
      </div>
    </div>
  );
}
