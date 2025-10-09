// src/components/map/MapView.jsx
import L from "leaflet";
import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FeatureGroup,
  GeoJSON,
  LayerGroup,
  LayersControl,
  MapContainer,
  Pane,
  useMap,
} from "react-leaflet";
import { toast } from "react-toastify";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import { debugError } from "../../utils/debug";
const EditControlLazy = lazy(() =>
  import("react-leaflet-draw").then((m) => ({ default: m.EditControl }))
);

import "../../styles/leaflet-theme.css";
import MapTiles from "./MapTiles";

import * as drawingsApi from "../../api/drawings";
import { listFacilities, patchFacility } from "../../api/facilities";
import { locateOrg } from "../../api/org";
import { centroidOfGeometry } from "../../utils/geo";
import OrgMarker from "./OrgMarker";

import CodeJumpBox from "./CodeJumpBox";
import CreateFacilityDrawer from "./CreateFacilityDrawer";
import FacilityEditModal from "./FacilityEditModal";
import FacilityGalleryPanel from "./FacilityGalleryPanel";
import FacilityGeoLayer from "./FacilityGeoLayer";
import FacilityMarkers from "./FacilityMarkers";
import MapFlyer from "./MapFlyer";
import OrgTreePanel from "./OrgTreePanel";
import ViewportWatcher from "./ViewportWatcher";
import ZoomIndicator from "./ZoomIndicator";
import { useFacilityTypes } from "../../hooks/useFacilityTypes";

// ✅ GeoJSON’ni bundlega qo‘shamiz (fetch O‘RNIGA import)
import uzBorders from "../../assets/uz_lines.json";

/* 🔧 DARK MODE PATCH */
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

/** Leaflet control: T panel toggle */
function MapControls({ panelHidden, onTogglePanel }) {
  const map = useMap();
  useEffect(() => {
    const PanelCtrl = L.Control.extend({
      options: { position: "topright" },
      onAdd() {
        const container = L.DomUtil.create(
          "div",
          "leaflet-bar leaflet-control org-toggle-control"
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

function StripLeafletAttribution() {
  const map = useMap();
  useEffect(() => {
    if (map?.attributionControl?.setPrefix) {
      map.attributionControl.setPrefix("");
    }
  }, [map]);
  return null;
}

/* -------- util -------- */
function parseBBox(bboxStr) {
  const [w, s, e, n] = String(bboxStr || "")
    .split(",")
    .map((x) => Number(x));
  return { w, s, e, n };
}
function bufferBBoxStr(bboxStr, ratio = 0.2) {
  const { w, s, e, n } = parseBBox(bboxStr);
  if (![w, s, e, n].every(Number.isFinite)) return bboxStr;
  const dw = (e - w) * ratio,
    dh = (n - s) * ratio;
  return [w - dw, s - dh, e + dw, n + dh].join(",");
}
function envBool(v, def = false) {
  if (v === undefined || v === null) return def;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

/** Overlay yoqish/o‘chirish hodisasi */
function LayersToggle({ onEnable, onDisable }) {
  const ref = useRef(null);
  useEffect(() => {
    const layer = ref.current;
    if (!layer) return;
    const handleAdd = () => onEnable?.();
    const handleRemove = () => onDisable?.();
    layer.on("add", handleAdd);
    layer.on("remove", handleRemove);
    return () => {
      layer.off("add", handleAdd);
      layer.off("remove", handleRemove);
    };
  }, [onEnable, onDisable]);
  return <LayerGroup ref={ref} />;
}

/** Intro flight */
function IntroFlight({ enabled, delayMs, target }) {
  const map = useMap();
  const didRunRef = useRef(false);
  const isValid = (t) =>
    t &&
    Number.isFinite(t.lat) &&
    Number.isFinite(t.lng) &&
    Number.isFinite(t.zoom);
  useEffect(() => {
    if (!enabled || didRunRef.current) return;
    if (!isValid(target)) return;
    const tid = setTimeout(() => {
      map.whenReady(() => {
        try {
          map.flyTo([target.lat, target.lng], target.zoom, {
            animate: true,
            duration: 2.2,
            easeLinearity: 0.2,
            noMoveStart: false,
          });
        } catch {
          map.setView([target.lat, target.lng], target.zoom);
        } finally {
          didRunRef.current = true;
        }
      });
    }, Math.max(0, Number(delayMs) || 0));
    return () => clearTimeout(tid);
  }, [enabled, delayMs, target, map]);
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
  introEnabled = true,
  introDelayMs = 700,
  userRole = "user",
  homeTarget = null,
}) {
  const { types: typeDefs } = useFacilityTypes();
  const typeLabels = useMemo(() => {
    const m = {};
    if (Array.isArray(typeDefs)) {
      for (const t of typeDefs)
        if (t?.code) m[t.code] = t.nameUz || t.nameRu || t.code;
    }
    return m;
  }, [typeDefs]);
  const typeOrder = useMemo(() => {
    if (Array.isArray(typeDefs) && typeDefs.length) {
      return typeDefs
        .slice()
        .sort(
          (a, b) => (a.sort ?? a.sortOrder ?? 0) - (b.sort ?? b.sortOrder ?? 0)
        )
        .map((t) => t.code);
    }
    return [
      "GREENHOUSE",
      "POULTRY_MEAT",
      "POULTRY_EGG",
      "TURKEY",
      "COWSHED",
      "SHEEPFOLD",
      "WORKSHOP_SAUSAGE",
      "WORKSHOP_COOKIE",
      "AUX_LAND",
      "BORDER_LAND",
      "FISHPOND",
    ];
  }, [typeDefs]);
  const featureGroupRef = useRef(null);
  const lastDrawnLayerRef = useRef(null);

  // Draw state
  const [geojson, setGeojson] = useState(null);
  const updateGeoJSON = useCallback(() => {
    const fg = featureGroupRef.current;
    if (!fg) return;
    setGeojson(fg.toGeoJSON());
  }, []);
  const onEdited = useCallback(updateGeoJSON, [updateGeoJSON]);
  const onDeleted = useCallback(updateGeoJSON, [updateGeoJSON]);
  const [drawEnabled, setDrawEnabled] = useState(false);

  // Geometry edit (facility)
  const [geomEdit, setGeomEdit] = useState(null);
  useEffect(() => {
    const handler = (e) => {
      const { facilityId, geometry } = e.detail || {};
      setGeomEdit({ facilityId, geometry: geometry || null });
      const fg = featureGroupRef.current;
      if (!fg) return;
      fg.clearLayers();
      if (geometry) {
        try {
          L.geoJSON({ type: "Feature", geometry }).eachLayer((lyr) =>
            fg.addLayer(lyr)
          );
        } catch (err) {
          debugError("Geometry load failed", err);
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
      toast.warn(
        "Poligon chizmadingiz. Iltimos, polygon/rectangle chizing yoki mavjudini tahrirlang."
      );
      return;
    }
    let geometry = null;
    if (geoms.length === 1) geometry = geoms[0];
    else {
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
      toast.success("Geometriya saqlandi!");
      exitGeomEdit();
      setReloadKey((k) => k + 1);
    } catch (e) {
      debugError("Facility geometry patch failed", e);
      toast.error("Geometriyani saqlashda xatolik yuz berdi.");
    }
  }, [geomEdit?.facilityId, exitGeomEdit]);

  // Tree & nav
  const [checkedKeys, setCheckedKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [navTarget, setNavTarget] = useState(null);
  const [orgForPopup, setOrgForPopup] = useState(null);

  const flyTo = useCallback((latLng, z = 17) => {
    if (!Array.isArray(latLng) || latLng.length < 2) return;
    const [lat, lng] = latLng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setNavTarget({ lat, lng, zoom: z, ts: Date.now() });
  }, []);

  const [panelHidden, setPanelHidden] = useState(!hideTree);
  const togglePanel = useCallback(() => {
    setPanelHidden((v) => !v);
  }, []);

  // Search (debounced)
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 350);
  const query = useMemo(() => debouncedSearch.trim(), [debouncedSearch]);
  const onEnterSearch = () => setSearchInput((s) => s.trim());
  const onClearSearch = () => setSearchInput("");

  // Viewport
  const [bbox, setBbox] = useState(null);

  // Facilities
  const [facilities, setFacilities] = useState([]);
  const [typeFilter, setTypeFilter] = useState(() => {
    // Initialize from dynamic types; default true for first 8, then false
    const init = {};
    const order = typeOrder;
    order.forEach((code, idx) => {
      init[code] = idx < 8; // heuristic: show first N by default
    });
    return init;
  });
  // When typeOrder changes (e.g., after loading), merge to preserve toggles and add missing keys
  useEffect(() => {
    setTypeFilter((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const code of typeOrder) {
        if (!(code in next)) {
          next[code] = Object.keys(next).length < 8; // default on for first few
          changed = true;
        }
      }
      // Optionally remove keys no longer present
      Object.keys(next).forEach((k) => {
        if (!typeOrder.includes(k)) {
          delete next[k];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [typeOrder]);
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

  // Draft overlay
  const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
  const [draftVisible, setDraftVisible] = useState(false);
  const [draftGeoJSON, setDraftGeoJSON] = useState(null);
  const draftLayerRef = useRef(null);
  const loadDraftIfFresh = useCallback(async () => {
    try {
      if (!drawingsApi.getLatestDrawing) return;
      const latest = await drawingsApi.getLatestDrawing();
      const src = latest?.geojson || latest;
      if (!src) {
        setDraftGeoJSON(null);
        return;
      }
      const ts =
        Number(src?.properties?.__ts) ||
        (latest?.createdAt ? Date.parse(latest.createdAt) : 0);
      if (!ts || Date.now() - ts > DRAFT_TTL_MS) {
        setDraftGeoJSON(null);
        return;
      }
      const features = Array.isArray(src.features)
        ? src.features.filter(
            (fe) => fe?.geometry && fe.geometry.type !== "Point"
          )
        : [];
      if (!features.length) {
        setDraftGeoJSON(null);
        return;
      }
      setDraftGeoJSON({ ...src, features });
    } catch (e) {
      debugError("Draftni yuklashda xatolik", e);
    }
  }, [DRAFT_TTL_MS]);
  const maybeSaveDraft = useCallback(async (geometry) => {
    const consent = window.confirm("Qoralama sifatida 24 soatga saqlaymizmi?");
    if (!consent) return;
    const fc = {
      type: "FeatureCollection",
      properties: { __kind: "latest-draft", __ts: Date.now() },
      features: [{ type: "Feature", geometry, properties: {} }],
    };
    try {
      await drawingsApi.saveDrawing(fc, "latest-draft");
      setDraftGeoJSON(fc);
    } catch (e) {
      debugError("Draftni saqlashda xatolik", e);
    }
  }, []);
  const clearDraft = useCallback(async () => {
    try {
      if (typeof drawingsApi.deleteDrawing === "function")
        await drawingsApi.deleteDrawing("latest-draft");
      else if (typeof drawingsApi.saveDrawing === "function")
        await drawingsApi.saveDrawing(
          {
            type: "FeatureCollection",
            properties: { __kind: "latest-draft", __ts: Date.now() },
            features: [],
          },
          "latest-draft:clear"
        );
    } catch (e) {
      debugError("Draftni o‘chirib bo‘lmadi", e);
    } finally {
      try {
        draftLayerRef.current?.remove();
      } catch {}
      setDraftGeoJSON(null);
    }
  }, []);

  // Facilities fetch (bbox+cache)
  const facCacheRef = useRef(new Map());
  const FAC_TTL = 15_000;
  const checkedOrgIdsKey = useMemo(
    () =>
      checkedOrgIds
        .slice()
        .sort((a, b) => a - b)
        .join(","),
    [checkedOrgIds]
  );
  const enabledTypesKey = useMemo(
    () => enabledTypes.slice().sort().join(","),
    [enabledTypes]
  );
  useEffect(() => {
    let cancelled = false;
    if (!bbox || !checkedOrgIdsKey || !enabledTypesKey) {
      setFacilities([]);
      return;
    }
    const ids = checkedOrgIdsKey
      .split(",")
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n));
    if (ids.length === 0 || enabledTypes.length === 0) {
      setFacilities([]);
      return;
    }
    const buffered = bufferBBoxStr(bbox, 0.2);
    const cacheKey = [buffered, checkedOrgIdsKey, enabledTypesKey].join("|");
    const hit = facCacheRef.current.get(cacheKey);
    if (hit && Date.now() - hit.ts < FAC_TTL) {
      setFacilities(hit.data);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const reqs = ids.map((orgId) =>
          listFacilities({ orgId, types: enabledTypes, bbox: buffered })
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
        if (!cancelled) {
          setFacilities(uniq);
          facCacheRef.current.set(cacheKey, { ts: Date.now(), data: uniq });
        }
      } catch (e) {
        if (!cancelled) debugError("listFacilities failed", e);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [bbox, checkedOrgIdsKey, enabledTypesKey, enabledTypes, reloadKey]);

  // Create drawer
  const [createOpen, setCreateOpen] = useState(false);
  const [draftGeom, setDraftGeom] = useState(null);
  const [draftCenter, setDraftCenter] = useState(null);
  const onCreated = useCallback(
    (e) => {
      updateGeoJSON();
      const layer = e.layer,
        type = e.layerType;
      if (geomEdit && ["polygon", "rectangle"].includes(type)) {
        const fg = featureGroupRef.current;
        if (fg) {
          try {
            fg.clearLayers();
            fg.addLayer(layer);
            updateGeoJSON();
            toast.info("Eski geometriya yangisi bilan almashtirildi");
          } catch (err) {
            debugError("Geom replace failed", err);
          }
        }
        return;
      }
      if (!["marker", "polygon", "rectangle"].includes(type)) return;
      const fg = featureGroupRef.current;
      const gj = layer.toGeoJSON();
      const geometry = gj.geometry;
      const c =
        type === "marker" ? layer.getLatLng() : layer.getBounds().getCenter();
      lastDrawnLayerRef.current = layer;
      const ok = window.confirm("Chizilgan obyektni saqlashni xohlaysizmi?");
      if (!ok) {
        if (fg && layer) fg.removeLayer(layer);
        updateGeoJSON();
        return;
      }
      setDraftGeom(geometry);
      setDraftCenter({ lat: c.lat, lng: c.lng });
      setCreateOpen(true);
      if (fg && layer) {
        fg.removeLayer(layer);
        updateGeoJSON();
      }
      void maybeSaveDraft(geometry);
    },
    [updateGeoJSON, geomEdit, maybeSaveDraft]
  );

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editFacility, setEditFacility] = useState(null);
  const [galleryFacility, setGalleryFacility] = useState(null); // gallery panel
  const handleOpenEdit = (f) => {
    setEditFacility(f);
    setEditOpen(true);
  };

  // Select (flyTo)
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
      toast.error("Noto‘g‘ri JSON!");
    }
  };

  // Keyboard T
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key.toLowerCase() === "t") togglePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePanel]);

  /** Ancestors keys */
  const collectAncestorsKeys = useCallback((nodes, targetKey, trail = []) => {
    for (const n of nodes || []) {
      const key = String(n.key);
      const nextTrail = [...trail, key];
      if (key === String(targetKey)) return trail.map(String);
      if (n.children && n.children.length) {
        const res = collectAncestorsKeys(n.children, targetKey, nextTrail);
        if (res) return res;
      }
    }
    return null;
  }, []);

  /** Code jump -> locate */
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

        setCheckedKeys((prev) =>
          prev.includes(idStr) ? prev : [...prev, idStr]
        );
        setSelectedKeys([idStr]);

        const ancestors = collectAncestorsKeys(orgTree, idStr) || [];
        setExpandedKeys((prev) => {
          const prevArr = prev ? prev.map(String) : [];
          return Array.from(new Set([...prevArr, ...ancestors, idStr]));
        });

        const z = Number.isFinite(org.zoom)
          ? org.zoom
          : org.level === 0
          ? 6
          : org.level === 1
          ? 12
          : 15;

        if (Number.isFinite(org?.lat) && Number.isFinite(org?.lng)) {
          setNavTarget({ lat: org.lat, lng: org.lng, zoom: z, ts: Date.now() });
          setOrgForPopup({
            id: org.id,
            name: org.name,
            lat: org.lat,
            lng: org.lng,
            zoom: z,
            level: org.level,
            type: org.type || org.orgType,
          });
        } else {
          setOrgForPopup(null);
        }
      } catch (e) {
        debugError("locateOrg failed", e);
        const msg =
          e?.response?.status === 403 ? "Sizga ruxsat yo‘q." : "Kod topilmadi.";
        toast.error(msg);
      }
    },
    [orgTree, collectAncestorsKeys]
  );

  // Tiles env
  const OSMUZ_URL = "https://osm.uz/tile/{z}/{x}/{y}.png";

  // ✅ Vesat (SAS Planet store) sozlamalari
  const VESAT_BASE = import.meta.env.VITE_TILE_VESAT_BASE || "https://vesat.uz";
  const VESAT_EXT = import.meta.env.VITE_TILE_VESAT_EXT || "jpg";
  const VESAT_TMS = envBool(import.meta.env.VITE_TILE_VESAT_TMS, true);

  // Org-tree flatten + depth
  const flatNodes = useMemo(() => {
    const out = [];
    const walk = (arr, depth = 0) => {
      (arr || []).forEach((n) => {
        out.push({ ...n, key: String(n.key), depth });
        if (n.children) walk(n.children, depth + 1);
      });
    };
    walk(orgTree, 0);
    return out;
  }, [orgTree]);

  // Filtered tree for panel
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

  // Intro target
  const computedHome = useMemo(() => {
    const UZ_CENTER = { lat: 41.3775, lng: 64.5853 };
    const UZ_ZOOM = 6;
    if (
      homeTarget &&
      Number.isFinite(homeTarget.lat) &&
      Number.isFinite(homeTarget.lng) &&
      Number.isFinite(homeTarget.zoom)
    )
      return homeTarget;
    if (String(userRole).toLowerCase() === "admin")
      return { ...UZ_CENTER, zoom: UZ_ZOOM };
    const firstWithPos = flatNodes.find((n) => Array.isArray(n.pos));
    if (firstWithPos) {
      const [lat, lng] = firstWithPos.pos;
      const z = Number.isFinite(firstWithPos.zoom) ? firstWithPos.zoom : 12;
      if (Number.isFinite(lat) && Number.isFinite(lng))
        return { lat, lng, zoom: z };
    }
    return { lat: center[0], lng: center[1], zoom };
  }, [homeTarget, userRole, flatNodes, center, zoom]);

  const initialZoom = introEnabled ? 3 : zoom;
  const [showGeoTools, setShowGeoTools] = useState(false);

  /* =========================
     O‘ZBEKISTON CHEGARASI LINIYALARI (faqat “satellite” turida)
     ========================= */
  const [isSatellite, setIsSatellite] = useState(false);

  return (
    <div className="map-wrapper map-ui" style={{ position: "relative" }}>
      <style>{darkDrawerCss}</style>

      <CodeJumpBox orgTree={orgTree} onJump={handleCodeJump} />

      <MapContainer
        center={center}
        zoom={initialZoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        preferCanvas={true}
        wheelDebounceTime={40}
        wheelPxPerZoomLevel={80}
        style={{ height, width: "100%" }}
      >
        <StripLeafletAttribution />
        <IntroFlight
          enabled={!!introEnabled}
          delayMs={introDelayMs}
          target={computedHome}
        />

        <LayersControl position="bottomright">
          {/* ✅ Sun'iy yo‘ldosh (Gibrid) */}
          <LayersControl.BaseLayer checked name="Sun'iy yo‘ldosh (Gibrid)">
            <MapTiles
              key="vesat-xyz"
              url={`${VESAT_BASE}/{z}/{x}/{y}.${VESAT_EXT}`}
              minZoom={0}
              maxZoom={19}
              tms={VESAT_TMS}
              noWrap={true}
              updateWhenIdle={true}
              keepBuffer={2}
              attribution="&copy; Vesat"
              eventHandlers={{
                // Vesat tanlanganda O‘zbekiston chegaralarini ko‘rsatmaymiz
                add: () => setIsSatellite(false),
              }}
            />
          </LayersControl.BaseLayer>

          {/* ✅ OSM.uz (XYZ) */}
          <LayersControl.BaseLayer name="OSM.uz (XYZ)">
            <MapTiles
              key="osm-uz-xyz"
              url={OSMUZ_URL}
              minZoom={0}
              maxZoom={19}
              maxNativeZoom={19}
              tms={false}
              noWrap={false}
              updateWhenIdle={true}
              keepBuffer={2}
              attribution="&copy; OSM.uz & OpenStreetMap contributors"
              eventHandlers={{
                add: () => setIsSatellite(false),
              }}
            />
          </LayersControl.BaseLayer>

          <LayersControl.Overlay name="Chizish rejimi (toolbar)">
            <LayersToggle
              onEnable={() => setDrawEnabled(true)}
              onDisable={() => setDrawEnabled(false)}
            />
          </LayersControl.Overlay>

          <LayersControl.Overlay name="Oxirgi chizma (draft)">
            <>
              <LayersToggle
                onEnable={() => {
                  setDraftVisible(true);
                  void loadDraftIfFresh();
                }}
                onDisable={() => {
                  setDraftVisible(false);
                }}
              />
              {draftGeoJSON && (
                <GeoJSON
                  ref={draftLayerRef}
                  data={draftGeoJSON}
                  style={() => ({
                    color: "#4F46E5",
                    weight: 2,
                    dashArray: "6 4",
                    fill: false,
                  })}
                  pane="facilities-polys"
                />
              )}
            </>
          </LayersControl.Overlay>

          <LayersControl.Overlay name="GeoJSON tools">
            <LayersToggle
              onEnable={() => setShowGeoTools(true)}
              onDisable={() => setShowGeoTools(false)}
            />
          </LayersControl.Overlay>
        </LayersControl>

        <MapControls
          panelHidden={panelHidden}
          onTogglePanel={() => setPanelHidden((v) => !v)}
        />
        <ZoomIndicator position="bottomright" />

        {/* Panes */}
        <Pane name="facilities-polys" style={{ zIndex: 410 }} />
        <Pane name="facilities-centroids" style={{ zIndex: 420 }} />
        <Pane name="facilities-markers" style={{ zIndex: 430 }} />
        <Pane name="borders-lines" style={{ zIndex: 300 }} />

        <ViewportWatcher onBboxChange={setBbox} />
        <MapFlyer target={navTarget} />

        {flatNodes
          .filter((n) => n.pos && checkedKeys.includes(String(n.key)))
          .map((n) => (
            <OrgMarker
              key={n.key}
              org={{
                id: Number(n.key),
                name: n.title,
                lat: n.pos[0],
                lng: n.pos[1],
                zoom: Number.isFinite(n.zoom) ? n.zoom : 13,
                level: Number.isFinite(n.level) ? Number(n.level) : n.depth,
                type: n.type || n.kind || n.orgType,
              }}
              open={false}
              onEdit={(id) =>
                window.dispatchEvent(
                  new CustomEvent("org:edit", { detail: { id } })
                )
              }
              onOpenTable={(id) =>
                window.dispatchEvent(
                  new CustomEvent("org:open-table", { detail: { id } })
                )
              }
            />
          ))}

        <FacilityGeoLayer
          facilities={visibleFacilities}
          showPolys={showPolys}
          onFlyTo={flyTo}
          onOpenEdit={handleOpenEdit}
        />

        <FacilityMarkers
          facilities={visibleFacilities}
          onOpenEdit={handleOpenEdit}
          onOpenGallery={(f) => setGalleryFacility(f)}
        />

        {orgForPopup && <OrgMarker org={orgForPopup} open />}

        {/* ✅ O‘zbekiston chegaralari: Satellite yoki Vesat tanlanganda ko‘rinadi */}
        {isSatellite && uzBorders && (
          <GeoJSON
            data={uzBorders}
            pane="borders-lines"
            interactive={false}
            style={() => ({
              color: "#1b2440",
              weight: 4,
              opacity: 1,
              dashArray: "6 3",
            })}
          />
        )}

        <FeatureGroup ref={featureGroupRef}>
          {(drawEnabled || geomEdit) && (
            <Suspense fallback={null}>
              <EditControlLazy
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
                  marker: !geomEdit,
                }}
              />
            </Suspense>
          )}
        </FeatureGroup>
      </MapContainer>

      {draftVisible && draftGeoJSON && (
        <div
          style={{
            position: "absolute",
            left: 12,
            bottom: 12,
            zIndex: 550,
            background: "#fff",
            border: "1px solid #e5e7eb",
            padding: "8px 10px",
            borderRadius: 10,
            boxShadow: "0 6px 20px rgba(0,0,0,.12)",
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 600 }}>Oxirgi qoralama</span>
          <button className="btn" onClick={clearDraft}>
            Tozalash
          </button>
        </div>
      )}

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
        typeOrder={typeOrder}
        typeLabels={typeLabels}
        showPolys={showPolys}
        setShowPolys={setShowPolys}
        bbox={bbox}
        facilitiesCount={visibleFacilities.length}
        selectedOrgId={null}
        hide={panelHidden}
        onRequestHide={() => setPanelHidden(true)}
      />

      <CreateFacilityDrawer
        open={createOpen}
        geometry={draftGeom}
        center={draftCenter}
        selectedOrgId={checkedOrgIds[0] || null}
        onClose={() => setCreateOpen(false)}
        onSaved={async () => {
          const fg = featureGroupRef.current;
          if (fg) fg.clearLayers();
          await clearDraft();
          setReloadKey((k) => k + 1);
        }}
      />

      <FacilityEditModal
        open={editOpen}
        facility={editFacility}
        onClose={() => setEditOpen(false)}
        onSaved={() => setReloadKey((k) => k + 1)}
        dark={dark}
      />

      <FacilityGalleryPanel
        open={!!galleryFacility}
        facility={galleryFacility}
        onClose={() => setGalleryFacility(null)}
        dark={dark}
      />

      {showGeoTools && (
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
                    if (!drawingsApi.saveDrawing) {
                      toast.error("API topilmadi.");
                      return;
                    }
                    await drawingsApi.saveDrawing(
                      geojson || {},
                      "map-drawings"
                    );
                    toast.success("Saqlash muvaffiyatli!");
                  } catch (e) {
                    debugError("saveDrawing (panel) failed", e);
                    toast.error("Saqlashda xatolik");
                  }
                }}
                disabled={!geojson}
              >
                Backend’ga saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {geomEdit && (
        <div className="geom-edit-banner">
          <div className="title">Geometriya tahrirlash rejimi</div>
          <div className="desc">
            Mavjud poligonni <b>Edit</b> bilan o‘zgartiring yoki yangi{" "}
            <b>Polygon/Rectangle</b> chizing. Keyin “Geometriyani saqlash”
            tugmasini bosing.
          </div>
          <div className="actions">
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
