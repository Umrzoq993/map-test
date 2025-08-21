// src/components/map/MapView.jsx
import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  FeatureGroup,
  Pane,
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import MapTiles from "./MapTiles";

import { getLatestDrawing, saveDrawing } from "../../api/drawings";
import {
  fetchFacilities,
  patchFacility,
  deleteFacility,
} from "../../api/facilities";

import MapFlyer from "./MapFlyer";
import ViewportWatcher from "./ViewportWatcher";
import FacilityGeoLayer from "./FacilityGeoLayer";
import FacilityMarkers from "./FacilityMarkers";
import CreateFacilityDrawer from "./CreateFacilityDrawer";
import OrgTreePanel from "./OrgTreePanel";
import FacilityDetailsModal from "./FacilityDetailsModal";

export default function MapView({
  center = [41.3111, 69.2797],
  zoom = 12,
  height = "calc(100vh - 100px)",
  dark = false,
  orgTree = [],
  hideTree = false,
}) {
  const featureGroupRef = useRef(null);

  // Draw state
  const [geojson, setGeojson] = useState(null);
  const updateGeoJSON = useCallback(() => {
    const fg = featureGroupRef.current;
    if (!fg) return;
    setGeojson(fg.toGeoJSON());
  }, []);
  const onEdited = useCallback(updateGeoJSON, [updateGeoJSON]);
  const onDeleted = useCallback(updateGeoJSON, [updateGeoJSON]);

  // Tree & nav
  const [checkedKeys, setCheckedKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [navTarget, setNavTarget] = useState(null);

  // Search
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);
  const onEnterSearch = () => setQuery(searchInput.trim());
  const onClearSearch = () => setSearchInput("");

  // Viewport
  const [bbox, setBbox] = useState(null);

  // Facilities
  const [facilities, setFacilities] = useState([]);
  const [typeFilter, setTypeFilter] = useState({
    GREENHOUSE: true,
    COWSHED: true,
    TURKEY: true,
    SHEEPFOLD: true,
    POULTRY: true,
    FISHPOND: true,
    WORKSHOP: true,
    AUX_LAND: false,
    BORDER_LAND: false,
    WAREHOUSE: false,
    ORCHARD: false,
    FIELD: false,
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

  // Load latest drawing (optional)
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

  // Flatten org tree
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

  // Filtered tree for search
  const [expandedKeys, setExpandedKeys] = useState(undefined);
  const { rcData, visibleKeySet } = useMemo(() => {
    const q = query.toLowerCase();
    const visible = new Set();
    const prune = (nodes) => {
      if (!q) return nodes;
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
    const mapNode = (n) => ({
      key: String(n.key),
      title: typeof n.title === "string" ? highlight(n.title, query) : n.title,
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

  // SELECT (flyTo) uchun
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
          fetchFacilities({ orgId, types: enabledTypes, bbox })
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
        if (!cancelled) console.error("fetchFacilities failed:", e);
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
      if (!["marker", "polygon", "rectangle"].includes(type)) return;
      const gj = layer.toGeoJSON();
      const geometry = gj.geometry;
      const c =
        type === "marker" ? layer.getLatLng() : layer.getBounds().getCenter();
      setDraftGeom(geometry);
      setDraftCenter({ lat: c.lat, lng: c.lng });
      setCreateOpen(true);
    },
    [updateGeoJSON]
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
      <MapContainer center={center} zoom={zoom} style={{ height, width: "100%" }}>
        <MapTiles dark={dark} />

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
          onFlyTo={setNavTarget}
        />

        {/* Geometry yo‘q obyektlar yoki umumiy marker ko‘rsatish */}
        <FacilityMarkers
          facilities={visibleFacilities}
          onOpenEdit={handleOpenEdit}
        />

        {/* Draw */}
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
              marker: true,
            }}
          />
        </FeatureGroup>
      </MapContainer>

      {/* Tree panel */}
      <OrgTreePanel
        rcData={rcData}
        checkedKeys={checkedKeys}
        selectedKeys={selectedKeys}
        expandedKeys={expandedKeys}
        onTreeExpand={onTreeExpand}
        onTreeCheck={onTreeCheck}
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
        hide={hideTree}
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
      <FacilityDetailsModal
        open={editOpen}
        facility={editFacility}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setReloadKey((k) => k + 1);
        }}
      />

      {/* Pastki panel: GeoJSON import/export */}
      <div className="panel">
        <div className="panel-col">
          <h4>GeoJSON (readonly)</h4>
          <textarea readOnly value={geojsonPretty} />
        </div>
        <div className="panel-col">
          <h4>GeoJSON import</h4>
          <textarea id="gj-input" placeholder='{"type":"FeatureCollection","features":[...]}' />
          <div className="panel-actions">
            <button onClick={importFromTextarea}>Import</button>
            <a
              href={"data:application/json;charset=utf-8," + encodeURIComponent(geojsonPretty || "{}")}
              download="drawings.geojson"
            >
              <button disabled={!geojsonPretty}>Download .geojson</button>
            </a>
            <button
              onClick={async () => {
                try {
                  if (!saveDrawing) return alert("API topilmadi.");
                  await saveDrawing(geojson || {}, "map-drawings");
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
