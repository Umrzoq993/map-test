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

/** Server-side pagination bilan obyektlar ro'yxati */
export async function listFacilitiesPage(opts = {}) {
  const {
    orgId,
    q,
    status,
    type,
    types,
    bbox,
    page = 0,
    size = 10,
    sort,
  } = opts;

  const params = new URLSearchParams();

  if (orgId != null) params.set("orgId", String(orgId));
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (type) params.set("type", type);
  if (types)
    params.set("types", Array.isArray(types) ? types.join(",") : String(types));
  if (bbox) params.set("bbox", bbox);

  params.set("page", String(page));
  params.set("size", String(size));

  if (Array.isArray(sort)) sort.forEach((s) => params.append("sort", s));
  else if (sort) params.set("sort", sort);

  const { data } = await api.get(`/facilities?${params.toString()}`);
  // backend: { content, page, size, totalElements, totalPages, last }
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
