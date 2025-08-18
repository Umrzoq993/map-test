import { api } from "./http";
export const fetchOrgTree = async () => (await api.get("/api/org/tree")).data;
