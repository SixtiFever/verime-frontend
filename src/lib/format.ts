import type { Agent, SsoConnectionInfo } from "../types/session";

export function formatRole(role: Agent["role"]): string {
  return role === "admin" ? "Admin" : "Agent";
}

export function formatVerificationStatus(status: Agent["verification_status"]): string {
  return status === "verified" ? "Verified" : "Pending";
}

export function formatSsoLabel(sso: SsoConnectionInfo | undefined): string | null {
  if (!sso?.connectionName || !sso?.providerLabel) return null;
  return `Signed in via ${sso.connectionName} · ${sso.providerLabel}`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCustomerVerificationStatus(
  status: "sent" | "opened" | "expired",
): string {
  if (status === "opened") return "Opened";
  if (status === "expired") return "Expired";
  return "Sent";
}
