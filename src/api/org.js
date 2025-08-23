// src/api/org.js
import { api } from "./http";

// TREE (parent select uchun)
export const getOrgTree = async () => (await api.get("/api/orgs/tree")).data;

// PAGE (server-side pagination + sort + search)
export const listOrgsPage = async ({
  page = 0,
  size = 20,
  q,
  parentId,
  sort = [],
} = {}) => {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("size", String(size));
  if (q && q.trim()) p.set("q", q.trim());
  if (parentId !== undefined && parentId !== null && String(parentId).length) {
    p.set("parentId", String(parentId));
  }
  if (Array.isArray(sort) && sort.length) {
    sort.filter(Boolean).forEach((s) => p.append("sort", String(s).trim())); // => ?sort=...&sort=...
  }
  const res = await api.get("/api/orgs", { params: p });
  return res.data;
};

export const createOrg = async (payload) =>
  (await api.post("/api/orgs", payload)).data;

export const updateOrg = async (id, payload) =>
  (await api.patch(`/api/orgs/${id}`, payload)).data;

export const moveOrg = async (id, payload) =>
  (await api.patch(`/api/orgs/${id}/move`, payload)).data;

export const deleteOrg = async (id) =>
  (await api.delete(`/api/orgs/${id}`)).data;

export const locateByOrgCode = async (code) =>
  (await api.get("/api/orgs/locate", { params: { code } })).data;
