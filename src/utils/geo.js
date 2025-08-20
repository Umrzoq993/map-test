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
