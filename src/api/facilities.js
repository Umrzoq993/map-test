// src/api/facilities.js
import { api } from "./http";

/* Normalizers */
function normalizeFacility(x) {
  if (!x) return null;
  return {
    id: x.id,
    orgId: x.orgId,
    orgName: x.orgName,
    name: x.name,
    type: x.type,
    status: x.status,
    lat: x.lat,
    lng: x.lng,
    zoom: x.zoom ?? null,
    attributes: x.attributes ?? {},
    geometry: x.geometry ?? null,
    createdAt: x.createdAt,
    updatedAt: x.updatedAt,
  };
}
function normalizeList(list) {
  if (Array.isArray(list)) return list.map(normalizeFacility);
  if (list && Array.isArray(list.content))
    return list.content.map(normalizeFacility);
  return [];
}
function withAttributes(obj = {}) {
  const o = { ...(obj || {}) };
  if (!o.attributes || typeof o.attributes !== "object") o.attributes = {};
  return o;
}

/* READ (page) */
export async function listFacilitiesPage(opts = {}) {
  const { orgId, q, status, type, types, bbox, page, size, sort } = opts;

  const params = {
    orgId,
    q,
    status,
    bbox,
    page,
    size,
  };
  if (type) params.type = type;
  if (types)
    params.types = Array.isArray(types) ? types.join(",") : String(types);
  if (Array.isArray(sort)) params.sort = sort;

  const { data } = await api.get("/facilities", { params });
  return data;
}

/* READ (all pages merge) */
export async function listFacilities(params = {}, mergeOpts = {}) {
  const size = mergeOpts.size ?? 500;
  const maxPages = mergeOpts.maxPages ?? 50;
  let page = 0;
  let out = [];
  while (page < maxPages) {
    const pageRes = await listFacilitiesPage({ ...params, page, size });
    const items = normalizeList(pageRes);
    out = out.concat(items);
    const isLast =
      pageRes?.last === true ||
      (typeof pageRes?.totalPages === "number" &&
        page >= pageRes.totalPages - 1) ||
      items.length < size;
    if (isLast) break;
    page += 1;
  }
  return out;
}

export async function getFacility(id) {
  const { data } = await api.get(`/facilities/${id}`);
  return normalizeFacility(data);
}

/* WRITE */
export async function createFacility(payload) {
  const { data } = await api.post("/facilities", withAttributes(payload));
  return normalizeFacility(data);
}
export async function patchFacility(id, partial) {
  const { data } = await api.patch(
    `/facilities/${id}`,
    withAttributes(partial)
  );
  return normalizeFacility(data);
}
export async function putFacility(id, full) {
  const { data } = await api.put(`/facilities/${id}`, withAttributes(full));
  return normalizeFacility(data);
}
export async function deleteFacility(id) {
  const { data } = await api.delete(`/facilities/${id}`);
  return data;
}
