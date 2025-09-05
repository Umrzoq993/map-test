// Central API error -> user friendly message mapper
// Usage: import { mapApiError } from '../utils/apiErrors'; const msg = mapApiError(err, 'Saqlashda xatolik');
import { debugWarn } from "./../utils/debug";

export function extractStatus(err) {
  return err?.response?.status || null;
}

export function extractCode(err) {
  return err?.response?.data?.code || err?.data?.code || null;
}

const CODE_MESSAGES = {
  REFRESH_REPLAY: "Sessiya kolliziyasi (replay). Qayta kiring.",
  SESSION_REVOKED: "Sessiya bekor qilingan.",
  REFRESH_EXPIRED: "Sessiya muddati tugadi.",
  REFRESH_INVALID: "Sessiya yaroqsiz.",
};

export function mapApiError(err, fallback = "Xatolik") {
  if (!err) return fallback;
  const st = extractStatus(err);
  const code = extractCode(err);
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];
  switch (st) {
    case 400:
      return "Noto'g'ri so'rov (400)";
    case 401:
      return "Avtorizatsiya talab etiladi (401)";
    case 403:
      return "Ruxsat yo'q (403)";
    case 404:
      return "Topilmadi (404)";
    case 409:
      return "Konflikt (409)";
    case 413:
      return "Juda katta fayl (413)";
    case 415:
      return "Qo'llab-quvvatlanmaydigan format (415)";
    case 429:
      return "Ko'p so'rov (429)";
    case 500:
      return "Server xatosi (500)";
    default:
      if (err?.code === "ERR_NETWORK") return "Tarmoq xatosi";
      break;
  }
  debugWarn("[apiErrors] Unmapped error", st, code);
  return fallback;
}

export function toastApiError(toast, err, fallback) {
  const msg = mapApiError(err, fallback);
  if (msg) toast.error(msg);
}
