import { useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, deleteOrganizationLogo, uploadOrganizationLogo } from "../lib/api";
import { validateLogoFile } from "../lib/logo";
import { clearSession, updateSessionLogo } from "../lib/session";
import { ConfirmDialog } from "./ConfirmDialog";

type OrgLogoUploadProps = {
  orgId: string;
  orgName: string;
  token: string;
  logoUrl: string | null;
  onLogoChange: (logoUrl: string | null) => void;
};

function mapLogoError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) {
      return "Only organization admins can manage the logo.";
    }
    if (err.status === 503) {
      return "Upload failed. Please try again.";
    }
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Something went wrong. Please try again.";
}

export function OrgLogoUpload({ orgId, orgName, token, logoUrl, onLogoChange }: OrgLogoUploadProps) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  function handleAuthError(status?: number) {
    if (status === 401) {
      clearSession();
      navigate("/login", { replace: true });
      return true;
    }
    return false;
  }

  function handleUploadClick() {
    setError(null);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      await validateLogoFile(file);
      const { logoUrl: newLogoUrl } = await uploadOrganizationLogo(orgId, token, file);
      updateSessionLogo(newLogoUrl);
      onLogoChange(newLogoUrl);
    } catch (err) {
      if (err instanceof ApiError && handleAuthError(err.status)) return;
      setError(mapLogoError(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirmRemove() {
    setError(null);
    setRemoving(true);

    try {
      await deleteOrganizationLogo(orgId, token);
      updateSessionLogo(null);
      onLogoChange(null);
      setShowRemoveConfirm(false);
    } catch (err) {
      if (err instanceof ApiError && handleAuthError(err.status)) return;
      setError(mapLogoError(err));
      setShowRemoveConfirm(false);
    } finally {
      setRemoving(false);
    }
  }

  const busy = uploading || removing;

  return (
    <div className="org-logo-upload">
      <p className="org-logo-upload-label">Organization logo</p>
      <div className="org-logo-upload-actions">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="org-logo-upload-input"
          onChange={handleFileChange}
          disabled={busy}
        />
        <button
          type="button"
          className="auth-button auth-button-secondary org-logo-upload-btn"
          onClick={handleUploadClick}
          disabled={busy}
        >
          {uploading ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
        </button>
        {logoUrl && (
          <button
            type="button"
            className="auth-button auth-button-secondary org-logo-remove-btn"
            onClick={() => setShowRemoveConfirm(true)}
            disabled={busy}
          >
            Remove
          </button>
        )}
      </div>
      <p className="org-logo-upload-hint">
        Upload a square logo, at least 512×512 pixels. If your logo is wide or tall, place it centred on a
        square canvas with padding. PNG with transparency works best.
      </p>
      {error && <div className="auth-error org-logo-upload-error">{error}</div>}

      {showRemoveConfirm && (
        <ConfirmDialog
          title="Remove organization logo"
          message={
            <p>
              Remove the logo for <strong>{orgName}</strong>? The placeholder will be shown instead.
            </p>
          }
          confirmLabel="Remove"
          loading={removing}
          onConfirm={handleConfirmRemove}
          onCancel={() => setShowRemoveConfirm(false)}
        />
      )}
    </div>
  );
}
