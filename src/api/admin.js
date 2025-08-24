// src/api/admin.js
import { httpGet, httpPost } from "./http";

export async function getOnlineCount() {
  return httpGet("/auth/online-count");
}

export async function listSessions() {
  return httpGet("/auth/sessions");
}

export async function revokeAllForUser(userId) {
  return httpPost(`/auth/sessions/revoke/${userId}`);
}
