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
 * opts: { page=0, size=10, userId, deviceId, event, from, to, sort="ts,desc" }
 * Backend: GET /api/admin/audit  → PageResponse<AuditRes>
 * { content, page, size, totalElements, totalPages, last }
 */
export async function listAudit(opts = {}) {
  const {
    page = 0,
    size = 10, // UI defaultiga mos
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
  if (from) params.from = from; // ISO
  if (to) params.to = to;

  // ⚠️ Backend controller yo‘li:
  const raw = await httpGet("/admin/audit", params);

  // Backend PageResponse’ni UI shape’ga map qilish
  const contentRaw = Array.isArray(raw?.content)
    ? raw.content
    : Array.isArray(raw?.items)
    ? raw.items
    : [];

  const content = contentRaw.map((a) => ({
    id: a.id,
    event: a.event,
    username: a.username ?? a.user?.username ?? null,
    userId: a.userId ?? a.user?.id ?? null,
    deviceId: a.deviceId,
    ip: a.ip,
    userAgent: a.userAgent,
    ts: a.ts,
  }));

  const pageNo = Number.isFinite(raw?.page)
    ? raw.page
    : Number.isFinite(raw?.number)
    ? raw.number
    : page;

  const pageSize = Number.isFinite(raw?.size)
    ? raw.size
    : Number.isFinite(raw?.pageSize)
    ? raw.pageSize
    : size;

  // ✅ MUHIM: totalElements → total
  const totalAll = Number.isFinite(raw?.totalElements)
    ? raw.totalElements
    : Number.isFinite(raw?.total)
    ? raw.total
    : Number.isFinite(raw?.totalCount)
    ? raw.totalCount
    : contentRaw.length;

  return { content, page: pageNo, size: pageSize, total: totalAll };
}
