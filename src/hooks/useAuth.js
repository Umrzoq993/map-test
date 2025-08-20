import { decodeJWT, isAuthenticated } from "../utils/auth";

export function useAuth() {
  const payload = decodeJWT();
  const role = payload?.role || null;
  const username = payload?.sub || payload?.username || null;
  const orgId = payload?.orgId ?? null;

  return {
    isAuthed: isAuthenticated(),
    role,
    isAdmin: role === "ADMIN",
    username,
    orgId,
    payload,
  };
}
