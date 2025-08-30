// src/map/orgPopup.js
import L from "leaflet";
import { getOrgDetails } from "../../api/org";
import "../../styles/_org_popup.scss";

/**
 * Markerga boy popup bog'laydi.
 * @param {L.Marker} marker - Leaflet marker
 * @param {{id:number,name:string,lat?:number,lng?:number,zoom?:number}} org - minimal org ma'lumoti
 * @param {{ map?: L.Map, onEdit?:(id:number)=>void, onOpenTable?:(id:number)=>void }} opts
 */
export function attachOrgPopup(marker, org, opts = {}) {
  const map = opts.map || marker._map;

  marker.bindPopup("", {
    className: "org-popup",
    autoPan: true,
    maxWidth: 380,
    offset: [0, -8],
    closeButton: true,
  });

  marker.on("popupopen", async (e) => {
    const popup = e.popup;
    popup.setContent(loadingHTML(org));
    try {
      const info = await getOrgDetails(org.id);
      popup.setContent(renderHTML(info, org));
      wireActions(popup.getElement(), { map, info, org, ...opts });
    } catch (err) {
      popup.setContent(errorHTML(err));
    }
  });
}

/* ---------------- HTML builders ---------------- */

function loadingHTML(org) {
  return `
  <div class="orgp">
    <div class="orgp__title">
      <span class="dot" aria-hidden="true"></span>
      <b>${escapeHtml(org?.name ?? "Bo‘lim")}</b>
    </div>
    <div class="orgp__row skel"></div>
    <div class="orgp__row skel"></div>
    <div class="orgp__row skel" style="width:70%"></div>
    <div class="orgp__actions">
      <button class="btn ghost" disabled>Kutilmoqda…</button>
    </div>
  </div>`;
}

function errorHTML(err) {
  const msg = (
    err?.response?.data?.message ||
    err?.message ||
    "Xatolik"
  ).toString();
  return `
  <div class="orgp">
    <div class="orgp__title"><b>Ma’lumot yuklanmadi</b></div>
    <div class="orgp__error">${escapeHtml(msg)}</div>
  </div>`;
}

function renderHTML(info, fallbackOrg) {
  const o = info || {};
  const name = o.name ?? fallbackOrg?.name ?? "Bo‘lim";
  const type = o.type ?? o.orgType ?? "—";
  const parent = o.parentName ?? o.parent?.name ?? "—";
  const lat = asNum(o.lat ?? fallbackOrg?.lat);
  const lng = asNum(o.lng ?? fallbackOrg?.lng);
  const zoom = asNum(o.zoom ?? fallbackOrg?.zoom) ?? 14;
  const status = o.status ?? o.state ?? "Active";

  const childrenCount = numOrDash(o.childrenCount);
  const facilitiesCount = numOrDash(o.facilitiesCount ?? o.sitesCount);
  const revenue = valOrDash(o.revenue, " so‘m");
  const profit = valOrDash(o.profit, " so‘m");

  const address = o.address ?? "—";
  const manager = o.manager ?? o.head ?? "—";
  const phone = o.phone ?? "—";

  return `
  <div class="orgp" data-id="${o.id ?? fallbackOrg?.id}">
    <div class="orgp__title">
      <span class="pill ${statusPill(status)}">${escapeHtml(status)}</span>
      <b>${escapeHtml(name)}</b>
    </div>

    <div class="orgp__row"><span>Tur</span><b>${escapeHtml(type)}</b></div>
    <div class="orgp__row"><span>Parent</span><b>${escapeHtml(parent)}</b></div>
    <div class="orgp__row"><span>Lokatsiya</span><b>${lat ?? "—"}, ${
    lng ?? "—"
  } (z${zoom})</b></div>

    <div class="orgp__metrics">
      <div><span>Bolalari</span><b>${childrenCount}</b></div>
      <div><span>Inshootlar</span><b>${facilitiesCount}</b></div>
      <div><span>Tushum</span><b>${revenue}</b></div>
      <div><span>Sof foyda</span><b>${profit}</b></div>
    </div>

    <div class="orgp__more">
      <div><span>Manzil</span><b>${escapeHtml(address)}</b></div>
      <div><span>Mas’ul</span><b>${escapeHtml(manager)}</b></div>
      <div><span>Tel</span><b>${escapeHtml(phone)}</b></div>
    </div>

    <div class="orgp__actions">
      <button class="btn ghost" data-act="center">Markazga ol</button>
      <button class="btn" data-act="table">Jadvalda ko‘rish</button>
      <button class="btn primary" data-act="edit">Tahrirlash</button>
    </div>
  </div>`;
}

/* ----------------- actions wiring ----------------- */
function wireActions(rootEl, { map, info, org, onEdit, onOpenTable }) {
  if (!rootEl) return;
  const id = info?.id ?? org?.id;
  const qs = (sel) => rootEl.querySelector(sel);

  const getLatLng = () => {
    const lat = asNum(info?.lat ?? org?.lat);
    const lng = asNum(info?.lng ?? org?.lng);
    return lat != null && lng != null ? [lat, lng] : null;
  };

  qs('[data-act="center"]')?.addEventListener("click", () => {
    const ll = getLatLng();
    const zoom = asNum(info?.zoom ?? org?.zoom) ?? 14;
    if (map && ll) map.setView(ll, zoom, { animate: true });
  });

  qs('[data-act="table"]')?.addEventListener("click", () => {
    if (typeof onOpenTable === "function") onOpenTable(id);
    else
      window.dispatchEvent(
        new CustomEvent("org:open-table", { detail: { id } })
      );
  });

  qs('[data-act="edit"]')?.addEventListener("click", () => {
    if (typeof onEdit === "function") onEdit(id);
    else window.dispatchEvent(new CustomEvent("org:edit", { detail: { id } }));
  });
}

/* ---------------- helpers ---------------- */
function statusPill(s) {
  const v = String(s || "").toLowerCase();
  if (v.includes("inactive") || v.includes("blok")) return "danger";
  if (v.includes("pending")) return "warn";
  return "ok";
}
function numOrDash(n) {
  return Number.isFinite(n) ? n : "—";
}
function valOrDash(v, suffix = "") {
  if (v == null) return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("uz-UZ") + suffix;
}
function asNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
