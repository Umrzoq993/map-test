// Centralized HTML sanitizer to prevent XSS when inserting any rich HTML (e.g. map popups)
// Usage: import { sanitizeHTML } from './utils/sanitize'; element.innerHTML = sanitizeHTML(userHtml)
// Library DOMPurify is dynamically imported to keep bundle slim if unused.

let purifyPromise = null;

async function getPurify() {
  if (!purifyPromise) {
    purifyPromise = import("dompurify").then((m) => m.default || m);
  }
  return purifyPromise;
}

export function sanitizeHTMLSync(html) {
  // Fallback very small sync escape (no complex policy) while async lib loads.
  if (html == null) return "";
  return String(html)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sanitizeHTML(html, opts) {
  if (html == null) return "";
  try {
    const purify = await getPurify();
    return purify.sanitize(html, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ["target", "rel"],
      ...opts,
    });
  } catch (e) {
    return sanitizeHTMLSync(html);
  }
}

// Convenience: escape only (no tags allowed)
export function escapeHTML(html) {
  return sanitizeHTMLSync(html);
}
