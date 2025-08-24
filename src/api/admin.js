// src/api/admin.js
import { httpGet, httpPost } from "./http";
import { me, getDeviceId } from "./auth";

/** Online count (fallback 0 agar endpoint bo'lmasa) */
export async function getOnlineCount() {
  try {
    return await httpGet("/auth/online-count");
  } catch {
    return { online: 0 };
  }
}

/**
 * Sessions ro'yxati (admin ko‘rish uchun).
 * Agar backend `/auth/sessions` principal asosida qaytarsa — parametrsiz ishlaydi.
 * Aks holda, `userId` bilan chaqiramiz.
 */
export async function listSessions(opts = {}) {
  const {
    userId: userIdIn,
    includeRevoked = false,
    includeExpired = false,
  } = opts || {};

  // Avval parametrsiz urinamiz (principal-based)
  try {
    const params = { includeRevoked, includeExpired };
    const arr = await httpGet("/auth/sessions", params);
    const u = await me().catch(() => null);
    const username = u?.username || u?.login || u?.email || null;
    const userId = u?.id ?? null;
    return normalizeSessions(arr, { userId, username });
  } catch {
    // Agar parametrsiz ishlamasa, me() orqali userId aniqlaymiz yoki opts.userId dan olamiz
    const u = await me().catch(() => null);
    const userId = userIdIn ?? u?.id ?? null;
    const params = { userId, includeRevoked, includeExpired };
    const arr = await httpGet("/auth/sessions", params);
    const username = u?.username || u?.login || u?.email || null;
    return normalizeSessions(arr, { userId, username });
  }
}

function normalizeSessions(arr, { userId, username }) {
  return (arr || []).map((s, i) => ({
    id: i + 1,
    username,
    userId,
    deviceId: s.deviceId,
    ip: s.ip,
    userAgent: s.userAgent,
    createdAt: s.createdAt,
    lastSeenAt: s.lastSeenAt,
    expiresAt: s.expiresAt,
    revoked: s.revoked,
    tokenSuffix: s.tokenSuffix,
  }));
}

/** Bitta device sessiyasini bekor qilish */
export async function revokeDevice(userIdParam, deviceId) {
  const user = await me().catch(() => null);
  const userId = userIdParam ?? user?.id;
  const qs = new URLSearchParams({
    userId: String(userId),
    deviceId,
  }).toString();
  // Backend: POST /auth/sessions/revoke?userId=...&deviceId=...
  return httpPost(`/auth/sessions/revoke?${qs}`, {});
}

/** Joriy foydalanuvchi uchun: boshqalarning sessiyalarini revoke qilish (o'zingizni saqlab) */
export async function revokeAllForUser(userIdParam) {
  const u = await me().catch(() => null);
  const userId = userIdParam ?? u?.id;
  const keepDeviceId = getDeviceId();
  const qs = new URLSearchParams({
    userId: String(userId),
    keepDeviceId,
  }).toString();
  // Backend: POST /auth/sessions/revoke-others?userId=...&keepDeviceId=...
  return httpPost(`/auth/sessions/revoke-others?${qs}`, {});
}

/**
 * Audit log ro'yxati (paging).
 * opts: { page=0, size=20, userId, deviceId, event, from, to, sort="ts,desc" }
 * Backendda /api/admin/audit (yoki /auth/audit) bo‘lishi kutiladi.
 */
export async function listAudit(opts = {}) {
  const {
    page = 0,
    size = 20,
    userId,
    deviceId,
    event,
    from,
    to,
    sort = "ts,desc",
  } = opts;

  const params = { page, size, sort };
  if (userId != null) params.userId = userId;
  if (deviceId) params.deviceId = deviceId;
  if (event) params.event = event;
  if (from) params.from = from; // ISO/`YYYY-MM-DDTHH:mm`
  if (to) params.to = to;

  // Backend endpoint nomi loyiha bo‘yicha farq qilsa, shu yerda moslashtirasiz:
  const res = await httpGet("/admin/audit", params);
  // Kutiladigan format: { content, page, size, total }
  const content = Array.isArray(res?.content) ? res.content : [];
  return {
    content: content.map((a) => ({
      id: a.id,
      event: a.event,
      username: a.username ?? a.user?.username ?? null,
      userId: a.userId ?? a.user?.id ?? null,
      deviceId: a.deviceId,
      ip: a.ip,
      userAgent: a.userAgent,
      ts: a.ts,
    })),
    page: res?.page ?? page,
    size: res?.size ?? size,
    total: res?.total ?? content.length,
  };
}
