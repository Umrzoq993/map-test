// src/tools/UzLinesFixer.jsx
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, FeatureGroup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import uzLinesFallback from "../assets/uz_lines.json";

/* ---------- Doimiylar va maxfiy flaglar (klonlanmaydi) ---------- */
const DB_NAME = "uz-lines-fs";
const STORE = "handles";
const KEY = "src/assets/uz_lines.json";

/* Belgilashlar endi options’da emas, instansiya xususiyatida (klon nusxalamaydi) */
const OWN = Symbol("uzOwner"); // lyr[OWN] === true -> faqat biz yaratgan qatlam
const UZKEY = Symbol("uzKey"); // lyr[UZKEY] = "id#idx" -> unikal kalit

/* ---------- IndexedDB: file handle saqlash/olish ---------- */
function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbPutHandle(handle) {
  const db = await idbOpen();
  await new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(handle, KEY);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
}
async function idbGetHandle() {
  const db = await idbOpen();
  const handle = await new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => res(req.result || null);
    req.onerror = () => rej(req.error);
  });
  db.close();
  return handle;
}
async function verifyPermission(handle, mode = "readwrite") {
  if (!handle) return "denied";
  const opts = { mode };
  const q = await handle.queryPermission?.(opts);
  if (q === "granted") return "granted";
  if (q === "prompt") {
    const r = await handle.requestPermission?.(opts);
    return r ?? "denied";
  }
  return "denied";
}

/* ---------- Map helpers ---------- */
function FitOnLayers({ featureGroupRef, version = 0 }) {
  const map = useMap();
  useEffect(() => {
    const fg = featureGroupRef.current;
    if (!map || !fg) return;
    try {
      const b = fg.getBounds();
      if (b && b.isValid && b.isValid())
        map.fitBounds(b, { padding: [20, 20] });
    } catch {}
  }, [map, featureGroupRef, version]);
  return null;
}
function GeomanInit() {
  const map = useMap();
  useEffect(() => {
    if (!map?.pm) return;
    try {
      map.pm.addControls({
        position: "topright",
        drawPolyline: false,
        drawPolygon: false,
        drawRectangle: false,
        drawMarker: false,
        drawCircle: false,
        drawCircleMarker: false,
        editMode: false,
        dragMode: false,
        cutPolygon: false,
        rotateMode: false,
        removalMode: false,
      });
      map.pm.setGlobalOptions({ snappable: false });
    } catch {}
    return () => {
      try {
        map.pm.removeControls();
      } catch {}
    };
  }, [map]);
  return null;
}

/* ---------- Map darajasida posbon (begona/klon qatlamlarni tozalash) ---------- */
function MapDedupeGuard({ featureGroupRef, registryRef }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const fg = featureGroupRef.current;

    const isOurs = (lyr) => lyr instanceof L.Polyline && lyr[OWN] === true;

    // Boshlang‘ich tozalash
    map.eachLayer((lyr) => {
      if (lyr instanceof L.Polyline && !isOurs(lyr)) {
        try {
          map.removeLayer(lyr);
        } catch {}
      }
    });

    // Har qanday layer qo‘shilganda tekshiruv
    const onAnyLayerAdd = (e) => {
      const lyr = e.layer;
      if (!(lyr instanceof L.Polyline)) return;
      if (!isOurs(lyr)) {
        // geoman klonlari / chet qatlamlar
        try {
          map.removeLayer(lyr);
        } catch {}
        return;
      }
      const key = lyr[UZKEY];
      if (!key) return;

      // Barcha polyline'lar yagona konteynerda bo‘lsin
      if (!fg.hasLayer(lyr)) {
        try {
          fg.addLayer(lyr);
        } catch {}
      }
      const prev = registryRef.current.get(key);
      if (prev && prev !== lyr) {
        try {
          fg.removeLayer(prev);
        } catch {}
      }
      registryRef.current.set(key, lyr);
    };

    map.on("layeradd", onAnyLayerAdd);
    return () => {
      try {
        map.off("layeradd", onAnyLayerAdd);
      } catch {}
    };
  }, [featureGroupRef, registryRef, map]);

  return null;
}

/* ---------- JSON <-> FeatureGroup ---------- */
function loadJsonToFeatureGroup(
  json,
  fg,
  style,
  propsByIdRef,
  renderer,
  registryRef
) {
  // FG ichini qat’iy tozalash (faqat polylinelar)
  try {
    fg.eachLayer((lyr) => {
      if (lyr instanceof L.Polyline) fg.removeLayer(lyr);
    });
  } catch {}
  try {
    fg.clearLayers();
  } catch {}
  propsByIdRef.current.clear();
  registryRef.current.clear();

  const features = Array.isArray(json?.features) ? json.features : [];
  let segCount = 0;

  features.forEach((f, fi) => {
    const id = f?.properties?.id ?? String(fi);
    propsByIdRef.current.set(id, { ...(f?.properties || {}) });
    const g = f?.geometry || {};

    const addSeg = (coords, ringIdx) => {
      const latlngs = (coords || []).map(([lng, lat]) => [lat, lng]); // [lng,lat] → [lat,lng]
      const key = `${id}#${ringIdx}`;

      // Avvalgi nusxa bo‘lsa olib tashlaymiz
      const prev = registryRef.current.get(key);
      if (prev) {
        try {
          fg.removeLayer(prev);
        } catch {}
      }

      const lyr = L.polyline(latlngs, {
        ...style,
        renderer,
        pmIgnore: false,
        interactive: true,
        smoothFactor: 1.5,
        noClip: true,
      });
      // MUHIM: Belgilar instansiyada, options’da emas!
      lyr[OWN] = true;
      lyr[UZKEY] = key;

      registryRef.current.set(key, lyr);
      lyr.addTo(fg);
      segCount += 1;
    };

    if (g.type === "MultiLineString" && Array.isArray(g.coordinates)) {
      g.coordinates.forEach((ring, ri) => addSeg(ring, ri));
    } else if (g.type === "LineString" && Array.isArray(g.coordinates)) {
      addSeg(g.coordinates, 0);
    }
  });

  // Yakuniy sinxron
  hardSyncRegistryWithFG(fg, registryRef);

  return { features: features.length, segments: segCount };
}

/* FG va registrni qattiq sinxronlash (faqat bizniki qoladi, kalit bo‘yicha 1 ta) */
function hardSyncRegistryWithFG(fg, registryRef) {
  const next = new Map();
  fg.eachLayer?.((lyr) => {
    if (!(lyr instanceof L.Polyline)) return;
    if (lyr[OWN] !== true) {
      try {
        fg.removeLayer(lyr);
      } catch {}
      return;
    }
    const key = lyr[UZKEY];
    if (!key) {
      try {
        fg.removeLayer(lyr);
      } catch {}
      return;
    }
    const prev = next.get(key);
    if (prev && prev !== lyr) {
      try {
        fg.removeLayer(prev);
      } catch {}
    }
    next.set(key, lyr);
  });
  registryRef.current = next;
}

/* JSON’ni **faqat registry** asosida yig‘amiz — FG’dagi tasodifiy layelar e’tiborga olinmaydi */
function buildJsonFromRegistry(registry, propsByIdRef, baseMeta = {}) {
  const groups = new Map(); // id -> rings[]
  for (const [key, lyr] of registry.entries()) {
    if (!(lyr instanceof L.Polyline)) continue;
    if (lyr[OWN] !== true) continue;
    const [id, idxStr] = String(key).split("#");
    const idx = Number(idxStr ?? 0);
    const latlngs = (lyr.getLatLngs?.() || []).map((p) => [p.lng, p.lat]);
    if (!groups.has(id)) groups.set(id, []);
    const arr = groups.get(id);
    arr[idx] = latlngs;
  }

  const outFeatures = [];
  for (const [id, rings] of groups.entries()) {
    const coords = (rings || []).filter(Boolean);
    const props = propsByIdRef.current.get(id) || { id };
    const isMulti = coords.length > 1;
    outFeatures.push({
      type: "Feature",
      properties: props,
      geometry: {
        type: isMulti ? "MultiLineString" : "LineString",
        coordinates: isMulti ? coords : coords[0] || [],
      },
    });
  }

  return {
    type: "FeatureCollection",
    name: baseMeta?.name || "uz_lines",
    xy_coordinate_resolution: baseMeta?.xy_coordinate_resolution ?? 1e-6,
    features: outFeatures,
  };
}

/* ---------- Komponent ---------- */
export default function UzLinesFixer() {
  const fgRef = useRef(null);
  const propsByIdRef = useRef(new Map());
  const fileHandleRef = useRef(null);
  const activeRef = useRef(null);
  const registryRef = useRef(new Map()); // key -> layer

  const [counts, setCounts] = useState({ features: 0, segments: 0 });
  const [status, setStatus] = useState("fallback"); // fallback | bound
  const [baseMeta, setBaseMeta] = useState({
    name: uzLinesFallback?.name || "uz_lines",
    xy_coordinate_resolution: uzLinesFallback?.xy_coordinate_resolution ?? 1e-6,
  });
  const [fitVersion, setFitVersion] = useState(0);
  const [mode, setMode] = useState("single"); // single | all

  const canvasRenderer = useMemo(() => L.canvas({ padding: 0.5 }), []);
  const style = useMemo(
    () => ({ color: "#1d4ed8", weight: 2, opacity: 0.9 }),
    []
  );

  const TILE_URL =
    import.meta.env.VITE_TILE_HYBRID ||
    import.meta.env.VITE_TILE_URL ||
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const TILE_TMS =
    String(import.meta.env.VITE_TILE_TMS || "").toLowerCase() === "true";

  /* 1) Mount: fallback JSON ko‘rsatish */
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    const c = loadJsonToFeatureGroup(
      uzLinesFallback,
      fg,
      style,
      propsByIdRef,
      canvasRenderer,
      registryRef
    );
    setCounts(c);
    setBaseMeta({
      name: uzLinesFallback?.name || "uz_lines",
      xy_coordinate_resolution:
        uzLinesFallback?.xy_coordinate_resolution ?? 1e-6,
    });
    setFitVersion((v) => v + 1);
  }, [style, canvasRenderer]);

  /* 2) Oldindan ruxsat bo‘lsa — real faylni avtomatik yuklash */
  useEffect(() => {
    (async () => {
      try {
        const h = await idbGetHandle();
        if (!h) return;
        const perm = await verifyPermission(h, "readwrite");
        if (perm !== "granted") return;

        const file = await h.getFile();
        const text = await file.text();
        const parsed = JSON.parse(text);

        const fg = fgRef.current;
        const c = loadJsonToFeatureGroup(
          parsed,
          fg,
          style,
          propsByIdRef,
          canvasRenderer,
          registryRef
        );
        setCounts(c);
        setBaseMeta({
          name: parsed?.name || "uz_lines",
          xy_coordinate_resolution: parsed?.xy_coordinate_resolution ?? 1e-6,
        });
        fileHandleRef.current = h;
        setStatus("bound");
        setFitVersion((v) => v + 1);
      } catch (e) {
        console.warn("Auto-bind failed:", e);
      }
    })();
  }, [style, canvasRenderer]);

  /* 3) Rejimga mos vertex yoqish + qatlam posboni */
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;

    function enableOne(lyr) {
      if (activeRef.current && activeRef.current !== lyr) {
        try {
          activeRef.current.pm?.disable?.();
          activeRef.current.setStyle({
            weight: style.weight,
            opacity: style.opacity,
          });
        } catch {}
      }
      try {
        lyr.pm?.enable?.({ allowSelfIntersection: true, snappable: false });
        lyr.bringToFront?.();
        lyr.setStyle({ weight: 3, opacity: 1 });
        activeRef.current = lyr;
      } catch {}
    }
    function enableAll() {
      try {
        fg.eachLayer((lyr) => {
          if (lyr instanceof L.Polyline && lyr[OWN] === true)
            lyr.pm?.enable?.({ allowSelfIntersection: true, snappable: false });
        });
      } catch {}
    }
    function disableAll() {
      try {
        fg.eachLayer((lyr) => {
          if (lyr instanceof L.Polyline && lyr[OWN] === true) {
            lyr.pm?.disable?.();
            lyr.setStyle({ weight: style.weight, opacity: style.opacity });
          }
        });
      } catch {}
      activeRef.current = null;
    }

    function onLayerAddToFG(e) {
      const lyr = e.layer;
      if (!(lyr instanceof L.Polyline)) return;
      if (lyr[OWN] !== true) {
        // begona/klon — chiqaramiz
        try {
          fg.removeLayer(lyr);
        } catch {}
        return;
      }
      const key = lyr[UZKEY];
      if (key) {
        const prev = registryRef.current.get(key);
        if (prev && prev !== lyr) {
          try {
            fg.removeLayer(prev);
          } catch {}
        }
        registryRef.current.set(key, lyr);
      }
      lyr.on("click", () => {
        if (mode === "single") enableOne(lyr);
      });
    }

    // mavjud qatlamlarga bog‘lash
    fg.getLayers().forEach((lyr) => onLayerAddToFG({ layer: lyr }));
    fg.on("layeradd", onLayerAddToFG);

    // rejimni qo‘llash
    if (mode === "all") enableAll();
    else disableAll();

    // qat’iy sinxron
    hardSyncRegistryWithFG(fg, registryRef);

    return () => {
      try {
        fg.off("layeradd", onLayerAddToFG);
      } catch {}
      try {
        fg.getLayers().forEach((lyr) => lyr.off("click"));
      } catch {}
      try {
        disableAll();
      } catch {}
    };
  }, [mode, style]);

  // Bir marta ruxsat berish
  const oneTimeBind = useCallback(async () => {
    try {
      if (!("showOpenFilePicker" in window)) {
        alert("Chrome/Edge kerak (File System Access API).");
        return;
      }
      const [handle] = await window.showOpenFilePicker({
        multiple: false,
        excludeAcceptAllOption: false,
        types: [
          { description: "JSON", accept: { "application/json": [".json"] } },
        ],
      });
      if (!handle) return;
      const perm = await verifyPermission(handle, "readwrite");
      if (perm !== "granted") return;

      await idbPutHandle(handle);
      fileHandleRef.current = handle;
      setStatus("bound");

      const file = await handle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);

      const fg = fgRef.current;
      const c = loadJsonToFeatureGroup(
        parsed,
        fg,
        style,
        propsByIdRef,
        canvasRenderer,
        registryRef
      );
      setCounts(c);
      setBaseMeta({
        name: parsed?.name || "uz_lines",
        xy_coordinate_resolution: parsed?.xy_coordinate_resolution ?? 1e-6,
      });
      setFitVersion((v) => v + 1);
    } catch (e) {
      alert("Bog'lashda xatolik: " + (e?.message || e));
    }
  }, [style, canvasRenderer]);

  // Saqlash — faqat registry asosida (dublikat prinsipial ravishda chiqmaydi)
  const saveDirect = useCallback(async () => {
    try {
      const handle = fileHandleRef.current;
      if (!handle) {
        await oneTimeBind();
        if (!fileHandleRef.current) return;
      }
      const fg = fgRef.current;
      if (!fg) return;

      // qat’iy sinxron: FG ↔ registry
      hardSyncRegistryWithFG(fg, registryRef);

      const out = buildJsonFromRegistry(
        registryRef.current,
        propsByIdRef,
        baseMeta
      );

      await new Promise((r) => setTimeout(r, 0)); // UI’ni bloklamaslik
      const text = JSON.stringify(out, null, 2);

      const writable = await fileHandleRef.current.createWritable();
      await writable.write(new Blob([text], { type: "application/json" }));
      await writable.close();
    } catch (e) {
      alert("Saqlashda xatolik: " + (e?.message || e));
    }
  }, [baseMeta, oneTimeBind]);

  // Cmd/Ctrl+S
  useEffect(() => {
    function onKey(e) {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      if (
        (isMac && e.metaKey && e.key === "s") ||
        (!isMac && e.ctrlKey && e.key === "s")
      ) {
        e.preventDefault();
        saveDirect();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveDirect]);

  return (
    <div className="card" style={{ padding: 12, gap: 12, display: "grid" }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button className="btn btn-primary" onClick={saveDirect}>
          💾 Saqlash (Cmd/Ctrl+S)
        </button>
        {status !== "bound" && (
          <button
            className="btn"
            onClick={oneTimeBind}
            title="Bir marta ruxsat bering — keyin avtomatik yozadi"
          >
            🔓 Bir marta ruxsat berish (uz_lines.json)
          </button>
        )}
        <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 12, opacity: 0.75 }}>Rejim:</span>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="single">Yagona (tez)</option>
            <option value="all">Hammasi (to‘liq, sekinroq)</option>
          </select>
        </div>
      </div>

      <div style={{ height: "80vh", borderRadius: 8, overflow: "hidden" }}>
        <MapContainer
          center={[41, 64]}
          zoom={6}
          style={{ height: "100%", width: "100%" }}
          preferCanvas={true}
        >
          <TileLayer url={TILE_URL} tms={TILE_TMS} />
          <FeatureGroup ref={fgRef} />
          <GeomanInit />
          <MapDedupeGuard featureGroupRef={fgRef} registryRef={registryRef} />
          <FitOnLayers featureGroupRef={fgRef} version={fitVersion} />
        </MapContainer>
      </div>

      {/* Vertex'lar aniq ko'rinsin (faqat shu sahifa uchun) */}
      <style>{`
        .leaflet-pm-marker {
          width: 10px !important;
          height: 10px !important;
          border-radius: 50% !important;
          background: #fff !important;
          border: 1px solid #1d4ed8 !important;
          box-shadow: 0 0 0 2px rgba(29,78,216,.25) !important;
        }
      `}</style>
    </div>
  );
}
