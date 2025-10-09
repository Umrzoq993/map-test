// src/api/facilityTypes.js
import { httpDelete, httpGet, httpPost, httpPut } from "./http";

export async function listActiveFacilityTypes() {
  // Public for authed users
  return httpGet("/facility-types");
}

export async function pageFacilityTypes(params = {}) {
  const { page = 0, size = 20, sort = "sortOrder,asc" } = params;
  const qs = new URLSearchParams({ page, size, sort }).toString();
  return httpGet(`/admin/facility-types?${qs}`);
}

export async function createFacilityTypeDef(body) {
  return httpPost("/admin/facility-types", body);
}

export async function updateFacilityTypeDef(id, body) {
  return httpPut(`/admin/facility-types/${id}`, body);
}

export async function deleteFacilityTypeDef(id) {
  return httpDelete(`/admin/facility-types/${id}`);
}
