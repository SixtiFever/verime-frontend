import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { getOrganization } from "../lib/api";
import { formatSsoLabel } from "../lib/format";
import { clearSession, getSession, updateSessionLogo } from "../lib/session";
import { OrgLogo } from "./OrgLogo";
import { OrgLogoUpload } from "./OrgLogoUpload";

type AdminLayoutProps = {
  children: ReactNode;
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const session = getSession();
  const organizationId = session?.organization.id;
  const token = session?.token;
  const [logoUrl, setLogoUrl] = useState<string | null>(session?.organization.logoUrl ?? null);

  useEffect(() => {
    if (!organizationId || !token) return;

    const orgId = organizationId;
    const authToken = token;
    const currentSession = getSession();
    const currentLogoUrl = currentSession?.organization.logoUrl ?? null;
    setLogoUrl(currentLogoUrl);

    let cancelled = false;

    async function refreshLogo() {
      try {
        const org = await getOrganization(orgId, authToken);
        if (cancelled) return;
        const freshLogoUrl = org.logoUrl ?? null;
        if (freshLogoUrl !== currentLogoUrl) {
          updateSessionLogo(freshLogoUrl);
          setLogoUrl(freshLogoUrl);
        }
      } catch {
        // Keep session logo on refresh failure
      }
    }

    refreshLogo();

    return () => {
      cancelled = true;
    };
  }, [organizationId, token]);

  if (!session) {
    return null;
  }

  const { agent, organization } = session;
  const ssoLabel = formatSsoLabel(session.sso);

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  function handleLogoChange(nextLogoUrl: string | null) {
    setLogoUrl(nextLogoUrl);
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header-brand">
          <div className="admin-header-brand-row">
            <OrgLogo name={organization.name} logoUrl={logoUrl} />
            <div className="admin-header-brand-text">
              <h1 className="admin-org-name">{organization.name}</h1>
              {ssoLabel && <p className="session-sso-label">{ssoLabel}</p>}
              <OrgLogoUpload
                orgId={organization.id}
                orgName={organization.name}
                token={session.token}
                logoUrl={logoUrl}
                onLogoChange={handleLogoChange}
              />
            </div>
          </div>
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
