// src/api/drawings.js
import { api } from "./http";

export const getLatestDrawing = async () => {
  const res = await api.get("/drawings/latest");
  return res.status === 204 ? null : res.data;
};

export const saveDrawing = async (geojson, name = "default") => {
  const { data } = await api.post("/drawings", { name, geojson });
  return data;
};

// Optional helper (backend may or may not implement).
// Silently swallows 404 so callers can call without existence check.
export const deleteDrawing = async (name) => {
  try {
    await api.delete(`/drawings/${encodeURIComponent(name)}`);
    return true;
  } catch (e) {
    if (e?.response?.status === 404) return false;
    throw e;
  }
};
