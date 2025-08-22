// src/api/facilities.js
const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

/** Authorization header from localStorage (if any) */
function authHeaders() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** Low-level HTTP helper (adds /api prefix for relative paths) */
async function http(path, { method = "GET", body, headers, query } = {}) {
  const isAbs = /^https?:\/\//i.test(path);
  let url = isAbs
    ? path
    : `${BASE.replace(/\/$/, "")}/api${path.startsWith("/") ? "" : "/"}${path}`;
  if (query && typeof query === "object") {
    const sp = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      if (Array.isArray(v)) v.forEach((x) => sp.append(k, x));
      else sp.append(k, String(v));
    });
    const qs = sp.toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const t = await res.text();
      if (t) msg += `: ${t}`;
    } catch {}
    throw new Error(msg);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

/* ------------------------------ Normalizers ------------------------------ */
function normalizeFacility(x) {
  if (!x) return null;
  return {
    id: x.id,
    orgId: x.orgId,
    orgName: x.orgName,
    name: x.name,
    type: x.type,
    status: x.status,
    lat: x.lat,
    lng: x.lng,
    zoom: x.zoom ?? null,
    attributes: x.attributes ?? {},
    geometry: x.geometry ?? null,
    createdAt: x.createdAt,
    updatedAt: x.updatedAt,
  };
}

function normalizeList(list) {
  if (Array.isArray(list)) return list.map(normalizeFacility);
  if (list && Array.isArray(list.content))
    return list.content.map(normalizeFacility);
  return [];
}

function withAttributes(obj = {}) {
  const o = { ...(obj || {}) };
  if (!o.attributes || typeof o.attributes !== "object") o.attributes = {};
  return o;
}

/* --------------------------------- READ --------------------------------- */
/** Paged list (PageResponse yoki array qaytishi mumkin) */
export async function listFacilitiesPage(params = {}) {
  const query = {};
  if (params.orgId != null) query.orgId = params.orgId;
  if (params.q) query.q = params.q;
  if (params.status) query.status = params.status;
  if (params.types)
    query.types = Array.isArray(params.types)
      ? params.types.join(",")
      : String(params.types);
  if (params.bbox) query.bbox = params.bbox;
  if (params.page != null) query.page = params.page;
  if (params.size != null) query.size = params.size;
  if (params.sort) {
    const s = Array.isArray(params.sort) ? params.sort : [params.sort];
    query.sort = s; // ko'p martalik sort param uchun
  }
  return http("/facilities", { query });
}

/** Barcha sahifalarni to‘plab qaytaradi */
export async function listFacilitiesAll(params = {}, opts = {}) {
  const size = opts.size ?? 500;
  const maxPages = opts.maxPages ?? 50;
  let page = 0;
  let out = [];

  while (page < maxPages) {
    const pageRes = await listFacilitiesPage({ ...params, page, size });

    // Agar server array qaytarsa — paging yo‘q, shu bilan tugaydi
    if (Array.isArray(pageRes)) {
      out = out.concat(normalizeList(pageRes));
      break;
    }

    const items = normalizeList(pageRes);
    out = out.concat(items);

    const isLast =
      pageRes?.last === true ||
      (typeof pageRes?.totalPages === "number" &&
        page >= pageRes.totalPages - 1) ||
      items.length < size;

    if (isLast) break;
    page += 1;
  }
  return out;
}

/** Orqaga mos kelish: listFacilities -> all-in-one */
export async function listFacilities(params = {}, opts = {}) {
  return listFacilitiesAll(params, opts);
}

/** Bitta obyekt */
export async function getFacility(id) {
  const data = await http(`/facilities/${id}`);
  return normalizeFacility(data);
}

/* --------------------------------- WRITE -------------------------------- */
export async function createFacility(payload) {
  const body = withAttributes(payload);
  const data = await http("/facilities", { method: "POST", body });
  return normalizeFacility(data);
}

export async function patchFacility(id, partial) {
  const body = withAttributes(partial);
  const data = await http(`/facilities/${id}`, { method: "PATCH", body });
  return normalizeFacility(data);
}

export async function putFacility(id, full) {
  const body = withAttributes(full);
  const data = await http(`/facilities/${id}`, { method: "PUT", body });
  return normalizeFacility(data);
}

export async function deleteFacility(id) {
  return http(`/facilities/${id}`, { method: "DELETE" });
}
