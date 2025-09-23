import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function AdminRoute({ children }) {
  const { isAdmin, isAuthed } = useAuth();
  if (!isAuthed) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/forbidden" replace />;
  return children;
}
