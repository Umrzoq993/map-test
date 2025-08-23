// src/api/org.js
import { api } from "./http";

// TREE
export const getOrgTree = async () => (await api.get("/orgs/tree")).data;

// GET by id
export const getOrg = async (id) => (await api.get(`/orgs/${id}`)).data;

// GET by code
export const getOrgByCode = async (code) =>
  (await api.get(`/orgs/by-code/${encodeURIComponent(String(code).trim())}`))
    .data;

// PAGE (search/sort)
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

export const createOrg = async (payload) =>
  (await api.post("/orgs", payload)).data;

export const updateOrg = async (id, payload) =>
  (await api.patch(`/orgs/${id}`, payload)).data;

export const moveOrg = async (id, payload) =>
  (await api.patch(`/orgs/${id}/move`, payload)).data;

export const deleteOrg = async (id) => (await api.delete(`/orgs/${id}`)).data;
