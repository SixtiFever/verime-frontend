import { Navigate, Outlet } from "react-router-dom";
import { getSession } from "../lib/session";

export function AdminRoute() {
  const session = getSession();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  if (session.agent.role !== "admin") {
    return <Navigate to="/home" replace />;
  }
  return <Outlet />;
}
