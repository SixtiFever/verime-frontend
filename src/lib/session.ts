import type { VeriMeSession } from "../types/session";

const SESSION_KEY = "verime_session";

export function getSession(): VeriMeSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VeriMeSession;
    if (!parsed.agent?.email || !parsed.organization?.name || !parsed.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(session: VeriMeSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function updateSessionLogo(logoUrl: string | null): void {
  const session = getSession();
  if (!session) return;
  setSession({
    ...session,
    organization: { ...session.organization, logoUrl },
  });
}
