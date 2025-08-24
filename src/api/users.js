// src/api/users.js
import { httpGet, httpPost, httpPatch } from "./http";

export async function searchUsers(params = {}) {
  return httpGet("/admin/users", params);
}

export async function createUser(body) {
  return httpPost("/admin/users", body);
}

export async function updateUser(id, body) {
  return httpPatch(`/admin/users/${id}`, body);
}

export async function changeUserStatus(id, status) {
  return httpPost(`/admin/users/${id}/status`, { status });
}

export async function moveUser(id, { orgId, department }) {
  return httpPost(`/admin/users/${id}/move`, { orgId, department });
}

export async function resetUserPassword(id) {
  return httpPost(`/admin/users/${id}/reset-password`, {});
}
