// src/components/map/MapView.jsx
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  Suspense,
  lazy,
} from "react";
import {
  MapContainer,
  Marker,
  Popup,
  FeatureGroup,
  Pane,
  useMap,
  LayersControl,
  LayerGroup,
  GeoJSON,
} from "react-leaflet";
// ✨ Og‘ir paketni faqat kerak bo‘lganda yuklaymiz
const EditControlLazy = lazy(() =>
  import("react-leaflet-draw").then((m) => ({ default: m.EditControl }))
);
import L from "leaflet";

import MapTiles from "./MapTiles";
import "../../styles/leaflet-theme.css";

import { locateOrg } from "../../api/org";
// ❗ Namespace import — deleteDrawing eksport qilinmagan bo‘lsa ham xato bermaydi
import * as drawingsApi from "../../api/drawings";
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

/* -------------------------- Kichik util funksiyalar -------------------------- */
function parseBBox(bboxStr) {
  const [w, s, e, n] = String(bboxStr || "")
    .split(",")
    .map((x) => Number(x));
  return { w, s, e, n };
}
function bufferBBoxStr(bboxStr, ratio = 0.2) {
  const { w, s, e, n } = parseBBox(bboxStr);
  if (![w, s, e, n].every(Number.isFinite)) return bboxStr;
  const dw = (e - w) * ratio;
  const dh = (n - s) * ratio;
  return [w - dw, s - dh, e + dw, n + dh].join(",");
}
function envBool(v, def = false) {
  if (v === undefined || v === null) return def;
  const s = String(v).trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

/** Overlay orqali yoqish/o‘chirishni haqiqiy Layer add/remove eventlari bilan ushlaymiz */
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

/** ✨ IntroFlight — Google Earth uslubidagi kirish animatsiyasi (patched) */
function IntroFlight({ enabled, delayMs, target }) {
  const map = useMap();
  const didRunRef = useRef(false);

  // target validligini tekshiruvchi helper
  const isValid = (t) =>
    t &&
    Number.isFinite(t.lat) &&
    Number.isFinite(t.lng) &&
    Number.isFinite(t.zoom);

  useEffect(() => {
    // Intro o‘chirilgan yoki allaqachon bajargan bo‘lsa — chiqib ketamiz
    if (!enabled || didRunRef.current) return;

    // target hali tayyor emas — flag qo‘ymaymiz, keyingi update’ni kutamiz
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
          // xavfsiz fallback
          map.setView([target.lat, target.lng], target.zoom);
        } finally {
          didRunRef.current = true; // ✅ faqat muvaffaqiyatli ishga tushirgandan keyin belgilaymiz
        }
      });
    }, Math.max(0, Number(delayMs) || 0));

    return () => clearTimeout(tid);
    // target koordinatalari tayyor bo‘lganda effect qayta ishlashi uchun granular deps
  }, [enabled, delayMs, target?.lat, target?.lng, target?.zoom, map]);

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

  /* 🔽 Intro parametrlari */
  introEnabled = true,
  introDelayMs = 700,
  userRole = "user", // "admin" bo‘lsa — butun O‘zbekiston
  homeTarget = null, // {lat, lng, zoom} bo‘lsa to‘g‘ridan-to‘g‘ri shunga uchadi
}) {
  const featureGroupRef = useRef(null);
  const lastDrawnLayerRef = useRef(null); // ⬅️ so‘nggi chizilgan layer (tasdiqlanmasa o‘chirish uchun)

  // ---- Draw state
  const [geojson, setGeojson] = useState(null);
  const updateGeoJSON = useCallback(() => {
    const fg = featureGroupRef.current;
    if (!fg) return;
    setGeojson(fg.toGeoJSON());
  }, []);
  const onEdited = useCallback(updateGeoJSON, [updateGeoJSON]);
  const onDeleted = useCallback(updateGeoJSON, [updateGeoJSON]);

  // ✨ Draw toolbar’ni overlay bilan boshqarish
  const [drawEnabled, setDrawEnabled] = useState(false);

  // ---- Geometry edit session (facility uchun)
  const [geomEdit, setGeomEdit] = useState(null); // { facilityId, geometry }
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
      setReloadKey((k) => k + 1);
    } catch (e) {
      console.error(e);
      alert("Geometriyani saqlashda xatolik yuz berdi.");
    }
  }, [geomEdit?.facilityId, exitGeomEdit]);

  // ---- Tree & nav
  const [checkedKeys, setCheckedKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [navTarget, setNavTarget] = useState(null);

  const flyTo = useCallback((latLng, z = 17) => {
    if (!Array.isArray(latLng) || latLng.length < 2) return;
    const [lat, lng] = latLng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setNavTarget({ lat, lng, zoom: z, ts: Date.now() });
  }, []);

  // Panel ko‘rsatish/yashirish
  const [panelHidden, setPanelHidden] = useState(!hideTree);
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

  // -------- Draft (latest drawing) holati --------
  const DRAFT_TTL_MS = 24 * 60 * 60 * 1000; // 24 soat
  const [draftVisible, setDraftVisible] = useState(false); // overlay holati
  const [draftGeoJSON, setDraftGeoJSON] = useState(null);
  const draftLayerRef = useRef(null);

  const loadDraftIfFresh = useCallback(async () => {
    try {
      if (!drawingsApi.getLatestDrawing) return;
      const latest = await drawingsApi.getLatestDrawing(); // { geojson, createdAt? }
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
      console.error("Draftni yuklashda xatolik:", e);
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
      console.error("Draftni saqlashda xatolik:", e);
    }
  }, []);

  const clearDraft = useCallback(async () => {
    try {
      if (typeof drawingsApi.deleteDrawing === "function") {
        await drawingsApi.deleteDrawing("latest-draft");
      } else if (typeof drawingsApi.saveDrawing === "function") {
        await drawingsApi.saveDrawing(
          {
            type: "FeatureCollection",
            properties: { __kind: "latest-draft", __ts: Date.now() },
            features: [],
          },
          "latest-draft:clear"
        );
      }
    } catch (e) {
      console.error("Draftni o‘chirib bo‘lmadi:", e);
    } finally {
      try {
        draftLayerRef.current?.remove();
      } catch {}
      setDraftGeoJSON(null);
    }
  }, []);

  // -------- Facilities fetch (bbox buffer + cache) --------
  const facCacheRef = useRef(new Map()); // key -> { ts, data }
  const FAC_TTL = 15_000; // 15s

  useEffect(() => {
    let cancelled = false;

    if (!bbox || checkedOrgIds.length === 0 || enabledTypes.length === 0) {
      setFacilities([]);
      return;
    }

    const buffered = bufferBBoxStr(bbox, 0.2);
    const cacheKey = [
      buffered,
      checkedOrgIds
        .slice()
        .sort((a, b) => a - b)
        .join(","),
      enabledTypes.slice().sort().join(","),
    ].join("|");

    const hit = facCacheRef.current.get(cacheKey);
    if (hit && Date.now() - hit.ts < FAC_TTL) {
      setFacilities(hit.data);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const reqs = checkedOrgIds.map((orgId) =>
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

      const layer = e.layer;
      const type = e.layerType;

      if (geomEdit) return;
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

  // EDIT modal
  const [editOpen, setEditOpen] = useState(false);
  const [editFacility, setEditFacility] = useState(null);
  const handleOpenEdit = (f) => {
    setEditFacility(f);
    setEditOpen(true);
  };

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

        setCheckedKeys((prev) =>
          prev.includes(idStr) ? prev : [...prev, idStr]
        );
        setSelectedKeys([idStr]);

        const ancestors = collectAncestorsKeys(orgTree, idStr) || [];
        setExpandedKeys((prev) => {
          const prevArr = prev ? prev.map(String) : [];
          return Array.from(new Set([...prevArr, ...ancestors, idStr]));
        });

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

  // ✨ Banner style’larini memo qilamiz
  const editBannerStyle = useMemo(
    () => ({
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
    }),
    []
  );

  // ENV dan offline tile URL & TMS
  const HYBRID_URL =
    import.meta.env.VITE_TILE_HYBRID || "http://localhost:8008/{z}/{x}/{y}.jpg";
  const SATELLITE_URL =
    import.meta.env.VITE_TILE_SATELLITE ||
    "http://localhost:5005/{z}/{x}/{y}.jpg";
  const TMS = envBool(import.meta.env.VITE_TILE_TMS, true); // TMS bo‘lsa true

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

  /* ---------- Intro targetni hisoblash ---------- */
  const UZ_CENTER = { lat: 41.3775, lng: 64.5853 }; // taxminiy markaz
  const UZ_ZOOM = 6;

  const computedHome = useMemo(() => {
    // 1) Prop orqali berilsa — o‘sha
    if (
      homeTarget &&
      Number.isFinite(homeTarget.lat) &&
      Number.isFinite(homeTarget.lng) &&
      Number.isFinite(homeTarget.zoom)
    ) {
      return homeTarget;
    }
    // 2) Admin => O‘zbekiston
    if (String(userRole).toLowerCase() === "admin") {
      return { ...UZ_CENTER, zoom: UZ_ZOOM };
    }
    // 3) orgTree dagi birinchi pos’li tugun (masalan foydalanuvchi hududi)
    const firstWithPos = flatNodes.find((n) => Array.isArray(n.pos));
    if (firstWithPos) {
      const [lat, lng] = firstWithPos.pos;
      const z = Number.isFinite(firstWithPos.zoom) ? firstWithPos.zoom : 12;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng, zoom: z };
      }
    }
    // 4) fallback — kirishdagi center/zoom
    return { lat: center[0], lng: center[1], zoom };
  }, [homeTarget, userRole, flatNodes, center, zoom]);

  // MapContainer’ni 3-zoom bilan ochamiz (intro bo‘lsa), aks holda odatdagi zoom
  const initialZoom = introEnabled ? 3 : zoom;

  return (
    <div className="map-wrapper" style={{ position: "relative" }}>
      {/* 🔧 Dark-mode drawer patch CSS */}
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
        {/* ✨ Intro flight */}
        <IntroFlight
          enabled={!!introEnabled}
          delayMs={introDelayMs}
          target={computedHome}
        />

        {/* 🧭 Bazaviy qatlamlar — pastki o‘ngda */}
        <LayersControl position="bottomright">
          <LayersControl.BaseLayer checked name="Bing Hybrid (offline, 8008)">
            <MapTiles
              key="hybrid-8008"
              url={HYBRID_URL}
              minZoom={minZoom}
              maxZoom={maxZoom}
              maxNativeZoom={maxZoom}
              tms={TMS}
              noWrap={true}
              updateWhenIdle={true}
              keepBuffer={2}
              attribution="&copy; Hybrid (offline)"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Bing Satellite (offline, 5005)">
            <MapTiles
              key="satellite-5005"
              url={SATELLITE_URL}
              minZoom={minZoom}
              maxZoom={maxZoom}
              maxNativeZoom={maxZoom}
              tms={TMS}
              noWrap={true}
              updateWhenIdle={true}
              keepBuffer={2}
              attribution="&copy; Satellite (offline)"
            />
          </LayersControl.BaseLayer>

          {/* ✅ Chizish rejimi — faqat checked bo‘lganda toolbar ko‘rinadi */}
          <LayersControl.Overlay name="Chizish rejimi (toolbar)">
            <LayersToggle
              onEnable={() => setDrawEnabled(true)}
              onDisable={() => setDrawEnabled(false)}
            />
          </LayersControl.Overlay>

          {/* ✅ Draftni ko‘rsatish — default OFF */}
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
        </LayersControl>

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

        {/* Org markerlar — faqat chek qilingan bo‘limlar */}
        {flatNodes
          .filter((n) => n.pos && checkedKeys.includes(String(n.key)))
          .map((n) => (
            <Marker key={n.key} position={n.pos} pane="facilities-markers">
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
                  marker: !geomEdit, // edit rejimida marker o‘chirilgan
                }}
              />
            </Suspense>
          )}
        </FeatureGroup>
      </MapContainer>

      {/* Draft boshqaruvi (faqat overlay yoqilganda va draft mavjud bo‘lsa) */}
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

      {/* Org tree panel */}
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

      {/* Create Drawer — tasdiqdan keyin ochiladi; saqlanganda draft avtomatik o‘chadi */}
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
                  if (!drawingsApi.saveDrawing) {
                    alert("API topilmadi.");
                    return;
                  }
                  await drawingsApi.saveDrawing(geojson || {}, "map-drawings");
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

      {/* ✨ Geometriya tahrirlash bannerri */}
      {geomEdit && (
        <div style={editBannerStyle}>
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
