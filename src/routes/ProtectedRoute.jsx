import { Outlet, Navigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "../api/auth";

export default function ProtectedRoute() {
  const location = useLocation();
  if (isAuthenticated()) return <Outlet />;
  return (
    <Navigate
      to="/login"
      replace
      state={{ from: location }} // LoginPage shuni o‘qishi mumkin
    />
  );
}
