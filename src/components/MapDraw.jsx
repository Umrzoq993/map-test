// src/components/MapDraw.jsx
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
  }, [target?.ts]); // ts: bir xil nuqtani qayta tanlaganda ham ishga tushsin

  return null;
}

/** Bir nechta marker bo'lsa, hammasini qamrab olish (fitBounds) */
function MapFitter({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length < 2) return;
    const bounds = L.latLngBounds(points);
    map.flyToBounds(bounds, { padding: [32, 32], duration: 1.0 });
  }, [points]);
  return null;
}

export default function MapDraw({
  center = [41.3111, 69.2797],
  zoom = 12,
  height = "calc(100vh - 100px)",
  dark = false,
  orgTree = [], // [{ key, title, pos:[lat,lng], zoom?, children:[] }]
  hideTree = false, // drawer ochiq bo‘lsa true — tree overlay yashiriladi
}) {
  const featureGroupRef = useRef(null);

  const [geojson, setGeojson] = useState(null);
  const [checkedKeys, setCheckedKeys] = useState([]); // checkbox holati
  const [selectedKeys, setSelectedKeys] = useState([]); // tanlangan node
  const [navTarget, setNavTarget] = useState(null); // {lat,lng,zoom,ts}

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

  // rc-tree uchun soddalashtirilgan data
  const rcData = useMemo(() => {
    const mapNode = (n) => ({
      key: String(n.key),
      title: n.title,
      children: n.children ? n.children.map(mapNode) : undefined,
    });
    return orgTree.map(mapNode);
  }, [orgTree]);

  const geojsonPretty = geojson ? JSON.stringify(geojson, null, 2) : "";

  // GeoJSON import
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
        {/* Dark/Light tile */}
        <TileLayer
          url={
            dark
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
          attribution="&copy; OSM &copy; Carto"
        />

        {/* Uchirish nazoratchisi — navTarget o‘zgarsa animatsiya qiladi */}
        <MapFlyer target={navTarget} />

        {/* 2+ marker bo‘lsa hammasini qamrab oladi */}
        <MapFitter points={visibleMarkers.map((n) => n.pos)} />

        {/* Checkbox bilan boshqariladigan markerlar */}
        {visibleMarkers.map((n) => (
          <Marker key={n.key} position={n.pos}>
            <Popup>{n.title}</Popup>
          </Marker>
        ))}

        {/* Draw qatlami */}
        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topright" // toolbar o‘ng-yuqorida
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

      {/* Org tree — overlay karta (z-index SCSS’da) */}
      <div className={`org-tree-card ${hideTree ? "is-hidden" : ""}`}>
        <div className="org-tree-card__header">Tashkilot tuzilmasi</div>
        <div className="org-tree-card__body">
          <Tree
            checkable
            selectable
            treeData={rcData}
            checkedKeys={checkedKeys}
            selectedKeys={selectedKeys}
            onCheck={onTreeCheck}
            onSelect={onTreeSelect}
            defaultExpandAll
            virtual={false}
          />
        </div>
        <div className="org-tree-card__hint">
          ✔ marker ko‘rsatadi · 1× click → joyga uchish
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
