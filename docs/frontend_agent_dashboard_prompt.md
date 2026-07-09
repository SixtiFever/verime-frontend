## Your task

Replace the minimal agent home page (`Hello {email} from {org}`) with a proper **agent workspace** at `/home` for signed-in users where `agent.role === "agent"`.

Build:

1. **Agent dashboard** — customer verification workspace (primary action)
2. **Send Verification** — phone number input + optional reference field + button (**stubbed — no API call yet**)
3. **Session context** — org name, agent name, verified status (from existing session)
4. **Recent verifications** — empty-state placeholder for future Twilio integration
5. **Logout** — clear session, return to `/login`

Keep it simple. Match the style of the existing login and admin pages. Design for agents on live customer calls — fast, minimal, one clear primary action.

**Assumes already built:** login, SSO callback, role-based routing (admins → `/admin`), admin dashboard, session storage.

---

## Context: what agents do

VeriMe is a multi-tenant B2B app. Customer companies are **organizations**. Their call-centre employees are **agents**.

| Role | Dashboard | Purpose |
|------|-----------|---------|
| `admin` | `/admin` | Manage agents in the org |
| `agent` | `/home` | Verify customer identity during calls |

**Agent workflow (today):**

1. Agent logs in via company SSO (WorkOS → IdP)
2. Lands on `/home`
3. Agent is on a call with a customer
4. Agent enters the customer's phone number and clicks **Send Verification**
5. *(Future)* Customer receives an SMS and confirms their identity

**Agent identity is already verified** by SSO before they reach `/home`. The Send Verification feature is for verifying **customers**, not the agent themselves.

There is **no verification API yet**. Twilio integration comes later. The Send Verification button must be UI-only for now.

---

## Architecture

```
┌─────────────┐      ┌─────────────────┐      ┌─────────┐
│  Frontend   │ ───► │  verime-server  │ ───► │ Twilio  │
│  /home      │      │  (future)       │      │ (later) │
└─────────────┘      └─────────────────┘      └─────────┘
```

**Stack:** Vite + React + TypeScript + React Router. Port **5173**.

**No backend calls from this page yet** — all data comes from `sessionStorage` except the stubbed Send Verification action.

---

## Role-based routing (should already exist — verify)

After `POST /auth/exchange`:

```typescript
if (data.agent.role === "admin") {
  navigate("/admin");
} else {
  navigate("/home");
}
```

| Route | Who can access |
|-------|----------------|
| `/home` | Signed-in `agent` role (primary). Admins may visit but should use `/admin` |
| `/admin` | `admin` role only |

**Route guard for `/home`:**

```typescript
function AgentRoute({ children }: { children: React.ReactNode }) {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
```

Do **not** redirect `agent` role away from `/home`. Admins who navigate to `/home` manually are fine — no forced redirect required.

---

## Session shape (read from sessionStorage)

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
```

Read via `sessionStorage.getItem("verime_session")`. No API fetch needed on page load.

---

## Agent dashboard (`/home`)

### Layout

```
┌─────────────────────────────────────────────────────┐
│  {organization.name}              {agent.name} [Out]│
├─────────────────────────────────────────────────────┤
│                                                     │
│  Customer verification                              │
│  ┌─────────────────────────────────────────────┐   │
│  │ Customer phone number *                      │   │
│  │ [ 07xxx xxxxxx                            ]  │   │
│  │                                              │   │
│  │ Reference (optional)                       │   │
│  │ [ Account or policy number                ]  │   │
│  │                                              │   │
│  │              [ Send Verification ]           │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Recent verifications                               │
│  ┌─────────────────────────────────────────────┐   │
│  │  No verifications yet.                       │   │
│  │  Send your first verification above.         │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Signed in as {agent.email} · Verified ✓           │
└─────────────────────────────────────────────────────┘
```

---

## Customer verification form

### Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Customer phone number | `tel` input | yes | Primary input — agent uses this on calls |
| Reference | `text` input | no | Account number, policy ref, customer surname — for future logging |

**Phone input:**

- Label: "Customer phone number"
- Placeholder: `07xxx xxxxxx` or `+44 7xxx xxxxxx`
- Autocomplete: `tel`
- Auto-focus on page load (agent lands here ready to type)

**Reference input:**

- Label: "Reference (optional)"
- Placeholder: `Account or policy number`
- Helper text: "Optional — helps identify the customer on your call"

**Send Verification button:**

- Primary/large button
- Label: "Send Verification"
- Disabled when phone field is empty or fails validation
- Shows loading spinner briefly on click (optional UX polish), then shows stub message

### Client-side phone validation (MVP)

Validate before enabling the button or on submit. Keep it simple:

```typescript
function isValidUkPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  // UK mobile: 07xxxxxxxxx (11 digits) or +44 7xxxxxxxxx (12 digits with country code)
  if (digits.startsWith("44")) return digits.length === 12 && digits[2] === "7";
  if (digits.startsWith("0")) return digits.length === 11 && digits[1] === "7";
  return false;
}
```

Show inline error: "Enter a valid UK mobile number" if invalid on blur or submit.

Do not over-engineer international numbers for MVP — UK mobile is enough for now.

---

## Send Verification — stubbed behaviour

**Do not call any API.** Twilio integration is future work.

On button click:

```typescript
function handleSendVerification(phone: string, reference: string) {
  if (!isValidUkPhone(phone)) {
    setPhoneError("Enter a valid UK mobile number");
    return;
  }

  // Stub — no fetch()
  setSuccessMessage(
    "SMS verification is not yet available. This will send a verification text to the customer."
  );

  // Optional: clear form after stub success
  // setPhone(""); setReference("");
}
```

**Alternative stub:** disable the button entirely with helper text below it:

> "SMS verification will be available soon."

Either approach is fine — prefer the toast/banner on click so the button feels interactive during demos.

**Do not:**

- Call `POST /verifications` or any endpoint (doesn't exist)
- Integrate Twilio SDK
- Simulate SMS delivery or polling

---

## Recent verifications — empty state

Render a table (or card list) with reserved columns for future data:

| Phone | Reference | Status | Sent at |
|-------|-----------|--------|---------|

**MVP content:** empty state only.

```
No verifications yet.
Send your first verification above.
```

When Twilio is integrated later, this section will show the agent's verification history. Build the table structure now so columns don't need redesigning.

**Do not fetch verification history** — no backend endpoint exists.

---

## Session context footer

Below the recent verifications section (or in the page footer), show read-only context from session:

- `Signed in as {agent.email}`
- `Verified ✓` badge (agents on `/home` are always verified — they completed SSO)
- Optionally: `{organization.name}` if not already in the header

No API call needed.

---

## Header

| Element | Source |
|---------|--------|
| Org name (left) | `session.organization.name` |
| Agent name (right) | `session.agent.name` |
| Log out button | Clears session → `/login` |

```typescript
function handleLogout() {
  sessionStorage.removeItem("verime_session");
  navigate("/login");
}
```

---

## Environment variables

```env
VITE_API_URL=http://localhost:3000
```

Not used on this page for MVP (no API calls). Keep the env var in the project for login/callback.

---

## Local dev setup

1. **Backend:** `verime-server`, `npm run dev` (port 3000)
2. **Org with `sso_status = connected`** and at least one agent with `role: "agent"`
3. **Frontend:** `npm run dev` (port 5173)
4. Log in with an agent (not admin) email → should land on `/home`

### Bootstrap a test agent (backend terminal)

```bash
curl -X POST http://localhost:3000/agents \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "YOUR_ORG_ID",
    "name": "Test Agent",
    "email": "agent@yourdomain.com",
    "role": "agent"
  }'
```

---

## UI requirements

- Clean, minimal, professional — B2B call-centre tool
- **Desktop-first** — agents typically work on desktops during calls
- Phone input and Send Verification button should be prominent and easy to hit quickly
- Auto-focus phone input on page load
- Inline validation errors on phone field
- Success/info banner after stub Send Verification click
- Loading state optional on button click (brief, then show stub message)
- Logout in header
- Match visual style of existing login and admin pages (colours, spacing, typography)

---

## Out of scope (do not build)

- Twilio SMS integration or any verification API calls
- Verification history with real data
- Polling verification status
- Profile editing (admin manages agent records)
- Admin features or link to `/admin`
- Customer search or CRM integration
- Call notes
- Notifications or real-time updates
- International phone validation beyond basic UK mobile
- Password login
- Persistent login beyond sessionStorage
- Tests (unless trivial smoke test)

---

## Future integration notes (for context only — do not implement)

When Twilio is added to `verime-server`, this page will likely call:

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/verifications` | Send SMS to customer phone |
| `GET` | `/verifications` | List agent's recent verifications |

Expected request shape for `POST /verifications`:

```json
{
  "phone": "+447xxxxxxxxx",
  "reference": "POL-12345"
}
```

Design the form fields and table columns to match this future shape.

---

## Acceptance checklist

- [ ] Agent (`role: "agent"`) logs in → lands on `/home`
- [ ] Admin logs in → still lands on `/admin` (unchanged)
- [ ] `/home` without session → redirect to `/login`
- [ ] Header shows org name, agent name, logout
- [ ] Phone input auto-focuses on load
- [ ] Send Verification disabled when phone empty or invalid
- [ ] UK phone validation works (07xxx or +447xxx)
- [ ] Send Verification click shows stub message — **no API call**
- [ ] Optional reference field present and submittable with form
- [ ] Recent verifications table shows empty state
- [ ] Footer shows agent email and Verified badge
- [ ] Logout clears session and goes to `/login`
- [ ] Page matches style of existing app
- [ ] No password field anywhere

---

## Reference: backend repo

```
verime-server/
  src/routes/auth.ts              ← login + exchange (returns agent.role)
  src/routes/agents.ts            ← agent CRUD (admin only, not used here)
  docs/frontend-agent-prompt.md       ← original login prompt
  docs/frontend-admin-prompt.md       ← admin dashboard prompt
  docs/frontend-agent-dashboard-prompt.md  ← this file
  docs/auth/cheat-sheet.md            ← one-page auth mental model
```

Backend auth uses **standalone WorkOS SSO**, **not** AuthKit.

---

## Summary

Build the agent workspace at `/home`: a customer verification form (phone + optional reference + stubbed Send Verification button), session context in the header/footer, and an empty-state recent verifications table. No API calls on this page yet — Twilio comes later. Keep it fast and simple for agents on live calls.
