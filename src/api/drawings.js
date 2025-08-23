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
