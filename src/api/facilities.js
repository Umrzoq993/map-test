import { api } from "./http";

export const fetchFacilities = async (params = {}) => {
  const { types, ...rest } = params;
  const qp = { ...rest };
  if (types && types.length > 0) qp.types = types.join(",");
  const res = await api.get("/api/facilities", { params: qp });
  return res.data;
};

export const getFacility = async (id) =>
  (await api.get(`/api/facilities/${id}`)).data;

export const createFacility = async (payload) =>
  (await api.post("/api/facilities", payload)).data;

export const putFacility = async (id, payload) =>
  (await api.put(`/api/facilities/${id}`, payload)).data;

export const patchFacility = async (id, payload) =>
  (await api.patch(`/api/facilities/${id}`, payload)).data;

export const deleteFacility = async (id) =>
  (await api.delete(`/api/facilities/${id}`)).data;
