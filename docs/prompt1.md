# VeriMe Frontend — IdP Provider Display Cursor Agent Prompt

Copy everything below the line into a new Cursor agent session in your **frontend project** (separate repo).

---

## Your task

Show the **connected IdP provider** in the VeriMe UI for signed-in admins and agents.

After SSO login, display read-only context like:

> **Signed in via Barclays · Microsoft Entra ID**

This is a small, focused change on top of the existing login flow, admin dashboard, and agent home page. Do **not** rebuild those pages — extend them.

---

## Context

VeriMe uses **standalone WorkOS SSO** (not AuthKit). Agents and admins log in via their company's IdP (e.g. Microsoft Entra, Okta).

The backend (`verime-server`) now returns IdP metadata on successful login. The frontend must:

1. Store it in session
2. Display it on `/admin` and `/home`

**No new API endpoints.** No WorkOS SDK on the frontend. Data comes from `POST /auth/exchange` at login and is read from `sessionStorage` on page load.

---

## Backend change (already done — do not reimplement)

`POST /auth/exchange` now returns an additional `sso` object:

```json
{
  "agent": { "id": "...", "email": "...", "role": "admin", ... },
  "organization": { "id": "...", "name": "Barclays" },
  "authenticationMethod": "SSO",
  "sso": {
    "connectionId": "conn_01H...",
    "connectionName": "Barclays",
    "connectionType": "EntraIdOIDC",
    "providerLabel": "Microsoft Entra ID"
  }
}
```

| Field | Meaning |
|-------|---------|
| `connectionName` | Human-readable name from WorkOS (often the org/tenant name) |
| `connectionType` | WorkOS enum (e.g. `EntraIdOIDC`, `OktaSAML`) — for debugging only |
| `providerLabel` | Friendly label already mapped by the backend (e.g. "Microsoft Entra ID", "Okta") |

Base URL: `import.meta.env.VITE_API_URL` (default `http://localhost:3000`)

---

## What to change

### 1. Extend session types

Add `sso` to your existing `VeriMeSession` type (wherever session types live):

```typescript
type SsoConnectionInfo = {
  connectionId: string;
  connectionName: string;
  connectionType: string;
  providerLabel: string;
};

type VeriMeSession = {
  agent: { /* existing fields */ };
  organization: { id: string; name: string };
  sso?: SsoConnectionInfo; // optional for backward compat with old sessions
};
```

Make `sso` optional so existing `sessionStorage` entries from before this change don't break the app.

### 2. Update `/auth/callback` — persist `sso`

After successful `POST /auth/exchange`, include `sso` when saving session:

```typescript
const data = await res.json();

sessionStorage.setItem("verime_session", JSON.stringify({
  agent: data.agent,
  organization: data.organization,
  sso: data.sso,
}));

if (data.agent.role === "admin") {
  navigate("/admin");
} else {
  navigate("/home");
}
```

### 3. Add a small display helper

```typescript
function formatSsoLabel(sso: SsoConnectionInfo | undefined): string | null {
  if (!sso?.connectionName || !sso?.providerLabel) return null;
  return `Signed in via ${sso.connectionName} · ${sso.providerLabel}`;
}
```

### 4. Show on `/admin` (admin dashboard)

In the header or just below it, render the IdP line in smaller, muted text:

```
┌─────────────────────────────────────────────────────┐
│  {organization.name}              {admin.name} ▾   │
│  Signed in via Barclays · Microsoft Entra ID        │
│                                     [Log out]       │
```

Only show when `formatSsoLabel(session.sso)` returns a value. Hide the line if `sso` is missing (user logged in before this change).

### 5. Show on `/home` (agent dashboard)

In the session context footer (or header subline), add the same IdP line alongside existing context (`Signed in as {email}`, `Verified ✓`, etc.):

```
Signed in as jason@barclays.co
Verified ✓
Signed in via Barclays · Microsoft Entra ID
```

Same rule: only render when `sso` is present.

---

## Styling guidance

- Match existing login/admin/home page style
- Muted/secondary text — informational, not a primary action
- Do not make it clickable
- Do not add tooltips or expandable details unless trivial
- Keep it one line; truncate with ellipsis on narrow screens if needed

---

## Backward compatibility

| Scenario | Behaviour |
|----------|-----------|
| User logs in after backend deploy | `sso` stored and displayed |
| User has old session in `sessionStorage` | App works; IdP line hidden until re-login |
| `sso` missing from exchange response | Hide IdP line; do not error |

Do **not** force re-login or clear session when `sso` is absent.

---

## Out of scope

- SSO setup / IdP configuration UI
- Calling WorkOS APIs from the frontend
- Persisting IdP info beyond `sessionStorage`
- New backend endpoints
- Mapping `connectionType` to labels on the frontend (backend already sends `providerLabel`)

---

## Files likely to touch

- Session type definition (e.g. `src/types/session.ts` or equivalent)
- Auth callback page/component (`/auth/callback`)
- Admin dashboard layout/header (`/admin`)
- Agent home page footer/header (`/home`)

Search the codebase for `verime_session`, `getSession`, and `/auth/exchange` to find the right files.

---

## Acceptance checklist

- [ ] After fresh login, `sessionStorage.verime_session` includes `sso` with all four fields
- [ ] `/admin` shows `Signed in via {connectionName} · {providerLabel}` when `sso` is present
- [ ] `/home` shows the same IdP line when `sso` is present
- [ ] Old sessions without `sso` still load `/admin` and `/home` without errors
- [ ] IdP line is hidden (not broken) when `sso` is absent
- [ ] No new API calls added
- [ ] Styling consistent with existing pages

---

## Test plan

1. Ensure `verime-server` is running with the latest `POST /auth/exchange` (returns `sso`)
2. Clear `sessionStorage` (or use incognito)
3. Log in as an **admin** via SSO → confirm IdP line on `/admin`
4. Log out, log in as an **agent** → confirm IdP line on `/home`
5. Manually remove `sso` from stored session JSON → confirm pages still render, IdP line hidden
6. Re-login → confirm IdP line reappears

---

## Summary

Implement IdP provider display for signed-in admins and agents. Store `sso` from `POST /auth/exchange` in session, extend types, and show `Signed in via {connectionName} · {providerLabel}` on `/admin` and `/home`. Keep changes minimal; treat missing `sso` as a no-op.

Backend auth uses **standalone WorkOS SSO**, **not** AuthKit. Do not integrate WorkOS on the frontend.
