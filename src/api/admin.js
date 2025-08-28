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
 * Sessions ro'yxati – SERVER PAGINATION ham, eski massiv format ham qo‘llanadi.
 * opts: { userId, includeRevoked=false, includeExpired=false, page=0, size=10, sort="lastSeenAt,desc" }
 * Endpoint: /api/auth/sessions
 */
export async function listSessions(opts = {}) {
  const {
    userId,
    includeRevoked = false,
    includeExpired = false,
    page = 0,
    size = 10,
    sort = "lastSeenAt,desc",
  } = opts;

  const params = { includeRevoked, includeExpired, page, size, sort };
  if (userId != null) params.userId = userId;

  const res = await httpGet("/auth/sessions", params);

  // Fallback uchun joriy foydalanuvchi (eski massiv formatda username/userId bo‘lmasligi mumkin)
  let fallbackUserId = userId ?? null;
  let fallbackUsername = null;
  if (fallbackUserId == null) {
    const u = await me().catch(() => null);
    fallbackUserId = u?.id ?? null;
    fallbackUsername = u?.username ?? u?.login ?? u?.email ?? null;
  }

  const isNum = (v) => typeof v === "number" && Number.isFinite(v);

  let contentRaw = [];
  let pageNo = page;
  let pageSize = size;
  let totalAll = 0;
  let totalPages = 1;

  if (Array.isArray(res)) {
    // Eski backend: oddiy massiv
    contentRaw = res;
    totalAll = res.length;
    totalPages = Math.max(1, Math.ceil(totalAll / Math.max(1, pageSize)));
  } else {
    // Yangi backend: PageResponse
    const raw = res || {};
    contentRaw = Array.isArray(raw.content) ? raw.content : [];
    pageNo = isNum(raw.page) ? raw.page : isNum(raw.number) ? raw.number : page;
    pageSize = isNum(raw.size)
      ? raw.size
      : isNum(raw.pageSize)
      ? raw.pageSize
      : size;
    totalAll = isNum(raw.total)
      ? raw.total
      : isNum(raw.totalElements)
      ? raw.totalElements
      : isNum(raw.totalCount)
      ? raw.totalCount
      : contentRaw.length;
    totalPages = isNum(raw.totalPages)
      ? raw.totalPages
      : Math.max(1, Math.ceil(totalAll / Math.max(1, pageSize)));
  }

  const baseIndex = pageNo * pageSize; // № ustuni uchun

  const content = contentRaw.map((s, i) => ({
    id: baseIndex + i + 1,
    deviceId: s.deviceId,
    ip: s.ip,
    userAgent: s.userAgent,
    createdAt: s.createdAt,
    lastSeenAt: s.lastSeenAt,
    expiresAt: s.expiresAt,
    revoked: !!s.revoked,
    tokenSuffix: s.tokenSuffix,
    userId: s.userId ?? fallbackUserId ?? undefined,
    username: s.username ?? fallbackUsername ?? undefined,
  }));

  return {
    content,
    page: pageNo,
    size: pageSize,
    total: totalAll,
    totalPages,
  };
}

/** Bitta device sessiyasini bekor qilish */
export async function revokeDevice(userIdParam, deviceId) {
  const user = await me().catch(() => null);
  const userId = userIdParam ?? user?.id;
  const qs = new URLSearchParams({
    userId: String(userId),
    deviceId,
  }).toString();
  return httpPost(`/auth/sessions/revoke?${qs}`, {});
}

/** Joriy foydalanuvchi uchun: boshqalarning sessiyalarini bekor qilish (o'zingizni saqlab) */
export async function revokeAllForUser(userIdParam) {
  const u = await me().catch(() => null);
  const userId = userIdParam ?? u?.id;
  const keepDeviceId = getDeviceId();
  const qs = new URLSearchParams({
    userId: String(userId),
    keepDeviceId,
  }).toString();
  return httpPost(`/auth/sessions/revoke-others?${qs}`, {});
}

/**
 * Audit log ro'yxati (paging).
 * opts: { page=0, size=20, userId, deviceId, event, from, to, sort="ts,desc" }
 * Endpoint: /api/admin/audit
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
  if (from) params.from = from;
  if (to) params.to = to;

  const res = await httpGet("/admin/audit", params);
  const raw = res || {};
  const isNum = (v) => typeof v === "number" && Number.isFinite(v);

  const contentRaw = Array.isArray(raw.content) ? raw.content : [];
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

  const pageNo = isNum(raw.page) ? raw.page : page;
  const pageSize = isNum(raw.size) ? raw.size : size;
  const totalAll = isNum(raw.total)
    ? raw.total
    : isNum(raw.totalElements)
    ? raw.totalElements
    : content.length;
  const totalPages = isNum(raw.totalPages)
    ? raw.totalPages
    : Math.max(1, Math.ceil(totalAll / Math.max(1, pageSize)));

  return { content, page: pageNo, size: pageSize, total: totalAll, totalPages };
}
