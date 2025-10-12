import { useEffect, useMemo, useState } from "react";
import { decodeJWT, isAuthenticated } from "../api/auth";

function hasAdminRole(payload) {
  if (!payload) return false;
  const single = (
    payload.role ||
    payload.user_role ||
    payload["x-role"] ||
    ""
  ).toString();
  if (single === "ADMIN" || single === "ROLE_ADMIN") return true;

  const arr = []
    .concat(payload.roles || [])
    .concat(payload.authorities || [])
    .concat(payload.scopes || [])
    .map(String);

  return arr.some((r) => r === "ADMIN" || r === "ROLE_ADMIN");
}

export function useAuth() {
  const [payload, setPayload] = useState(() => decodeJWT());
  const [isAuthed, setIsAuthed] = useState(() => isAuthenticated());

  // Token o'zgarsa (boshqa tab/lokal) — auto-update
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "token" || e.key === "refreshToken") {
        setPayload(decodeJWT());
        setIsAuthed(isAuthenticated());
      }
    };

    // Custom event from tokenStore (same-tab updates)
    const onTokenChanged = () => {
      setPayload(decodeJWT());
      setIsAuthed(isAuthenticated());
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("auth:token-changed", onTokenChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth:token-changed", onTokenChanged);
    };
  }, []);

  // Har bir renderda ham tekshirib turamiz (bir tabli holatlar uchun)
  useEffect(() => {
    setPayload(decodeJWT());
    setIsAuthed(isAuthenticated());
  }, []);

  const role = payload?.role || null;
  const username = payload?.sub || payload?.username || null;
  const orgId = payload?.orgId ?? null;

  const isAdmin = useMemo(() => hasAdminRole(payload), [payload]);

  return {
    isAuthed,
    role,
    isAdmin,
    username,
    orgId,
    payload,
  };
}
