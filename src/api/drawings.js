import { api } from "./http";
export const getLatestDrawing = async () => {
  const res = await api.get("/api/drawings/latest");
  return res.status === 204 ? null : res.data;
};
export const saveDrawing = async (geojson, name = "default") =>
  (await api.post("/api/drawings", { name, geojson })).data;
