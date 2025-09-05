// src/map/orgPopup.js
import L from "leaflet";
import { getOrgDetails } from "../../api/org";
import { sanitizeHTML } from "../../utils/sanitize";
import { TYPE_LABELS, colorForBack } from "../../constants/facilityTypes";
import { debugLog } from "../../utils/debug";
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
      // Sanitizatsiya (escapeHtml ichki chaqiruvlar mavjud, lekin qo'shimcha qatlam sifatida sanitizeHTML())
      popup.setContent(sanitizeHTML(renderHTML(info, org)));
      wireActions(popup.getElement(), { map, info, org, ...opts });
    } catch (err) {
      popup.setContent(sanitizeHTML(errorHTML(err)));
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
  const o0 = info || {};
  const inner =
    (o0.data && typeof o0.data === "object" ? o0.data : null) ||
    (o0.org && typeof o0.org === "object" ? o0.org : null);
  const o = inner ? { ...inner, ...o0 } : o0;
  try {
    if (
      typeof window !== "undefined" &&
      window?.localStorage?.getItem("DEBUG_ORG_POPUP") === "1"
    ) {
      debugLog("[OrgPopup] raw=", o0);
      debugLog("[OrgPopup] flattened=", o);
    }
  } catch {}
  const name = o.name ?? fallbackOrg?.name ?? "Bo‘lim";
  // Tur / Parent talab bo'yicha ko'rsatilmaydi
  const lat = asNum(o.lat ?? o.latitude ?? fallbackOrg?.lat);
  const lng = asNum(o.lng ?? o.longitude ?? fallbackOrg?.lng);
  const zoom = asNum(o.zoom ?? fallbackOrg?.zoom) ?? 14;
  const status = o.status ?? o.state ?? o.lifeCycleState ?? "Active";

  // const childrenCountRaw = (removed unused)
  o.childrenCount ??
    o.childCount ??
    o.childsCount ??
    (Array.isArray(o.children) ? o.children.length : undefined);
  const facilitiesCountRaw =
    o.facilitiesCount ??
    o.facilityCount ??
    o.sitesCount ??
    o.objectsCount ??
    (Array.isArray(o.facilities) ? o.facilities.length : undefined) ??
    (Array.isArray(o.sites) ? o.sites.length : undefined);
  // const childrenCount = numOrDash(childrenCountRaw); // removed unused variable (kept logic for potential future use)
  const facilitiesCount = numOrDash(facilitiesCountRaw);
  // Tushum / Sof foyda / Manzil / Mas'ul / Tel talab bo'yicha olib tashlangan

  // Breadcrumb (parent zanjiri)
  const breadcrumb = Array.isArray(o.breadcrumb) ? o.breadcrumb : o0.breadcrumb;
  const crumbHtml = Array.isArray(breadcrumb)
    ? breadcrumb
        .map((c, i) => {
          const last = i === breadcrumb.length - 1;
          return `<span class="crumb${last ? " current" : ""}">${escapeHtml(
            c.name || c.code || String(c.id)
          )}</span>`;
        })
        .join('<span class="crumb-sep">›</span>')
    : "";

  // Type distribution (stats.byType)
  const byType = (o.stats && o.stats.byType) || o.byType || {};
  const typeItems = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .map(([t, cnt]) => {
      const label =
        TYPE_LABELS[t] ||
        t
          .toLowerCase()
          .replace(/_/g, " ")
          .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
      const col = colorForBack(t);
      return `<div class="dist-item" title="${escapeHtml(
        label
      )}"><span class="sw" style="background:${col}"></span><b>${escapeHtml(
        label
      )}</b><em>${cnt}</em></div>`;
    })
    .join("");

  // Status distribution
  const byStatus = (o.stats && o.stats.byStatus) || o.byStatus || {};
  const statusItems = Object.entries(byStatus)
    .sort((a, b) => b[1] - a[1])
    .map(([st, cnt]) => {
      const pill = statusPill(st);
      const nice = st
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
      return `<div class="status-item ${pill}"><span>${escapeHtml(
        nice
      )}</span><b>${cnt}</b></div>`;
    })
    .join("");

  // Siblings (navigation)
  const siblings = Array.isArray(o.siblings) ? o.siblings : o0.siblings;
  const sibHtml = Array.isArray(siblings)
    ? siblings
        .filter((s) => s.id !== o.id)
        .slice(0, 6)
        .map(
          (s) =>
            `<button class="sib" data-sib-id="${s.id}" data-sib-lat="${
              s.lat ?? ""
            }" data-sib-lng="${s.lng ?? ""}" data-sib-zoom="${
              s.zoom ?? ""
            }">${escapeHtml(s.name || s.code || String(s.id))}</button>`
        )
        .join("")
    : "";

  const objectsTotal =
    (o.stats && Number.isFinite(o.stats.total) && o.stats.total) ||
    (Array.isArray(o.facilities) ? o.facilities.length : facilitiesCountRaw) ||
    facilitiesCount;

  return `
  <div class="orgp" data-id="${o.id ?? fallbackOrg?.id}">
    <div class="orgp__head">
      <div class="orgp__titleLine">
        <span class="pill ${statusPill(status)}">${escapeHtml(status)}</span>
        <b class="orgp__name">${escapeHtml(name)}</b>
      </div>
      <div class="orgp__crumbs">${crumbHtml}</div>
    </div>

    <div class="orgp__quick">
      <div class="q-item"><span class="lbl">Kod</span><b>${escapeHtml(
        o.code ?? "—"
      )}</b></div>
      <div class="q-item"><span class="lbl">Lokatsiya</span><b>${lat ?? "—"}, ${
    lng ?? "—"
  } (z${zoom})</b></div>
      <div class="q-item"><span class="lbl">Inshootlar</span><b>${objectsTotal}</b></div>
    </div>

    ${
      typeItems && typeItems.length
        ? `<div class="orgp__dist"><div class="dist-head">Turlar</div><div class="dist-list">${typeItems}</div></div>`
        : ""
    }
    ${
      statusItems && statusItems.length
        ? `<div class="orgp__statuses">${statusItems}</div>`
        : ""
    }

    ${
      sibHtml
        ? `<div class="orgp__siblings"><span class="lbl">Boshqa bo‘limlar:</span>${sibHtml}</div>`
        : ""
    }

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
