import { getOrgInitials } from "../lib/logo";

type OrgLogoProps = {
  name: string;
  logoUrl: string | null;
  size?: number;
};

export function OrgLogo({ name, logoUrl, size = 64 }: OrgLogoProps) {
  return (
    <div className="org-logo" style={{ width: size, height: size }}>
      {logoUrl ? (
        <img className="org-logo-img" src={logoUrl} alt={`${name} logo`} width={size} height={size} />
      ) : (
        <span className="org-logo-placeholder" aria-hidden="true">
          {getOrgInitials(name)}
        </span>
      )}
    </div>
  );
}
