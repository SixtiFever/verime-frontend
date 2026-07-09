import { Navigate, Outlet } from "react-router-dom";
import { getSession } from "../lib/session";

export function ProtectedRoute() {
  const session = getSession();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
