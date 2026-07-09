# VeriMe Frontend — Cursor Agent Prompt

Copy everything below the line into a new Cursor agent session in your **frontend project** (separate repo).

---

## Your task

Build a minimal VeriMe frontend app with:

1. A **login page** — user enters their work email and clicks "Sign in"
2. A **tenant home page** — after successful SSO login, shows: `Hello {email} from {organization name}`
3. **Error states** — clear messages when login is not allowed

Keep it simple. No design system required — clean, readable UI is enough. No admin features, no agent management UI.

---

## Context: how auth works

VeriMe is a multi-tenant B2B app. Each customer company is an **organization**. Employees are **agents**.

- Agents **never** enter a password on VeriMe
- They enter their work email → get redirected to their **company IdP** via WorkOS SSO
- VeriMe backend only trusts them **after** IdP login succeeds
- If the org isn't onboarded, SSO isn't connected, or the agent wasn't pre-created → login is **rejected**

You are building the **frontend half** of this flow. The backend already exists in a separate repo (`verime-server`, Fastify on port 3000).

---

## Architecture

```
┌─────────────┐      ┌─────────────────┐      ┌─────────┐      ┌──────────┐
│  Frontend   │ ───► │  verime-server  │ ───► │ WorkOS  │ ───► │ Company  │
│  (you build)│ ◄─── │  localhost:3000 │ ◄─── │         │ ◄─── │ IdP      │
└─────────────┘      └─────────────────┘      └─────────┘      └──────────┘
```

**Recommended stack:** Vite + React + TypeScript + React Router. Port **5173** for local dev.

---

## Prerequisites — backend changes required first

The backend exists but needs **three small changes** before the frontend can work end-to-end. Either apply these in `verime-server` first, or implement them as part of this work if you have access to both repos.

### 1. Add CORS

Register `@fastify/cors` on `verime-server` allowing the frontend origin:

```
http://localhost:5173
```

### 2. Add `POST /auth/exchange`

WorkOS must redirect back to the **frontend** after IdP login. The frontend receives a `code` and sends it to the backend for exchange.

Add this endpoint to `verime-server`:

```
POST /auth/exchange
Content-Type: application/json

{ "code": "<code from WorkOS redirect>" }
```

**Success (200):**

```json
{
  "agent": {
    "id": "uuid",
    "organization_id": "uuid",
    "name": "Jason Swift",
    "email": "jason@fsp.co",
    "role": "admin",
    "verification_status": "verified",
    "verified_at": "2026-07-08T...",
    "workos_user_id": "prof_...",
    "created_at": "..."
  },
  "organization": {
    "id": "uuid",
    "name": "FSP Limited"
  },
  "authenticationMethod": "SSO"
}
```

**Errors:** same status codes and `{ "error": "..." }` bodies as the existing GET `/auth/callback`.

Implementation hint: extract the code-exchange logic from the existing `GET /auth/callback` handler in `src/routes/auth.ts` into a shared function. Include `organization.name` in the response (join `organizations` table on verify).

### 3. Update WorkOS redirect URI

In `verime-server` `.env`:

```
WORKOS_REDIRECT_URI=http://localhost:5173/auth/callback
```

Also register `http://localhost:5173/auth/callback` as an allowed redirect URI in the **WorkOS Dashboard** (Staging environment).

---

## Existing backend API (already implemented)

Base URL: `http://localhost:3000`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Health check → `{ "status": "ok" }` |
| `GET` | `/auth/login?email=` | Start SSO — redirects to WorkOS on success |
| `GET` | `/organizations` | List orgs (id, name, sso_status, etc.) |

### `GET /auth/login?email={email}`

- **Success:** `302` redirect to WorkOS SSO (browser navigation — do not use `fetch` for the happy path)
- **Errors (JSON body):**

| Status | When | Example error |
|--------|------|---------------|
| 400 | Missing email | `"email query param is required..."` |
| 403 | Email not in agents table | `"No VeriMe account found for this email..."` |
| 403 | Org SSO not connected | `"Enterprise SSO is not yet active..."` |
| 409 | Email in multiple orgs | `"This email is registered with multiple organizations..."` |

**Login page strategy for errors:** before redirecting, optionally pre-check with:

```typescript
const res = await fetch(
  `${API_URL}/auth/login?email=${encodeURIComponent(email)}`,
  { redirect: "manual" }
);

if (res.status === 403 || res.status === 400 || res.status === 409) {
  const body = await res.json();
  setError(body.error);
  return;
}

if (res.status === 302) {
  window.location.href = res.headers.get("Location")!;
  return;
}
```

Or simpler: redirect directly with `window.location.href = .../auth/login?email=...` and accept that pre-SSO errors show as raw JSON (not ideal — prefer the fetch approach above).

---

## Frontend routes to build

| Route | Purpose |
|-------|---------|
| `/` | Redirect to `/login` |
| `/login` | Email form + Sign in button + error display |
| `/auth/callback` | WorkOS lands here with `?code=` — exchange code, store session, redirect to `/home` |
| `/home` | Protected tenant landing page |

---

## Login flow (implement exactly this)

### Step 1 — Login page (`/login`)

- Single email input (type `email`, label: "Work email")
- "Sign in" button
- Validate email format client-side
- On submit: pre-check via `fetch` with `redirect: "manual"` (see above), or redirect to backend login URL
- Show friendly error messages for all rejection cases (map backend `error` strings to user-readable copy)

**User-facing error copy suggestions:**

| Backend error contains | Show user |
|------------------------|-----------|
| "No VeriMe account" | "We couldn't find a VeriMe account for this email. Contact your administrator." |
| "SSO is not yet active" | "Your organisation hasn't finished setting up SSO with VeriMe yet." |
| "multiple organizations" | "This email is linked to more than one organisation. Contact support." |
| "SSO authentication failed" | "Sign-in was cancelled or failed. Please try again." |

### Step 2 — SSO redirect (automatic)

Backend redirects browser → WorkOS → company IdP. User authenticates there. **No VeriMe password field anywhere.**

### Step 3 — Callback page (`/auth/callback`)

WorkOS redirects to: `http://localhost:5173/auth/callback?code=...`

```typescript
// Pseudocode
const code = new URLSearchParams(location.search).get("code");
const error = new URLSearchParams(location.search).get("error");

if (error) { /* show error, link back to /login */ return; }
if (!code) { /* show error */ return; }

const res = await fetch(`${API_URL}/auth/exchange`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ code }),
});

if (!res.ok) {
  const body = await res.json();
  /* show body.error, link back to /login */
  return;
}

const data = await res.json();
// Store session (see below)
navigate("/home");
```

### Step 4 — Tenant home (`/home`)

Protected route. If no session → redirect to `/login`.

Display:

```
Hello {agent.email} from {organization.name}
```

Example: `Hello jason@fsp.co from FSP Limited`

Optionally show agent name and role in smaller text below.

---

## Session persistence (MVP)

No backend session/JWT exists yet. For this MVP:

- After successful `/auth/exchange`, store in `sessionStorage`:

```typescript
sessionStorage.setItem("verime_session", JSON.stringify({
  agent: data.agent,
  organization: data.organization,
  sso: data.sso,  
}));
```

- On `/home`, read from `sessionStorage`
- On logout (optional button), clear storage and go to `/login`
- Guard `/home`: if no session → redirect to `/login`

Keep the session shape typed:

```typescript
type VeriMeSession = {
  agent: {
    id: string;
    organization_id: string;
    name: string;
    email: string;
    role: "admin" | "agent";
    verification_status: "pending" | "verified";
    verified_at: string | null;
    workos_user_id: string | null;
    created_at: string;
  };
  organization: {
    id: string;
    name: string;
  };
};
```

---

## Environment variables

Create `.env` in the frontend project:

```env
VITE_API_URL=http://localhost:3000
```

Use `import.meta.env.VITE_API_URL` everywhere — never hardcode the backend URL.

---

## Local dev setup

1. **Backend running:** in `verime-server`, `npm run dev` (port 3000)
2. **Postgres running** with at least one org where `sso_status = connected` and one agent row
3. **WorkOS redirect URI** set to `http://localhost:5173/auth/callback` (backend `.env` + WorkOS Dashboard)
4. **Backend CORS** allows `http://localhost:5173`
5. **Backend `POST /auth/exchange`** implemented
6. **Frontend:** `npm run dev` (port 5173)

### Test IdP dev note

If using WorkOS Test IdP (not a real Okta/Entra), the developer must be **logged into [dashboard.workos.com](https://dashboard.workos.com)** in the same browser before testing SSO. Otherwise they'll hit an unrelated WorkOS password page.

---

## UI requirements

- Clean, minimal, professional — this is a B2B enterprise app
- Mobile-friendly but desktop-first is fine
- Loading state on Sign in button while pre-checking email
- Loading state on `/auth/callback` while exchanging code ("Signing you in...")
- Error states with a "Try again" link back to `/login`
- No password field on the login page — ever

---

## Out of scope (do not build)

- Admin UI for creating orgs or agents
- Organization SSO setup / onboarding UI
- User registration or sign-up
- Password login
- Persistent login across browser restarts (beyond sessionStorage MVP)
- Multi-org picker (409 case — show error message only)
- API route protection / JWT refresh
- Tests (unless trivial smoke test)

---

## Acceptance checklist

- [ ] User can enter work email and click Sign in
- [ ] Unknown email → friendly error, stays on login page
- [ ] Org SSO not connected → friendly error
- [ ] Valid agent → redirects through WorkOS/IdP → lands on `/home`
- [ ] Home page shows `Hello {email} from {organization name}`
- [ ] Refreshing `/home` keeps user logged in (same tab/session)
- [ ] Closing tab requires re-login (sessionStorage — expected for MVP)
- [ ] `/home` without session redirects to `/login`
- [ ] No password field anywhere in the app

---

## Reference: backend repo layout

If you need to inspect or modify the backend:

```
verime-server/
  src/routes/auth.ts       ← login + callback (add POST /auth/exchange here)
  src/routes/agents.ts     ← agent CRUD
  src/routes/organizations.ts
  src/server.ts            ← add CORS here
  docs/auth_flow.md        ← full auth flow explanation
```

Backend auth uses **standalone WorkOS SSO** (`workos.sso.getAuthorizationUrl`), **not** AuthKit User Management. Do not integrate AuthKit on the frontend.

---

## Summary

Build a small React app with login → SSO redirect → callback → tenant home. The backend handles all identity verification; the frontend only collects email, handles the OAuth redirect callback, and displays the result. Keep it simple.
