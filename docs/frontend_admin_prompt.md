
## Your task

Extend the existing VeriMe frontend (login + SSO callback + agent home page) with a **tenant admin dashboard** for signed-in users where `agent.role === "admin"`.

Build:

1. **Role-based routing** — admins land on `/admin` after login; regular agents stay on `/home`
2. **Admin dashboard** — list all agents in the org
3. **Add agent** — form to pre-create a new employee
4. **Edit agent** — update name, role; email only if not yet verified
5. **Remove agent** — delete with confirmation
6. **Logout** — clear session, return to `/login`

Keep it simple. No design system required — clean, readable UI is enough. Match the style of the existing login/home pages.

---

## Context: who is a tenant admin?

VeriMe is a multi-tenant B2B app. Each customer company is an **organization**. Their employees are **agents**.

There are two agent roles stored in Postgres:

| Role | Purpose |
|------|---------|
| `admin` | Manages agents within their org (add, edit, remove) |
| `agent` | Regular employee — sees tenant home only |

**Important onboarding facts (do not build UI for these — they happen before anyone can log in):**

1. VeriMe platform staff registers the org via `POST /organizations`
2. Customer IT connects the IdP via WorkOS Admin Portal (SSO setup link + webhook)
3. Only after `sso_status = connected`, VeriMe bootstraps the **first admin** via `POST /agents` (API call — no self-registration)
4. That admin (and any agents they add later) log in via SSO

**A signed-in tenant admin always has a connected org.** Login is blocked until `sso_status = connected`. Do not build SSO setup or org registration UI in the admin dashboard.

---

## Architecture

```
┌─────────────┐      ┌─────────────────┐      ┌─────────┐      ┌──────────┐
│  Frontend   │ ───► │  verime-server  │ ───► │ WorkOS  │ ───► │ Company  │
│  (you build)│ ◄─── │  localhost:3000 │ ◄─── │         │ ◄─── │ IdP      │
└─────────────┘      └─────────────────┘      └─────────┘      └──────────┘
```

**Stack:** Vite + React + TypeScript + React Router. Port **5173** for local dev.

**Assumes existing:** login page, SSO callback, session storage, agent home page (`/home`).

---

## Role-based routing (update existing callback)

After successful `POST /auth/exchange`, route by role:

```typescript
const data = await res.json();

sessionStorage.setItem("verime_session", JSON.stringify({
  agent: data.agent,
  organization: data.organization,
}));

if (data.agent.role === "admin") {
  navigate("/admin");
} else {
  navigate("/home");
}
```

| Route | Who can access |
|-------|----------------|
| `/login`, `/auth/callback` | Everyone (public) |
| `/home` | Any signed-in user (`agent` or `admin`) |
| `/admin`, `/admin/*` | Signed-in users with `role === "admin"` only |

**Route guards:**

- No session → redirect to `/login`
- Session exists but `role !== "admin"` on `/admin/*` → redirect to `/home`
- Optional: redirect admins away from `/home` to `/admin` (either approach is fine)

---

## Session shape (extend existing types)

```typescript
type AgentRole = "admin" | "agent";
type VerificationStatus = "pending" | "verified";

type VeriMeSession = {
  agent: {
    id: string;
    organization_id: string;
    name: string;
    email: string;
    role: AgentRole;
    verification_status: VerificationStatus;
    verified_at: string | null;
    workos_user_id: string | null;
    created_at: string;
  };
  organization: {
    id: string;
    name: string;
  };
};

type Agent = VeriMeSession["agent"];
```

Read/write from `sessionStorage` key `verime_session` (same as existing login flow).

**Always use `session.organization.id` as `organizationId` on API calls.** Never let the user pick an org.

---

## Backend API (admin-relevant endpoints)

Base URL: `import.meta.env.VITE_API_URL` (default `http://localhost:3000`)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/agents?organizationId=` | List agents in org |
| `POST` | `/agents` | Add agent |
| `PATCH` | `/agents/:id` | Update agent |
| `DELETE` | `/agents/:id` | Remove agent |

Auth endpoints (`/auth/login`, `/auth/exchange`) are already implemented — see existing login flow.

**No auth headers required today.** The backend does not validate sessions server-side yet. Gate admin UI client-side by `session.agent.role`.

---

## Agent API reference

### List agents

```
GET /agents?organizationId={session.organization.id}
```

**Success (200):** Array of agent objects.

```typescript
type Agent = {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  role: AgentRole;
  verification_status: VerificationStatus;
  verified_at: string | null;
  workos_user_id: string | null;
  created_at: string;
};
```

**Errors:**

| Status | When |
|--------|------|
| 400 | Missing `organizationId` query param |

---

### Add agent

```
POST /agents
Content-Type: application/json

{
  "organizationId": "{session.organization.id}",
  "name": "Jane Doe",
  "email": "jane@company.com",
  "role": "agent"
}
```

`role` is optional — defaults to `"agent"`. Use `"admin"` to create another org admin.

**Success (201):** Created agent object (`verification_status: "pending"`).

**Errors:**

| Status | When | Error message |
|--------|------|---------------|
| 400 | Missing fields | `"organizationId, name, and email are required"` |
| 400 | Invalid org | `"organizationId does not exist."` |
| 400 | Invalid role | `"role must be 'admin' or 'agent'"` |
| 403 | SSO not connected | `"This organization's Enterprise SSO connection must be active before agents can be added."` |
| 409 | Duplicate email | `"This email is already registered for this organization."` |

**UI notes:**

- Creating an agent does **not** send an invite email — show a success message like: "Agent added. They can sign in at VeriMe using their work email once SSO is active."
- New agents start as `verification_status: "pending"` until first SSO login

---

### Update agent

```
PATCH /agents/:id
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@new.com",
  "role": "admin"
}
```

At least one field required.

**Success (200):** Updated agent object.

**Errors:**

| Status | When |
|--------|------|
| 400 | No fields provided |
| 400 | Invalid role |
| 403 | Email change on verified agent |
| 404 | Agent not found |
| 409 | Email already taken in org |

**UI rules:**

- **Disable email field** when `verification_status === "verified"` (email is bound to IdP identity after first login)
- Show helper text: "Email cannot be changed after the agent has signed in."
- Allow name and role changes regardless of verification status

---

### Remove agent

```
DELETE /agents/:id
```

**Success:** `204 No Content`

**Errors:**

| Status | When |
|--------|------|
| 404 | Agent not found |

**UI rules:**

- Show confirmation dialog before delete
- Consider warning if deleting yourself (backend allows it — warn in UI)
- Refresh agent list after successful delete

---

## Frontend routes to build

| Route | Purpose |
|-------|---------|
| `/admin` | Admin dashboard — agent list + org header |
| `/admin/agents/new` | Add agent form |
| `/admin/agents/:id/edit` | Edit agent form |

Existing routes (keep as-is, update callback routing):

| Route | Purpose |
|-------|---------|
| `/` | Redirect to `/login` |
| `/login` | Email form + Sign in |
| `/auth/callback` | Exchange code, store session, route by role |
| `/home` | Agent tenant home |

---

## Admin dashboard (`/admin`)

**Layout:**

```
┌─────────────────────────────────────────────────────┐
│  {organization.name}              {admin.name} ▾   │
│                                     [Log out]       │
├─────────────────────────────────────────────────────┤
│  Agents                              [+ Add agent]  │
│  ┌──────────┬──────────────┬───────┬────────────┐  │
│  │ Name     │ Email        │ Role  │ Status     │  │
│  ├──────────┼──────────────┼───────┼────────────┤  │
│  │ Jane Doe │ jane@co.com  │ Agent │ Pending    │  │
│  │ You      │ you@co.com   │ Admin │ Verified   │  │
│  └──────────┴──────────────┴───────┴────────────┘  │
│  [Edit] [Remove] on each row                        │
└─────────────────────────────────────────────────────┘
```

**On mount:**

```typescript
const session = getSession(); // from sessionStorage

const agents = await fetch(
  `${API_URL}/agents?organizationId=${session.organization.id}`
).then(r => r.json());
```

**Table columns:**

| Column | Display |
|--------|---------|
| Name | `agent.name` |
| Email | `agent.email` |
| Role | Badge: "Admin" or "Agent" |
| Status | `pending` → "Pending" (never signed in); `verified` → "Verified" |
| Verified at | Formatted date, or "—" if null |
| Actions | Edit, Remove buttons |

**Empty state:** "No agents yet. Add your first agent to get started."

**Loading state:** Skeleton or spinner while fetching.

**Error state:** Show API error message with retry button.

Highlight the current user's row (match `agent.id === session.agent.id`).

---

## Add agent form (`/admin/agents/new`)

**Fields:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Name | text | yes | |
| Email | email | yes | Work email — must match what they'll use at IdP |
| Role | select | no | Options: "Agent" (default), "Admin" |

**Submit:** `POST /agents` with `organizationId` from session.

**On success:** Navigate to `/admin` with success toast/banner.

**On error:** Show backend `error` message inline.

**Cancel:** Back to `/admin`.

---

## Edit agent form (`/admin/agents/:id/edit`)

**Load:** Fetch agent from list (pass via route state) or re-fetch `GET /agents?organizationId=` and find by id.

**Fields:**

| Field | Editable when |
|-------|---------------|
| Name | Always |
| Email | Only if `verification_status === "pending"` |
| Role | Always — select "Agent" or "Admin" |

**Submit:** `PATCH /agents/:id`

**On success:** Navigate to `/admin`.

**On 403 (email change blocked):** Show error — should not happen if email field was disabled correctly.

---

## Agent verification status (display logic)

```
pending  →  "Pending"     (admin created record; never logged in)
verified →  "Verified"    (completed SSO login at least once)
```

After first SSO login, the backend sets `verification_status = verified` and binds `workos_user_id`. Email becomes immutable.

---

## Logout

No backend endpoint. On logout button click:

```typescript
sessionStorage.removeItem("verime_session");
navigate("/login");
```

Add logout to admin dashboard header (and optionally to `/home` for agents).

---

## Environment variables

```env
VITE_API_URL=http://localhost:3000
```

Use `import.meta.env.VITE_API_URL` everywhere.

---

## Local dev setup

1. **Backend running:** `verime-server`, `npm run dev` (port 3000)
2. **Org with `sso_status = connected`** and at least one admin agent row (`role: "admin"`)
3. **WorkOS redirect URI:** `http://localhost:5173/auth/callback`
4. **Frontend:** `npm run dev` (port 5173)

### Bootstrap a test admin (backend terminal — not frontend)

```bash
# 1. Ensure org exists and SSO is connected
curl http://localhost:3000/organizations

# 2. Create admin agent (replace ORG_ID)
curl -X POST http://localhost:3000/agents \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "YOUR_ORG_ID",
    "name": "Test Admin",
    "email": "admin@yourdomain.com",
    "role": "admin"
  }'

# 3. Log in at frontend with that email
```

---

## UI requirements

- Clean, minimal, professional — B2B enterprise app
- Desktop-first, mobile-friendly
- Loading states on all async actions (list fetch, form submit, delete)
- Error states with clear messages from backend `error` field
- Success feedback after add/edit/delete (toast or banner)
- Confirmation dialog before delete
- No password fields anywhere

---

## Out of scope (do not build)

- Organization registration (`POST /organizations`)
- SSO / IdP setup UI (`POST /organizations/:id/sso-setup-link`)
- Org deletion
- User self-registration or invite emails
- Password login
- Persistent login across browser restarts (sessionStorage MVP is fine)
- Multi-org picker (409 on login — show error only)
- API auth headers / JWT / session refresh
- Platform-wide org listing for management
- "Last admin" protection (backend doesn't enforce — optional UI warning only)
- Tests (unless trivial smoke test)

---

## Backend limitations (know these)

1. **No server-side auth** — admin API endpoints are open; UI gating by role is client-side only
2. **`organizationId` from client** — always use session value, never user input
3. **No `GET /organizations/:id`** — not needed for admin dashboard (session has org id + name)
4. **No invite flow** — admin must tell new agents to sign in manually

---

## Acceptance checklist

- [ ] Admin user logs in → lands on `/admin` (not `/home`)
- [ ] Agent user logs in → lands on `/home` (unchanged)
- [ ] `/admin` without session → redirect to `/login`
- [ ] `/admin` with agent role → redirect to `/home`
- [ ] Admin dashboard lists all org agents with role and verification status
- [ ] Current user's row is visually distinguished
- [ ] Add agent form creates agent and returns to list
- [ ] Duplicate email shows friendly error
- [ ] Edit agent: name and role always editable
- [ ] Edit agent: email disabled when verified
- [ ] Delete agent shows confirmation, removes from list
- [ ] Logout clears session and goes to `/login`
- [ ] Refreshing `/admin` keeps admin logged in (same tab)
- [ ] No password field anywhere

---

## Reference: backend repo

```
verime-server/
  src/routes/auth.ts          ← login + exchange (returns agent.role)
  src/routes/agents.ts        ← agent CRUD
  src/routes/organizations.ts
  docs/frontend-agent-prompt.md   ← existing login/home prompt
  docs/auth/cheat-sheet.md        ← one-page auth mental model
  docs/end-to-end-flow.md         ← full onboarding + login journey
```

Backend auth uses **standalone WorkOS SSO**, **not** AuthKit User Management.

---

## Summary

Extend the existing VeriMe frontend with an admin dashboard for `role === "admin"` users. After SSO login, route admins to `/admin` where they can list, add, edit, and remove agents in their org. All agent management uses the existing unauthenticated REST API scoped by `session.organization.id`. SSO setup and org registration happen before anyone can log in — do not build UI for those phases.
