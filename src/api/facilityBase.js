// src/api/facilityBase.js
import { api } from "./http";

/**
 * General helpers for per-type modules
 */

// List by type (serverdagi umumiy /api/facilities ni ishlatadi)
export async function listByType(type, params = {}) {
  const q = new URLSearchParams();
  q.set("types", type);
  if (params.orgId != null) q.set("orgId", String(params.orgId));
  if (params.q) q.set("q", params.q);
  // bbox bo'lsa "minLng,minLat,maxLng,maxLat"
  if (params.bbox) q.set("bbox", params.bbox);

  const res = await api.get(`/api/facilities?${q.toString()}`);
  return res.data;
}

// Create with forced type
export async function createWithType(type, payload) {
  const body = { ...payload, type };
  const res = await api.post("/api/facilities", body);
  return res.data;
}

// Update all fields (PUT)
export async function putOne(id, payload) {
  const res = await api.put(`/api/facilities/${id}`, payload);
  return res.data;
}

// Partial update (PATCH)
export async function patchOne(id, patch) {
  const res = await api.patch(`/api/facilities/${id}`, patch);
  return res.data;
}

// Delete
export async function removeOne(id) {
  const res = await api.delete(`/api/facilities/${id}`);
  return res.data;
}
