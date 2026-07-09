import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession, getSession } from "../lib/session";

type AgentLayoutProps = {
  children: ReactNode;
};

export function AgentLayout({ children }: AgentLayoutProps) {
  const navigate = useNavigate();
  const session = getSession();

  if (!session) {
    return null;
  }

  const { agent, organization } = session;

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1 className="admin-org-name">{organization.name}</h1>
        <div className="admin-header-actions">
          <div className="agent-header-user">
            <span className="admin-user-name">{agent.name}</span>
            <span className="badge badge-verified">Verified ✓</span>
          </div>
          <button type="button" className="auth-button auth-button-secondary admin-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>
      <main className="admin-content">{children}</main>
    </div>
  );
}
