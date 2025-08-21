const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";

function authHeaders() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function http(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text || `HTTP ${res.status}` };
    }
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json().catch(() => null);
}

/** LIST */
export async function fetchFacilities({ orgId, types, bbox, q } = {}) {
  const qs = new URLSearchParams();
  if (orgId != null) qs.set("orgId", String(orgId));
  if (Array.isArray(types) && types.length) qs.set("types", types.join(","));
  if (bbox) qs.set("bbox", bbox);
  if (q && q.trim()) qs.set("q", q.trim());
  return http(`/facilities?${qs.toString()}`);
}

/** alias (old code compatibility) */
export const listFacilities = fetchFacilities;

/** CREATE */
export const createFacility = (payload) =>
  http("/facilities", { method: "POST", body: payload });

/** PATCH (partial update) */
export const patchFacility = (id, patch) =>
  http(`/facilities/${id}`, { method: "PATCH", body: patch });

/** DELETE */
export const deleteFacility = (id) =>
  http(`/facilities/${id}`, { method: "DELETE" });
