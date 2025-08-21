// src/components/map/MapDraw.jsx
import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  Marker,
  Popup,
  useMap,
  GeoJSON,
  Pane,
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";
import Tree from "rc-tree";
import "rc-tree/assets/index.css";

import { getLatestDrawing, saveDrawing } from "../../api/drawings";
import {
  fetchFacilities,
  patchFacility,
  deleteFacility,
  createFacility,
} from "../../api/facilities";
import { iconFor, typeColor, badgeIconFor } from "./mapIcons";

/** FlyTo: yon ta'sirlar useEffect ichida */
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

/** Viewport watcher: moveend da BBOX ("minLng,minLat,maxLng,maxLat") yangilanadi */
function ViewportWatcher({ onBboxChange }) {
  const map = useMap();

  useEffect(() => {
    if (!map || typeof onBboxChange !== "function") return;

    const toBBox = (b) =>
      `${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`;
    const update = () => onBboxChange(toBBox(map.getBounds()));

    // Xarita tayyor bo‘lgach bir marta update qilamiz va keyin moveend ni tinglaymiz
    map.whenReady(() => {
      update();
      map.on("moveend", update);
    });

    return () => {
      map.off("moveend", update);
    };
  }, [map, onBboxChange]);

  return null;
}

/** GeoJSON geometry uchun centroid (Polygon/MultiPolygon/Point) */
function centroidOfGeometry(geometry) {
  if (!geometry || !geometry.type) return null;
  if (geometry.type === "Point") {
    const [lng, lat] = geometry.coordinates || [];
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  }
  if (geometry.type === "Polygon") {
    return centroidOfPolygon(geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon") {
    // eng katta halqaning centroidini olamiz (1-chi poligon ham bo‘lishi mumkin)
    let best = null;
    let bestArea = -Infinity;
    for (const poly of geometry.coordinates || []) {
      const c = centroidOfPolygon(poly);
      if (c && c.area > bestArea) {
        bestArea = c.area;
        best = { lat: c.lat, lng: c.lng };
      }
    }
    return best;
  }
  return null;
}
function centroidOfPolygon(rings) {
  // rings: [outerRing, [holes...]] — bizga outer yetadi
  if (!rings || !rings[0] || rings[0].length < 3) return null;
  const outer = rings[0]; // [[lng,lat], ...]
  let area = 0,
    cx = 0,
    cy = 0;
  for (let i = 0, j = outer.length - 1; i < outer.length; j = i++) {
    const [x1, y1] = outer[j];
    const [x2, y2] = outer[i];
    const f = x1 * y2 - x2 * y1;
    area += f;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  if (area === 0) {
    // degan holda bbox center (fallback)
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const [x, y] of outer) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    const lng = (minX + maxX) / 2;
    const lat = (minY + maxY) / 2;
    return { lat, lng, area: 0 };
  }
  area *= 0.5;
  cx /= 6 * area;
  cy /= 6 * area;
  return { lat: cy, lng: cx, area: Math.abs(area) };
}

export default function MapDraw({
  center = [41.3111, 69.2797],
  zoom = 12,
  height = "calc(100vh - 100px)",
  dark = false,
  orgTree = [],
  hideTree = false,
}) {
  const featureGroupRef = useRef(null);

  // Draw qatlami
  const [geojson, setGeojson] = useState(null);
  const updateGeoJSON = useCallback(() => {
    const fg = featureGroupRef.current;
    if (!fg) return;
    setGeojson(fg.toGeoJSON());
  }, []);
  const onEdited = useCallback(updateGeoJSON, [updateGeoJSON]);
  const onDeleted = useCallback(updateGeoJSON, [updateGeoJSON]);

  // Tree / nav
  const [checkedKeys, setCheckedKeys] = useState([]);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [navTarget, setNavTarget] = useState(null);

  // Search (debounce)
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setQuery(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);
  const onClearSearch = () => setSearchInput("");

  // Viewport BBOX
  const [bbox, setBbox] = useState(null);

  // Facilities
  const [facilities, setFacilities] = useState([]);
  const [typeFilter, setTypeFilter] = useState({
    GREENHOUSE: true,
    COWSHED: true,
    STABLE: true,
    FISHFARM: true,
    WAREHOUSE: false,
    ORCHARD: false,
    FIELD: false,
    POULTRY: true,
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

  // Toggles
  const [showPolys, setShowPolys] = useState(true);

  // Load latest drawing (ixtiyoriy)
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
    return { filteredTree: prune(orgTree), visibleKeySet: visible };
  }, [orgTree, query]);
  useEffect(() => {
    if (visibleKeySet) setExpandedKeys(Array.from(visibleKeySet));
    else setExpandedKeys(undefined);
  }, [visibleKeySet]);

  const rcData = useMemo(() => {
    const mapNode = (n) => ({
      key: String(n.key),
      title: typeof n.title === "string" ? highlight(n.title, query) : n.title,
      children: n.children ? n.children.map(mapNode) : undefined,
    });
    return (filteredTree || []).map(mapNode);
  }, [filteredTree, query]);

  // Org markers
  const visibleMarkers = useMemo(
    () => flatNodes.filter((n) => n.pos && checkedKeys.includes(String(n.key))),
    [flatNodes, checkedKeys]
  );

  const selectedOrgId = useMemo(() => {
    const k = selectedKeys?.[0];
    if (!k) return null;
    const n = flatNodes.find((x) => String(x.key) === String(k));
    return n ? Number(n.key) : null;
  }, [selectedKeys, flatNodes]);

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

  // Facilities fetch (BBOX + types + org)
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

  // GeoJSON (polygons) for facilities
  const geoJsonRef = useRef(null);
  const facilitiesFC = useMemo(() => {
    const features = facilities
      .filter((f) => f.geometry && f.geometry.type)
      .map((f) => ({
        type: "Feature",
        geometry: f.geometry,
        properties: {
          id: f.id,
          name: f.name,
          type: f.type,
          status: f.status,
          lat: f.lat,
          lng: f.lng,
          zoom: f.zoom,
        },
      }));
    return { type: "FeatureCollection", features };
  }, [facilities]);

  const polyStyle = useCallback((feature) => {
    const t = feature?.properties?.type;
    const col = typeColor(t);
    return {
      color: col,
      weight: 2,
      fillOpacity: 0.15,
      fillColor: col,
      dashArray: "3",
    };
  }, []);

  const onEachFacilityFeature = useCallback((feature, layer) => {
    const props = feature?.properties || {};
    const name = props.name || "Facility";
    const type = props.type || "";
    const status = props.status || "";

    // Popup
    layer.bindPopup(`
      <div style="min-width:200px">
        <div style="font-weight:700">${name}</div>
        <div style="font-size:12px;opacity:.8">${type} • ${status}</div>
      </div>
    `);

    // Hover highlight
    layer.on("mouseover", () => {
      layer.setStyle({ weight: 3, fillOpacity: 0.25 });
      layer.bringToFront();
    });
    layer.on("mouseout", () => {
      if (geoJsonRef.current) geoJsonRef.current.resetStyle(layer);
    });

    // Click → flyTo
    layer.on("click", () => {
      let latlng;
      if (layer.getBounds) latlng = layer.getBounds().getCenter();
      else if (layer.getLatLng) latlng = layer.getLatLng();
      if (latlng) {
        setNavTarget({
          lat: latlng.lat,
          lng: latlng.lng,
          zoom: props.zoom && Number.isFinite(props.zoom) ? props.zoom : 16,
          ts: Date.now(),
        });
      }
    });
  }, []);

  // Centroid markers for polygons
  const polygonCentroidMarkers = useMemo(() => {
    return facilities
      .filter(
        (f) => f.geometry && f.geometry.type && f.geometry.type !== "Point"
      )
      .map((f) => {
        const c =
          centroidOfGeometry(f.geometry) ||
          (Number.isFinite(f.lat) && Number.isFinite(f.lng)
            ? { lat: f.lat, lng: f.lng }
            : null);
        if (!c) return null;
        return (
          <Marker
            key={`fc-${f.id}`}
            position={[c.lat, c.lng]}
            icon={badgeIconFor(f.type, 28)}
            pane="facilities-centroids"
          >
            <Popup>
              <div style={{ minWidth: 220 }}>
                <div style={{ fontWeight: 700 }}>{f.name}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {f.type} • {f.status}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })
      .filter(Boolean);
  }, [facilities]);

  // DRAW → create facility drawer
  const [createOpen, setCreateOpen] = useState(false);
  const [draftGeom, setDraftGeom] = useState(null);
  const [draftCenter, setDraftCenter] = useState(null);
  const [form, setForm] = useState({
    orgId: null,
    name: "",
    type: "GREENHOUSE",
    status: "ACTIVE",
    zoom: 15,
    attributes: { notes: "" },
  });
  useEffect(() => {
    setForm((f) => ({ ...f, orgId: selectedOrgId || null }));
  }, [selectedOrgId]);

  const onCreated = useCallback(
    (e) => {
      updateGeoJSON();
      const layer = e.layer;
      const type = e.layerType;
      if (!["marker", "polygon", "rectangle"].includes(type)) return;

      const gj = layer.toGeoJSON();
      const geometry = gj.geometry;

      let lat, lng;
      if (type === "marker") {
        const c = layer.getLatLng();
        lat = c.lat;
        lng = c.lng;
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

  // GeoJSON import panel
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

        {/* Panes for z-index priority */}
        <Pane name="facilities-polys" style={{ zIndex: 410 }} />
        <Pane name="facilities-centroids" style={{ zIndex: 420 }} />
        <Pane name="facilities-markers" style={{ zIndex: 430 }} />

        <ViewportWatcher onBboxChange={setBbox} />
        <MapFlyer target={navTarget} />

        {/* Org markers (checkbox'lar) */}
        {visibleMarkers.map((n) => (
          <Marker key={n.key} position={n.pos}>
            <Popup>{n.title}</Popup>
          </Marker>
        ))}

        {/* Facilities — polygons */}
        {showPolys && facilitiesFC.features.length > 0 && (
          <GeoJSON
            key={`${selectedOrgId}|${bbox}|${facilitiesFC.features.length}`} // ⬅️ qo‘shildi
            data={facilitiesFC}
            style={polyStyle}
            onEachFeature={onEachFacilityFeature}
            pane="facilities-polys"
            ref={geoJsonRef}
          />
        )}

        {/* Poligon markazidagi badge iconlar */}
        {showPolys && polygonCentroidMarkers}

        {/* Facilities — fallback point markers (faqat geometry yo‘q bo‘lsa) */}
        {facilities.map((f) => {
          const hasPoly = !!(
            f.geometry &&
            f.geometry.type &&
            f.geometry.type !== "Point"
          );
          if (hasPoly) return null; // poligon bor — markaz badge bor, dublikat kerak emas
          const lat = Number.isFinite(f.lat)
            ? f.lat
            : f.geometry?.type === "Point"
            ? f.geometry.coordinates[1]
            : null;
          const lng = Number.isFinite(f.lng)
            ? f.lng
            : f.geometry?.type === "Point"
            ? f.geometry.coordinates[0]
            : null;
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          return (
            <Marker
              key={`f-${f.id}`}
              position={[lat, lng]}
              icon={badgeIconFor(f.type, 28)} // endi nuqta emas, badge qo‘yamiz
              pane="facilities-markers"
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
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Draw (chizish) */}
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

      {/* Org tree — overlay (qidiruv + filter + polys toggle) */}
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
          ✔ poligonlar turlarga ko‘ra ranglanadi · markazida ikon ko‘rinadi
          {bbox && (
            <div style={{ marginTop: 4, opacity: 0.8 }}>BBOX: {bbox}</div>
          )}
        </div>

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

          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <input
              id="show-polys"
              type="checkbox"
              checked={showPolys}
              onChange={(e) => setShowPolys(e.target.checked)}
            />
            <label htmlFor="show-polys" style={{ fontSize: 13 }}>
              Show polygons
            </label>
          </div>

          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
            {selectedOrgId ? `Org #${selectedOrgId}` : "Org tanlang"} • Topildi:{" "}
            {facilities.length}
          </div>
        </div>
      </div>

      {/* Create Facility Drawer (chizilganda) — avvalgidek */}
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
                Odatda tree tanlovi bilan avtomatik to‘ladi.
              </div>
            </div>

            <div className="fd-field">
              <label>Nomi</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Masalan: Tovuqxona A"
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
