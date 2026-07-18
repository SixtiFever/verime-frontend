import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession } from "../lib/session";
import { OrgLogoUpload } from "./OrgLogoUpload";

type AdminHeaderMenuProps = {
  agentName: string;
  orgId: string;
  orgName: string;
  token: string;
  logoUrl: string | null;
  onLogoChange: (logoUrl: string | null) => void;
};

export function AdminHeaderMenu({
  agentName,
  orgId,
  orgName,
  token,
  logoUrl,
  onLogoChange,
}: AdminHeaderMenuProps) {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleLogout() {
    clearSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="header-menu" ref={menuRef}>
      <button
        type="button"
        className="header-menu-toggle"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Open menu"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="header-menu-bar" />
        <span className="header-menu-bar" />
        <span className="header-menu-bar" />
      </button>

      {open && (
        <div className="header-menu-panel" role="menu">
          <p className="header-menu-user">{agentName}</p>
          <div className="header-menu-section">
            <OrgLogoUpload
              orgId={orgId}
              orgName={orgName}
              token={token}
              logoUrl={logoUrl}
              onLogoChange={onLogoChange}
            />
          </div>
          <div className="header-menu-divider" />
          <button
            type="button"
            className="auth-button auth-button-secondary header-menu-logout"
            role="menuitem"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
