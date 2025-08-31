import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { isAuthenticated, refreshAccessToken } from "../api/auth";

export default function ProtectedRoute() {
  const location = useLocation();
  const [status, setStatus] = useState(() =>
    isAuthenticated() ? "ok" : "pending"
  );

  useEffect(() => {
    let alive = true;
    async function trySilent() {
      if (isAuthenticated()) {
        setStatus("ok");
        return;
      }
      // Bir marta refresh cookie asosida access olishga urinib ko'ramiz
      try {
        await refreshAccessToken();
        if (!alive) return;
        setStatus(isAuthenticated() ? "ok" : "fail");
      } catch {
        if (!alive) return;
        setStatus("fail");
      }
    }
    trySilent();
    return () => {
      alive = false;
    };
  }, []);

  if (status === "ok") return <Outlet />;
  if (status === "pending") return null; // yoki skeleton/loader qo'yish mumkin
  return <Navigate to="/login" replace state={{ from: location }} />;
}
