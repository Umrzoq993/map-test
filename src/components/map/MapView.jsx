// src/components/map/MapView.jsx
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  MapContainer,
  Marker,
  Popup,
  FeatureGroup,
  Pane,
  useMap,
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";

import MapTiles from "./MapTiles";
import "../../styles/leaflet-theme.css";

import { locateOrg } from "../../api/org";
import { getLatestDrawing, saveDrawing } from "../../api/drawings";
import { listFacilities, patchFacility } from "../../api/facilities";
import { centroidOfGeometry } from "../../utils/geo";

import MapFlyer from "./MapFlyer";
import ViewportWatcher from "./ViewportWatcher";
import FacilityGeoLayer from "./FacilityGeoLayer";
import FacilityMarkers from "./FacilityMarkers";
import CreateFacilityDrawer from "./CreateFacilityDrawer";
import OrgTreePanel from "./OrgTreePanel";
import FacilityEditModal from "./FacilityEditModal";
import CodeJumpBox from "./CodeJumpBox";
import ZoomIndicator from "./ZoomIndicator";

/* 🔧 DARK MODE PATCH — drawer/slide-over’lar portaldan render bo‘lsa ham ishlaydi */
const darkDrawerCss = `
html.dark :where([class*="drawer"], [class*="Drawer"], .drawer, .drawer-card, .sheet, .slide-over) {
  color: #e6eef9 !important;
  background: transparent;
}
html.dark :where([class*="drawer"], [class*="Drawer"], .drawer, .drawer-card, .sheet, .slide-over)
  :where(h1,h2,h3,h4,h5,h6,p,span,div,li,label,strong,em,small) {
  color: #e6eef9 !important;
}
html.dark :where([class*="drawer"], [class*="Drawer"], .drawer, .drawer-card, .sheet, .slide-over)
  :where(.muted,.help,.description,.subtle) {
  color: #94a3b8 !important;
}
html.dark :where([class*="drawer"], [class*="Drawer"], .drawer, .drawer-card, .sheet, .slide-over)
  :where(input,select,textarea) {
  background: #0b1220 !important;
  color: #e6eef9 !important;
  border: 1px solid #223046 !important;
}
html.dark :where([class*="drawer"], [class*="Drawer"], .drawer, .drawer-card, .sheet, .slide-over)
  :where(input::placeholder, textarea::placeholder) {
  color: #94a3b8 !important;
}
html.dark :where([class*="drawer"], [class*="Drawer"], .drawer, .drawer-card, .sheet, .slide-over)
  :where(button,.btn) {
  background: #111827 !important;
  color: #e6eef9 !important;
  border-color: #374151 !important;
}
html.dark :where([class*="drawer"], [class*="Drawer"], .drawer, .drawer-card, .sheet, .slide-over) a {
  color: #93c5fd !important;
}
html.dark :where([class*="drawer"], [class*="Drawer"], .drawer, .drawer-card, .sheet, .slide-over)
  :where(.card,.panel,.modal-card,.drawer-card,.sheet) {
  background: #0f172a !important;
  border-color: #223046 !important;
}
`;

/** Leaflet control: faqat Tashkilot panelini ko‘rsatish/yashirish (T) */
function MapControls({ panelHidden, onTogglePanel }) {
  const map = useMap();

  useEffect(() => {
    const PanelCtrl = L.Control.extend({
      options: { position: "topright" },
      onAdd() {
        const container = L.DomUtil.create(
          "div",
          "leaflet-bar leaflet-control"
        );
        const a = L.DomUtil.create("a", "", container);
        a.href = "#";
        a.title = "Tashkilot panelini ko‘rsatish/yashirish (T)";
        a.setAttribute("aria-label", a.title);
        a.innerHTML = panelHidden ? "▤" : "×";
        Object.assign(a.style, {
          width: "34px",
          height: "34px",
          lineHeight: "34px",
          textAlign: "center",
          fontWeight: "700",
          userSelect: "none",
        });
        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.on(a, "click", (e) => {
          L.DomEvent.preventDefault(e);
          onTogglePanel?.();
        });
        return container;
      },
    });
    const panelCtrl = new PanelCtrl();
    map.addControl(panelCtrl);
    return () => map.removeControl(panelCtrl);
  }, [map, panelHidden, onTogglePanel]);

  return null;
}

export default function MapView({
  center = [41.3111, 69.2797],
  zoom = 12,
  minZoom = 1,
  maxZoom = 20,
  height = "calc(100vh - 100px)",
  dark = false,
  orgTree = [],
  hideTree = false,
}) {
  const featureGroupRef = useRef(null);

  // ---- Draw state
  const [geojson, setGeojson] = useState(null);
  const updateGeoJSON = useCallback(() => {
    const fg = featureGroupRef.current;
    if (!fg) return;
    setGeojson(fg.toGeoJSON());
  }, []);
  const onEdited = useCallback(updateGeoJSON, [updateGeoJSON]);
  const onDeleted = useCallback(updateGeoJSON, [updateGeoJSON]);

  // ---- Geometry edit session (facility uchun)
  const [geomEdit, setGeomEdit] = useState(null); // { facilityId, geometry }
  // Window event orqali modal’dan keladi
  useEffect(() => {
    const handler = (e) => {
      const { facilityId, geometry } = e.detail || {};
      setGeomEdit({ facilityId, geometry: geometry || null });
      // FG ni poligon uchun tayyorlaymiz
      const fg = featureGroupRef.current;
      if (!fg) return;
      fg.clearLayers();
      if (geometry) {
        try {
          L.geoJSON({ type: "Feature", geometry }).eachLayer((lyr) =>
            fg.addLayer(lyr)
          );
        } catch (err) {
          console.error("Geometry load failed:", err);
        }
      }
    };
    window.addEventListener("facility:edit-geometry", handler);
    return () => window.removeEventListener("facility:edit-geometry", handler);
  }, []);

  const exitGeomEdit = useCallback(() => {
    const fg = featureGroupRef.current;
    if (fg) fg.clearLayers();
    setGeomEdit(null);
  }, []);

  const saveGeomEdit = useCallback(async () => {
    const fg = featureGroupRef.current;
    const gj = fg?.toGeoJSON();
    const feats = Array.isArray(gj?.features) ? gj.features : [];
    const geoms = feats
      .map((f) => f?.geometry)
      .filter(Boolean)
      .filter((g) => g.type !== "Point");

    if (geoms.length === 0) {
      alert(
        "Poligon chizmadingiz. Iltimos, polygon/rectangle chizing yoki mavjudini tahrirlang."
      );
      return;
    }

    // Bir nechta bo‘lsa — MultiPolygon’ga birlashtiramiz
    let geometry = null;
    if (geoms.length === 1) {
      geometry = geoms[0];
    } else {
      const polys = [];
      for (const g of geoms) {
        if (g.type === "Polygon") polys.push(g.coordinates);
        else if (g.type === "MultiPolygon") polys.push(...g.coordinates);
      }
      geometry = { type: "MultiPolygon", coordinates: polys };
    }

    const c = centroidOfGeometry(geometry);
    try {
      await patchFacility(geomEdit.facilityId, {
        geometry,
        lat: Number.isFinite(c?.lat) ? c.lat : null,
        lng: Number.isFinite(c?.lng) ? c.lng : null,
      });
      alert("Geometriya saqlandi!");
      exitGeomEdit();
      setReloadKey((k) => k + 1); // obyektlar ro‘yxatini qayta yuklaymiz
    } catch (e) {
      console.error(e);
      alert("Geometriyani saqlashda xatolik yuz berdi.");
    }
  }, [geomEdit?.facilityId, exitGeomEdit]);

  // ---- Tree & nav
  const [checkedKeys, setCheckedKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [navTarget, setNavTarget] = useState(null);

  // ✅ FacilityGeoLayer -> setNavTarget formatini moslashtirish
  const flyTo = useCallback((latLng, z = 17) => {
    if (!Array.isArray(latLng) || latLng.length < 2) return;
    const [lat, lng] = latLng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setNavTarget({ lat, lng, zoom: z, ts: Date.now() });
  }, []);

  // Panel ko‘rsatish/yashirish
  const [panelHidden, setPanelHidden] = useState(!!hideTree);
  const togglePanel = () => setPanelHidden((v) => !v);

  // ---- Qidiruv
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);
  const onEnterSearch = () => setQuery(searchInput.trim());
  const onClearSearch = () => setSearchInput("");

  // ---- Viewport (BBOX)
  const [bbox, setBbox] = useState(null);

  // ---- Facilities
  const [facilities, setFacilities] = useState([]);
  const [typeFilter, setTypeFilter] = useState({
    GREENHOUSE: true,
    POULTRY_MEAT: true,
    POULTRY_EGG: true,
    TURKEY: true,
    COWSHED: true,
    SHEEPFOLD: true,
    WORKSHOP_SAUSAGE: true,
    WORKSHOP_COOKIE: true,
    FISHPOND: true,
    AUX_LAND: false,
    BORDER_LAND: false,
  });
  const enabledTypes = useMemo(
    () =>
      Object.entries(typeFilter)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [typeFilter]
  );

  const checkedOrgIds = useMemo(
    () => checkedKeys.map((k) => Number(k)).filter((n) => Number.isFinite(n)),
    [checkedKeys]
  );

  const visibleFacilities = useMemo(
    () => facilities.filter((f) => enabledTypes.includes(f.type)),
    [facilities, enabledTypes]
  );

  const [reloadKey, setReloadKey] = useState(0);
  const [showPolys, setShowPolys] = useState(true);

  // Oxirgi chizmani yuklash (ixtiyoriy)
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

  // Org-tree flatten
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

  // Org-tree qidiruv bo‘yicha filtrlash
  const [expandedKeys, setExpandedKeys] = useState(undefined);
  const { rcData, visibleKeySet } = useMemo(() => {
    const q = query.toLowerCase();
    const visible = new Set();
    const prune = (nodes) => {
      if (!q) return nodes;
      const res = [];
      for (const n of nodes) {
        const titleStr = typeof n.title === "string" ? n.title : "";
        const selfMatch = titleStr.toLowerCase().includes(q);
        const childPruned = n.children ? prune(n.children) : null;
        if (selfMatch || (childPruned && childPruned.length)) {
          visible.add(String(n.key));
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
    const mapNode = (n) => ({
      key: String(n.key),
      title: n.title,
      children: n.children ? n.children.map(mapNode) : undefined,
    });
    return {
      rcData: (filtered || []).map(mapNode),
      visibleKeySet: q ? visible : null,
    };
  }, [orgTree, query]);

  useEffect(() => {
    if (visibleKeySet) setExpandedKeys(Array.from(visibleKeySet));
    else setExpandedKeys(undefined);
  }, [visibleKeySet]);

  const visibleMarkers = useMemo(
    () => flatNodes.filter((n) => n.pos && checkedKeys.includes(String(n.key))),
    [flatNodes, checkedKeys]
  );

  // SELECT (flyTo)
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
  const onTreeCheck = (keys) => setCheckedKeys(keys.map(String));

  // FETCH facilities
  useEffect(() => {
    let cancelled = false;
    if (!bbox || checkedOrgIds.length === 0 || enabledTypes.length === 0) {
      setFacilities([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const reqs = checkedOrgIds.map((orgId) =>
          listFacilities({ orgId, types: enabledTypes, bbox })
        );
        const all = (await Promise.all(reqs)).flat();
        const seen = new Set();
        const uniq = [];
        for (const f of all) {
          if (!seen.has(f.id)) {
            seen.add(f.id);
            uniq.push(f);
          }
        }
        if (!cancelled) setFacilities(uniq);
      } catch (e) {
        if (!cancelled) console.error("listFacilities failed:", e);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [bbox, JSON.stringify(checkedOrgIds), enabledTypes.join(","), reloadKey]);

  // CREATE drawer
  const [createOpen, setCreateOpen] = useState(false);
  const [draftGeom, setDraftGeom] = useState(null);
  const [draftCenter, setDraftCenter] = useState(null);

  const onCreated = useCallback(
    (e) => {
      updateGeoJSON();
      // ✋ Edit-rejimda Create drawer ochilmasin
      if (geomEdit) return;

      const layer = e.layer;
      const type = e.layerType;
      if (!["marker", "polygon", "rectangle"].includes(type)) return;
      const gj = layer.toGeoJSON();
      const geometry = gj.geometry;
      const c =
        type === "marker" ? layer.getLatLng() : layer.getBounds().getCenter();
      setDraftGeom(geometry);
      setDraftCenter({ lat: c.lat, lng: c.lng });
      setCreateOpen(true);
    },
    [updateGeoJSON, geomEdit]
  );

  // EDIT modal
  const [editOpen, setEditOpen] = useState(false);
  const [editFacility, setEditFacility] = useState(null);
  const handleOpenEdit = (f) => {
    setEditFacility(f);
    setEditOpen(true);
  };

  const geojsonPretty = geojson ? JSON.stringify(geojson, null, 2) : "";
  const importFromTextarea = () => {
    const el = document.getElementById("gj-input");
    const text = el ? el.value : "";
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

  // Klaviatura: faqat T (panel)
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key.toLowerCase() === "t") togglePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** 👇 Helper: orgTree dan targetKey’ning barcha ota-onalari (ancestor) key’larini topish */
  const collectAncestorsKeys = useCallback(
    (nodes, targetKey, trail = []) => {
      for (const n of nodes || []) {
        const key = String(n.key);
        const nextTrail = [...trail, key];
        if (key === String(targetKey)) {
          return trail.map(String);
        }
        if (n.children && n.children.length) {
          const res = collectAncestorsKeys(n.children, targetKey, nextTrail);
          if (res) return res;
        }
      }
      return null;
    },
    [orgTree]
  );

  /**
   * ✅ KOD BO‘YICHA SAKRASH:
   * - Faqat `locateOrg(code)` muvaffaqiyatli bo‘lsa `flyTo` qilinadi.
   */
  const handleCodeJump = useCallback(
    async (...args) => {
      let code = "";
      if (args.length === 1) {
        const raw = args[0];
        code =
          typeof raw === "string" ? raw.trim() : String(raw?.code || "").trim();
      } else if (args.length >= 1) {
        const org = args[0];
        code = String(org?.code || "").trim();
      }
      if (!code) return;

      try {
        const resp = await locateOrg(code); // { org, facilities }
        const org = resp?.org || resp;
        if (!org) throw new Error("Javobda org topilmadi");

        const idStr = String(org.id);

        // Tree: check + select
        setCheckedKeys((prev) =>
          prev.includes(idStr) ? prev : [...prev, idStr]
        );
        setSelectedKeys([idStr]);

        // Tree: ancestors’ni expand qilish
        const ancestors = collectAncestorsKeys(orgTree, idStr) || [];
        setExpandedKeys((prev) => {
          const prevArr = prev ? prev.map(String) : [];
          return Array.from(new Set([...prevArr, ...ancestors, idStr]));
        });

        // Xarita flyTo — faqat muvaffaqiyatdan keyin
        const lat =
          typeof org.lat === "number"
            ? org.lat
            : Array.isArray(org.pos)
            ? org.pos[0]
            : undefined;
        const lng =
          typeof org.lng === "number"
            ? org.lng
            : Array.isArray(org.pos)
            ? org.pos[1]
            : undefined;

        const z =
          typeof org.zoom === "number"
            ? org.zoom
            : org.level === 0
            ? 6
            : org.level === 1
            ? 12
            : 15;

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setNavTarget({ lat, lng, zoom: z, ts: Date.now() });
        }
      } catch (e) {
        console.error(e);
        const msg =
          e?.response?.status === 403 ? "Sizga ruxsat yo‘q." : "Kod topilmadi.";
        alert(msg);
      }
    },
    [orgTree, collectAncestorsKeys]
  );

  return (
    <div className="map-wrapper" style={{ position: "relative" }}>
      {/* 🔧 Dark-mode drawer patch CSS */}
      <style>{darkDrawerCss}</style>

      <CodeJumpBox orgTree={orgTree} onJump={handleCodeJump} />
      <MapContainer
        center={center}
        zoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        style={{ height, width: "100%" }}
      >
        <MapTiles dark={dark} minZoom={minZoom} maxZoom={maxZoom} />

        {/* Leaflet controls */}
        <MapControls
          panelHidden={panelHidden}
          onTogglePanel={() => setPanelHidden((v) => !v)}
        />
        <ZoomIndicator position="bottomright" />

        {/* Panes */}
        <Pane name="facilities-polys" style={{ zIndex: 410 }} />
        <Pane name="facilities-centroids" style={{ zIndex: 420 }} />
        <Pane name="facilities-markers" style={{ zIndex: 430 }} />

        <ViewportWatcher onBboxChange={setBbox} />
        <MapFlyer target={navTarget} />

        {/* Org markerlar */}
        {visibleMarkers.map((n) => (
          <Marker key={n.key} position={n.pos}>
            <Popup>{n.title}</Popup>
          </Marker>
        ))}

        {/* Poligonlar + centroids */}
        <FacilityGeoLayer
          facilities={visibleFacilities}
          showPolys={showPolys}
          onFlyTo={flyTo}
          onOpenEdit={handleOpenEdit}
        />

        {/* Geometry yo‘q obyektlar */}
        <FacilityMarkers
          facilities={visibleFacilities}
          onOpenEdit={handleOpenEdit}
        />

        {/* Draw controls (topright) */}
        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topright"
            onCreated={onCreated}
            onEdited={onEdited}
            onDeleted={onDeleted}
            draw={{
              polyline: false,
              polygon: true,
              rectangle: true,
              circle: false,
              circlemarker: false,
              marker: !geomEdit, // ✨ edit-rejimda marker o‘chiriladi
            }}
          />
        </FeatureGroup>
      </MapContainer>

      {/* Org tree panel (T bilan yashirish/ko‘rsatish) */}
      <OrgTreePanel
        rcData={rcData}
        checkedKeys={checkedKeys}
        selectedKeys={selectedKeys}
        expandedKeys={expandedKeys}
        onTreeExpand={setExpandedKeys}
        onTreeCheck={(keys) => setCheckedKeys(keys.map(String))}
        onTreeSelect={onTreeSelect}
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        onEnterSearch={onEnterSearch}
        onClearSearch={onClearSearch}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        showPolys={showPolys}
        setShowPolys={setShowPolys}
        bbox={bbox}
        facilitiesCount={visibleFacilities.length}
        selectedOrgId={null}
        hide={panelHidden}
        onRequestHide={() => setPanelHidden(true)}
      />

      {/* Create Drawer */}
      <CreateFacilityDrawer
        open={createOpen}
        geometry={draftGeom}
        center={draftCenter}
        selectedOrgId={checkedOrgIds[0] || null}
        onClose={() => setCreateOpen(false)}
        onSaved={() => {
          const fg = featureGroupRef.current;
          if (fg) fg.clearLayers();
          setReloadKey((k) => k + 1);
        }}
      />

      {/* Edit Modal */}
      <FacilityEditModal
        open={editOpen}
        facility={editFacility}
        onClose={() => setEditOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
        dark={dark}
      />

      {/* Pastki panel: GeoJSON import/export (dev) */}
      <div className="panel">
        <div className="panel-col">
          <h4>GeoJSON (faqat o‘qish)</h4>
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
              <button disabled={!geojsonPretty}>.geojson yuklab olish</button>
            </a>
            <button
              onClick={async () => {
                try {
                  if (!saveDrawing) {
                    alert("API topilmadi.");
                    return;
                  }
                  await saveDrawing(geojson || {}, "map-drawings");
                  alert("Saqlash muvaffaqiyatli!");
                } catch (e) {
                  console.error(e);
                  alert("Saqlashda xatolik");
                }
              }}
              disabled={!geojson}
            >
              Backend’ga saqlash
            </button>
          </div>
        </div>
      </div>

      {/* ✨ Geometriya tahrirlash bannerri — z-index endi 550 (modal(6000) dan past) */}
      {geomEdit && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 550,
            background: "#fff",
            border: "1px solid #e5e7eb",
            padding: "10px 12px",
            borderRadius: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,.12)",
            maxWidth: 360,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Geometriya tahrirlash rejimi
          </div>
          <div style={{ fontSize: 13, color: "#475569", marginBottom: 8 }}>
            Mavjud poligonni <b>Edit</b> bilan o‘zgartiring yoki yangi{" "}
            <b>Polygon/Rectangle</b> chizing. Keyin “Geometriyani saqlash”
            tugmasini bosing.
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn" onClick={exitGeomEdit}>
              Bekor qilish
            </button>
            <button className="btn primary" onClick={saveGeomEdit}>
              Geometriyani saqlash
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
