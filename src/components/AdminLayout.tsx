import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { formatSsoLabel } from "../lib/format";
import { clearSession, getSession } from "../lib/session";

type AdminLayoutProps = {
  children: ReactNode;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const session = getSession();

  if (!session) {
    return null;
  }

  const { agent, organization } = session;
  const ssoLabel = formatSsoLabel(session.sso);

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-brand">
          <h1 className="admin-org-name">{organization.name}</h1>
          {ssoLabel && <p className="session-sso-label">{ssoLabel}</p>}
        </div>
        <div className="admin-header-actions">
          <span className="admin-user-name">{agent.name}</span>
          <button type="button" className="auth-button auth-button-secondary admin-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>
      <main className="admin-content">{children}</main>
    </div>
  );
}
