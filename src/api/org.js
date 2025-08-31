// src/api/org.js
import { api, httpGet } from "./http";

// ======================== TREE ========================
/** Org strukturani daraxt ko‘rinishida olish */
export const getOrgTree = async () => (await api.get("/orgs/tree")).data;

// ======================== GET ========================
/** ID bo‘yicha org (batafsil DTO) */
export const getOrg = async (id) => (await api.get(`/orgs/${id}`)).data;

/** ID bo‘yicha bitta org (soddalashtirilgan DTO, httpGet bilan) */
export async function getOrgUnit(id) {
  return httpGet(`/orgs/${id}`); // OrgDto
}

/** Code bo‘yicha org (asosiy endpoint) */
export async function getOrgByCode(code) {
  return httpGet(`/orgs/by-code/${encodeURIComponent(String(code).trim())}`);
  // OrgDto yoki 403 (agar ruxsat yo‘q bo‘lsa)
}

/** ✅ Map uchun: org + facilities + viewport (ruxsat tekshiriladi) */
export async function locateOrg(code) {
  const params = new URLSearchParams({ code });
  return httpGet(`/orgs/locate?${params.toString()}`); // { org, facilities }
}

// ======================== PAGE / SEARCH ========================
/** Org’larni paginate + qidiruv + sort bilan olish (asosiy page) */
export const listOrgsPage = async ({
  page = 0,
  size = 20,
  q,
  parentId,
  sort = [],
} = {}) => {
  const params = { page, size };
  if (q && q.trim()) params.q = q.trim();
  if (parentId !== undefined && parentId !== null && String(parentId).length) {
    params.parentId = String(parentId);
  }
  if (Array.isArray(sort) && sort.length) params.sort = sort;
  const res = await api.get("/orgs", { params });
  return res.data;
};

/** Qidiruv (sahifalangan) — PageResponse<OrgFlatRes> */
export async function searchOrgUnits({
  q,
  page = 0,
  size = 10,
  sort = "name,asc",
} = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("page", page);
  params.set("size", size);
  params.set("sort", sort);
  return httpGet(`/orgs?${params.toString()}`);
}

/** Batafsil org ma'lumotlari.
 * 1) /orgs/{id}/details ishlamasa (404 yoki ruxsat) -> /orgs/{id} ga fallback.
 * 2) Har ikkisi ham xato bo'lsa undefined.
 */
export async function getOrgDetails(id) {
  try {
    let info = await httpGet(`/orgs/${id}/details`);
    if (info && info.org && typeof info.org === "object") {
      info = { ...info.org, ...info }; // flatten structure
    }
    return info;
  } catch (e) {
    // Fallback: oddiy DTO
    try {
      console.warn(
        "[getOrgDetails] details fallback /orgs/:id =>",
        id,
        e?.message
      );
      let base = await httpGet(`/orgs/${id}`);
      if (base && base.org && typeof base.org === "object") {
        base = { ...base.org, ...base };
      }
      return base;
    } catch (e2) {
      console.warn(
        "[getOrgDetails] fallback ham muvaffaqiyatsiz",
        id,
        e2?.message
      );
      return undefined;
    }
  }
}

// ======================== CRUD ========================
export const createOrg = async (payload) =>
  (await api.post("/orgs", payload)).data;

export const updateOrg = async (id, payload) =>
  (await api.patch(`/orgs/${id}`, payload)).data;

export const moveOrg = async (id, payload) =>
  (await api.patch(`/orgs/${id}/move`, payload)).data;

export const deleteOrg = async (id) => (await api.delete(`/orgs/${id}`)).data;
