import { useEffect, useState, type ReactNode } from "react";
import { getOrganization } from "../lib/api";
import { formatSsoLabel } from "../lib/format";
import { getSession, updateSessionLogo } from "../lib/session";
import { AdminHeaderMenu } from "./AdminHeaderMenu";
import { OrgLogo } from "./OrgLogo";

type AdminLayoutProps = {
  children: ReactNode;
};

export function AdminLayout({ children }: AdminLayoutProps) {
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
            </div>
          </div>
        </div>
        <div className="admin-header-actions">
          <AdminHeaderMenu
            agentName={agent.name}
            orgId={organization.id}
            orgName={organization.name}
            token={session.token}
            logoUrl={logoUrl}
            onLogoChange={handleLogoChange}
          />
        </div>
      </header>
      <main className="admin-content">{children}</main>
    </div>
  );
}
