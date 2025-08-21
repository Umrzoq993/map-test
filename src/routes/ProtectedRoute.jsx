// src/routes/ProtectedRoute.jsx
import { isAuthenticated } from "../api/auth";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute() {
  const location = useLocation();

  if (!isAuthenticated()) {
    // Login sahifasiga YONALTIRAMIZ va qayerdan kelganini state.from ga saqlaymiz
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
