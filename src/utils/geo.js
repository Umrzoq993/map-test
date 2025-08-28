// src/utils/geo.js
export function centroidOfGeometry(geometry) {
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
    let best = null,
      bestArea = -Infinity;
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
  if (!rings || !rings[0] || rings[0].length < 3) return null;
  const outer = rings[0];
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
    return { lat: (minY + maxY) / 2, lng: (minX + maxX) / 2, area: 0 };
  }
  area *= 0.5;
  cx /= 6 * area;
  cy /= 6 * area;
  return { lat: cy, lng: cx, area: Math.abs(area) };
}

/* ==================== YANGI: Maydon (m²) hisoblash ==================== */
/**
 * GeoJSON Geometry uchun maydon (m²) ni hisoblaydi.
 * - Polygon: tashqi halqa − ichki halqalar (agar bo‘lsa)
 * - MultiPolygon: barcha poligonlar yig‘indisi
 * - Point: 0
 * Eslatma: hisob Web Mercator (EPSG:3857) ga proyeksiya qilib, shoelace bilan.
 */
export function areaOfGeometryM2(geometry) {
  if (!geometry || !geometry.type) return null;

  if (geometry.type === "Point") return 0;

  if (geometry.type === "Polygon") {
    return Math.max(0, polygonAreaM2(geometry.coordinates));
  }

  if (geometry.type === "MultiPolygon") {
    let sum = 0;
    for (const poly of geometry.coordinates || []) {
      sum += Math.max(0, polygonAreaM2(poly));
    }
    return sum;
  }

  return null;
}

function polygonAreaM2(rings) {
  if (!Array.isArray(rings) || rings.length === 0) return 0;
  const outer = rings[0];
  let area = Math.abs(ringAreaM2(outer));
  // Ichki halqalarni ayiramiz (holes)
  for (let i = 1; i < rings.length; i++) {
    area -= Math.abs(ringAreaM2(rings[i]));
  }
  return area;
}

function ringAreaM2(coords) {
  // coords: [[lng,lat], ...]
  if (!Array.isArray(coords) || coords.length < 3) return 0;
  const pts = coords.map(([lng, lat]) => projectWebMercator(lng, lat));
  let sum = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const p1 = pts[j];
    const p2 = pts[i];
    sum += p1.x * p2.y - p2.x * p1.y;
  }
  return Math.abs(sum) / 2; // m²
}

function projectWebMercator(lng, lat) {
  // EPSG:3857 (Spherical Mercator) — natija: metr
  const R = 6378137.0;
  const d2r = Math.PI / 180;
  const x = R * lng * d2r;
  const y = R * Math.log(Math.tan(Math.PI / 4 + (lat * d2r) / 2));
  return { x, y };
}
