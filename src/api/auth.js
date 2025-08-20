import { api } from "./http";

export const login = async (username, password) => {
  const res = await api.post("/api/auth/login", { username, password });
  // backend: { token: "..." }
  return res.data;
};
