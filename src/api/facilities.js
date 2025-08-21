// src/api/facilities.js
const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

function authHeaders() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function http(path, { method = "GET", body, headers } = {}) {
  // ❗️FIX: Har doim BASE + /api prefiksi qo‘shamiz (agar path absolute URL bo‘lmasa)
  const url = path.startsWith("http")
    ? path
    : `${BASE}/api${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text || `HTTP ${res.status}` };
    }
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

/** ----- Helpers: normalize / denormalize ----- **/
function normalizeFacility(row) {
  if (!row || typeof row !== "object") return row;
  const attributes = row.attributes ?? row.details ?? null;
  return { ...row, attributes, details: attributes };
}
function normalizeList(list) {
  return Array.isArray(list) ? list.map(normalizeFacility) : [];
}
function withAttributes(body) {
  if (!body || typeof body !== "object") return body;
  const { details, attributes, ...rest } = body;
  const mergedAttr =
    attributes != null ? attributes : details != null ? details : undefined;
  return mergedAttr === undefined ? rest : { ...rest, attributes: mergedAttr };
}

/** ----- LIST ----- **/
export async function listFacilities({ orgId, types, bbox, status, q } = {}) {
  const qs = new URLSearchParams();
  if (orgId != null) qs.set("orgId", String(orgId));
  if (Array.isArray(types) && types.length) qs.set("types", types.join(","));
  if (bbox) qs.set("bbox", bbox);
  if (status) qs.set("status", status);
  if (q) qs.set("q", q);

  // Bu yerda "/facilities" yoki "facilities" – ikkalasi ham ishlaydi
  const data = await http(`/facilities?${qs.toString()}`);
  return normalizeList(data);
}

/** ----- CREATE ----- **/
export async function createFacility(payload) {
  const body = withAttributes(payload);
  const data = await http(`/facilities`, { method: "POST", body });
  return normalizeFacility(data);
}

/** ----- PATCH ----- **/
export async function patchFacility(id, patch) {
  const body = withAttributes(patch);
  const data = await http(`/facilities/${id}`, { method: "PATCH", body });
  return normalizeFacility(data);
}

/** ----- PUT (ixtiyoriy) ----- **/
export async function putFacility(id, full) {
  const body = withAttributes(full);
  const data = await http(`/facilities/${id}`, { method: "PUT", body });
  return normalizeFacility(data);
}

/** ----- DELETE ----- **/
export async function deleteFacility(id) {
  return http(`/facilities/${id}`, { method: "DELETE" });
}
