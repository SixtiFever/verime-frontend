# Frontend: Wire Send Verification to Backend

Copy everything below the line into a new Cursor agent session in your **frontend project** (separate repo).

---

## Context

The VeriMe backend now exposes real verification endpoints. Twilio is **not** implemented yet — the backend logs the customer verify URL to the server console instead of sending SMS. Your job is to replace the stubbed "Send Verification" button on `/home` with a real API call, store the new JWT from login, and optionally add a minimal customer landing page at `/verify/:token`.

**Backend base URL:** `http://localhost:3000` (or your existing `API_URL` constant)

---

## Backend API contract (already implemented)

### Login change — store JWT

`POST /auth/exchange` response now includes a `token` field:

```json
{
  "agent": { "id", "organization_id", "name", "email", "role", ... },
  "organization": { "id", "name" },
  "authenticationMethod": "SSO",
  "sso": { "connectionId", "connectionName", "connectionType", "providerLabel" },
  "token": "eyJhbG..."
}
```

### Send verification

```
POST /verifications
Authorization: Bearer <token>
Content-Type: application/json

{ "phone": "+447123456789", "reference": "POL-12345" }
```

- `phone` — required, UK mobile
- `reference` — optional string

**201 response:**

```json
{
  "status": "sent",
  "phone": "+447123456789",
  "reference": "POL-12345",
  "expiresInSeconds": 300
}
```

**Errors:**

| Status | Meaning |
|--------|---------|
| 400 | Invalid or missing phone |
| 401 | Missing/invalid JWT — re-login |
| 403 | Agent not verified or not found |

The verify URL is **not** returned to the agent UI. Backend logs it for dev testing.

### Customer consume (optional frontend page)

```
GET /verify/:token
```

No auth header.

**200 response:**

```json
{
  "orgId": "...",
  "agentId": "...",
  "agentName": "Jane Agent",
  "jobTitle": "agent"
}
```

**410 response:**

```json
{ "error": "Link expired, already used, or invalid" }
```

---

## 1. Extend session types

Add `token` to `VeriMeSession`:

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
  sso?: {
    connectionId: string;
    connectionName: string;
    connectionType: string;
    providerLabel: string;
  };
  token: string;
};
```

Make `token` optional only for backward compat detection — if missing, treat as stale session and redirect to `/login`.

---

## 2. Store token at login

In the `/auth/callback` handler after `POST /auth/exchange`:

```typescript
sessionStorage.setItem(
  "verime_session",
  JSON.stringify({
    agent: data.agent,
    organization: data.organization,
    sso: data.sso,
    token: data.token,
  })
);
```

Agents with old sessions (no `token`) must re-login once.

---

## 3. Replace Send Verification stub on `/home`

**Remove** the stub that shows "SMS verification is not yet available."

**Implement** real submit handler:

```typescript
async function handleSendVerification(phone: string, reference: string) {
  if (!isValidUkPhone(phone)) {
    setPhoneError("Enter a valid UK mobile number");
    return;
  }

  const session = getSession();
  if (!session?.token) {
    sessionStorage.removeItem("verime_session");
    navigate("/login");
    return;
  }

  setIsSubmitting(true);
  setErrorMessage(null);
  setSuccessMessage(null);

  try {
    const digits = phone.replace(/\D/g, "");
    const normalizedPhone = digits.startsWith("44")
      ? `+${digits}`
      : `+44${digits.slice(1)}`;

    const res = await fetch(`${API_URL}/verifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        phone: normalizedPhone,
        reference: reference.trim() || undefined,
      }),
    });

    if (res.status === 201) {
      setSuccessMessage("Verification link sent to customer.");
      return;
    }

    if (res.status === 401) {
      sessionStorage.removeItem("verime_session");
      navigate("/login");
      return;
    }

    const body = await res.json().catch(() => ({}));
    setErrorMessage(body.error ?? "Failed to send verification.");
  } catch {
    setErrorMessage("Failed to send verification. Check your connection.");
  } finally {
    setIsSubmitting(false);
  }
}
```

**UX requirements:**

- Show loading spinner on button while submitting
- Disable button during request (and when phone invalid)
- Keep existing UK phone validation (`isValidUkPhone`)
- Success banner: "Verification link sent to customer."
- Do **not** show the verify URL to the agent

---

## 4. Optional — customer landing page `/verify/:token`

Add a minimal route for the URL the backend logs (e.g. `http://localhost:5173/verify/{token}`):

```typescript
// On mount
const { token } = useParams();
const res = await fetch(`${API_URL}/verify/${token}`);

if (res.status === 200) {
  const data = await res.json();
  // Show: "Verification started with {data.agentName}"
} else if (res.status === 410) {
  // Show: "This link has expired or already been used."
}
```

Bare-bones placeholder UI is fine. No auth required.

---

## What NOT to do

- Do not integrate Twilio SDK
- Do not call `GET /verifications` (not built yet)
- Do not change admin dashboard beyond storing `token` at login if admins also use `/auth/exchange`
- Do not display the verify URL in the agent UI

---

## Acceptance checklist

- [ ] `VeriMeSession` includes `token`
- [ ] Login callback persists `token` in `sessionStorage`
- [ ] Stale session (no token) redirects to `/login`
- [ ] Send Verification calls `POST /verifications` with Bearer token
- [ ] Loading state on button during request
- [ ] Success shows "Verification link sent to customer."
- [ ] 401 clears session and redirects to login
- [ ] 400/403 show error message from API
- [ ] (Optional) `/verify/:token` page handles 200 and 410

---

## Manual test (with backend running)

1. Clear `sessionStorage`, log in fresh as agent
2. Go to `/home`, enter UK mobile, click Send Verification
3. Confirm success banner in UI
4. Check backend terminal for log line with `verifyUrl`
5. Open that URL (or frontend `/verify/:token` if built)
6. Refresh same URL — should show expired/used message

---

## Reference: backend repo

```
verime-server/
  src/routes/verifications.ts   ← POST /verifications, GET /verify/:token
  src/routes/auth.ts            ← returns JWT token on /auth/exchange
  src/auth.ts                   ← Bearer JWT middleware
  services/verificationLink.js  ← Redis one-time tokens
```
