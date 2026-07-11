# Frontend: Recent Verifications Audit Trail

## Context

The VeriMe backend now persists every outbound verification in Postgres and exposes a history API. Twilio is **still not implemented** — the backend logs the verify URL to the server console (SMS stub).

Your job is to wire the **Recent verifications** table on `/home` to real data, and handle the small change to the `POST /verifications` response.

**Backend base URL:** `http://localhost:3000` (or your existing `API_URL` constant)

**Auth:** All agent endpoints require `Authorization: Bearer ${session.token}` from `sessionStorage`.

---

## API contract

### Send verification (updated response)

```
POST /verifications
Authorization: Bearer <token>
Content-Type: application/json

{ "phone": "+447123456789", "reference": "POL-12345" }
```

**201 response** (now includes `id`):

```json
{
  "id": "uuid",
  "status": "sent",
  "phone": "+447123456789",
  "reference": "POL-12345",
  "expiresInSeconds": 300
}
```

After a successful send, **refetch** the recent verifications list (or prepend optimistically — refetch is simpler).

### List recent verifications (new)

```
GET /verifications
Authorization: Bearer <token>
```

Returns the **authenticated agent's own** verifications only (not org-wide), newest first, limit 50.

**200 response:**

```json
[
  {
    "id": "uuid",
    "customer_phone": "+447123456789",
    "reference": "POL-12345",
    "status": "sent",
    "sent_at": "2026-07-09T20:00:00.000Z",
    "opened_at": null,
    "expires_at": "2026-07-09T20:05:00.000Z"
  }
]
```

**Status values:**

| Status | Meaning | Badge suggestion |
|--------|---------|------------------|
| `sent` | Link created, not yet opened by customer | Pending / Sent |
| `opened` | Customer opened the verification link | Opened |
| `expired` | Link TTL passed without being opened | Expired |
| `verified` | Full process complete | **Do not show yet** — backend does not set this in current slice |

---

## Your task

### 1. Fetch recent verifications on `/home`

On page load (and after successful Send Verification):

```typescript
const session = getSession();
if (!session?.token) {
  navigate("/login");
  return;
}

const res = await fetch(`${API_URL}/verifications`, {
  headers: { Authorization: `Bearer ${session.token}` },
});

if (res.status === 401) {
  sessionStorage.removeItem("verime_session");
  navigate("/login");
  return;
}

if (!res.ok) {
  // show non-blocking error for history fetch
  return;
}

const verifications = await res.json();
```

### 2. Replace empty state with table

Use the columns already reserved in the agent dashboard design:

| Phone | Reference | Status | Sent at |
|-------|-----------|--------|---------|

Map API fields:

- Phone → `customer_phone`
- Reference → `reference` or "—" if null
- Status → badge from `status` (`sent`, `opened`, `expired`)
- Sent at → format `sent_at` (locale date/time)

If the list is empty, keep the existing empty state:

> No verifications yet. Send your first verification above.

### 3. Refetch after send

In the Send Verification success handler, after `201`:

```typescript
await fetchRecentVerifications(); // or inline the GET call
```

### 4. Customer verify page copy (unchanged)

- Org-trust framing: "This call was initiated by [Organisation]"
- `opened` in the audit table does **not** mean show "fully verified" on the customer page
- Customer page scope is unchanged — see `docs/frontend-verify-loading-hang-fix-prompt.md` if still fixing the loading hang

---

## Types (suggested)

```typescript
type VerificationStatus = "sent" | "opened" | "expired" | "verified";

type VerificationRecord = {
  id: string;
  customer_phone: string;
  reference: string | null;
  status: VerificationStatus;
  sent_at: string;
  opened_at: string | null;
  expires_at: string;
};
```

Treat `verified` as a future status — no special UI required until backend sets it.

---

## Do NOT

- Integrate Twilio
- Poll for status changes (optional later)
- Show org-wide verifications (list is agent-scoped only)
- Display the verify URL to the agent
- Change admin dashboard unless admins also use `/home` send flow

---

## Acceptance checklist

- [ ] `/home` fetches `GET /verifications` on load with Bearer token
- [ ] Table shows phone, reference, status badge, sent_at
- [ ] Empty state when array is empty
- [ ] After successful send, list refreshes and new row appears as `sent`
- [ ] Opening customer link (backend) eventually shows row as `opened` after refetch
- [ ] 401 on list fetch clears session and redirects to login
- [ ] No "verified" badge until backend supports it

---

## Manual test

1. Backend running, agent logged in with fresh session (JWT)
2. `/home` shows empty state or existing rows
3. Send verification → row appears with status `sent`
4. Open verify URL from backend log → customer page works
5. Refresh `/home` → row status `opened`, `opened_at` populated in API (display optional)

---

## Reference: backend repo

```
verime-server/
  migrations/1783624000000_create-verifications-table.js
  src/verification-store.ts          ← Postgres audit queries
  src/routes/verifications.ts        ← POST, GET list, GET /verify/:token
  docs/frontend-verification-integration-prompt.md
```

---

## Summary

Wire the Recent verifications table on `/home` to `GET /verifications`. Refetch after send. Show honest status badges (`sent` / `opened` / `expired`). SMS remains a backend log stub — no frontend changes for delivery.
