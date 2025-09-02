// src/api/facilityImages.js
// API helpers for facility image gallery
// DTO: { id:number, url:string, originalName?:string, contentType:string, sizeBytes:number, createdAt:string }
import { api } from "./http";

// List images for a facility
export async function listFacilityImages(facilityId) {
  if (!facilityId && facilityId !== 0) return [];
  const { data } = await api.get(`/facilities/${facilityId}/images`);
  return Array.isArray(data) ? data : [];
}

// Upload single image file (File|Blob)
export async function uploadFacilityImage(facilityId, file, opts = {}) {
  if (!file) throw new Error("Fayl topilmadi");
  const { onProgress } = opts;
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post(`/facilities/${facilityId}/images`, fd, {
    onUploadProgress: (evt) => {
      if (onProgress && evt?.total) {
        const ratio = evt.loaded / evt.total;
        try {
          onProgress(Math.min(1, Math.max(0, ratio)));
        } catch {}
      }
    },
  }); // boundary ni brauzer o'zi qo'yadi
  return data;
}

// Delete image
export async function deleteFacilityImage(facilityId, imageId) {
  await api.delete(`/facilities/${facilityId}/images/${imageId}`);
  return true;
}

// Helper to build absolute URL for image serving (backend returns relative path like /uploads/facility/123/abc.png)
export function buildImageSrc(relUrl) {
  if (!relUrl) return "";
  try {
    // api.defaults.baseURL may end with /api. Remove trailing /api for static file host.
    const base = (api.defaults?.baseURL || "")
      .replace(/\/$/, "")
      .replace(/\/api$/, "");
    return base + relUrl;
  } catch {
    return relUrl;
  }
}
