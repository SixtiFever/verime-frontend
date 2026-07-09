import { Navigate, Route, Routes } from "react-router-dom";
import { AdminRoute } from "./components/AdminRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { CallbackPage } from "./pages/CallbackPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { AddAgentPage } from "./pages/admin/AddAgentPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { EditAgentPage } from "./pages/admin/EditAgentPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<CallbackPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<HomePage />} />
      </Route>
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/admin/agents/new" element={<AddAgentPage />} />
        <Route path="/admin/agents/:id/edit" element={<EditAgentPage />} />
      </Route>
    </Routes>
  );
}
