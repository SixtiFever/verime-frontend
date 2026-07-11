# Frontend: Fix Verify Page Stuck on "Opening verification link…"

Copy everything below the line into a new Cursor agent session in your **frontend project** (separate repo).

---

## Problem

The `/verify/:token` page hangs forever on **"Opening verification link…"** even though the backend successfully consumed the link.

Backend logs show **one** successful consume:

```
GET /verify/4X1bELe8...  → 200   ✅ (token consumed)
GET /verify/4X1bELe8...  → 410   (later — refresh or second navigation)
```

The API works. The UI never updates because React state is never set after the successful response.

---

## Root cause: React Strict Mode + bad `useEffect` pattern

A common "fix" for double-fetch combines two patterns that **break each other** in React 18 Strict Mode (dev):

```typescript
// ❌ BROKEN — causes infinite loading
if (fetchedRef.current) return;
fetchedRef.current = true;

useEffect(() => {
  // ...
  return () => {
    cancelled = true;  // Strict Mode unmount
  };
}, [token]);

// in fetch handler:
if (cancelled) return;  // skips setState
setState({ status: "success", data });
```

**What happens in dev:**

1. **First mount** — starts fetch, sets `fetchedRef = true`
2. **Strict Mode unmount** — cleanup sets `cancelled = true`
3. **Second mount** — `fetchedRef` is already `true` → **returns early, no fetch**
4. **First fetch completes** with `200` — but `cancelled === true` → **`setState` never runs**
5. UI stuck on loading forever

Backend still logs `200` because the HTTP request completed. The browser just never updates React.

---

## Backend contract (unchanged)

```
GET http://localhost:3000/verify/:token
```

No auth header.

| Status | Body |
|--------|------|
| **200** | `{ orgId, agentId, agentName, jobTitle? }` — token is **destroyed** (one-time use) |
| **410** | `{ error: "Link expired, already used, or invalid" }` |

Do not change the backend. Do not call this endpoint from anywhere except `/verify/:token`.

---

## Your task

Fix `/verify/:token` so a fresh link shows success on first open and never hangs on loading.

### Replace the broken pattern with a shared in-flight promise

Both Strict Mode mounts must await the **same** fetch — one network request, one consume, state updates correctly:

```typescript
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

type VerifyPayload = {
  orgId: string;
  agentId: string;
  agentName: string;
  jobTitle?: string;
};

type VerifyState =
  | { status: "loading" }
  | { status: "success"; data: VerifyPayload }
  | { status: "gone" }
  | { status: "error"; message: string };

export function VerifyPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<VerifyState>({ status: "loading" });
  const inflightByToken = useRef(new Map<string, Promise<VerifyState>>());

  useEffect(() => {
    if (!token) {
      setState({ status: "gone" });
      return;
    }

    let promise = inflightByToken.current.get(token);
    if (!promise) {
      promise = (async (): Promise<VerifyState> => {
        try {
          const res = await fetch(
            `${API_URL}/verify/${encodeURIComponent(token)}`
          );

          if (res.status === 200) {
            const data = (await res.json()) as VerifyPayload;
            return { status: "success", data };
          }

          if (res.status === 410) {
            return { status: "gone" };
          }

          const body = await res.json().catch(() => ({}));
          return {
            status: "error",
            message: body.error ?? "Something went wrong.",
          };
        } catch {
          return {
            status: "error",
            message: "Could not reach the server.",
          };
        }
      })();

      inflightByToken.current.set(token, promise);
    }

    let active = true;
    promise.then((next) => {
      if (active) setState(next);
    });

    return () => {
      active = false;
    };
  }, [token]);

  if (state.status === "loading") {
    return <p>Opening verification link…</p>;
  }

  if (state.status === "success") {
    return (
      <p>
        Verification started with <strong>{state.data.agentName}</strong>.
      </p>
    );
  }

  if (state.status === "gone") {
    return <p>This link has expired or already been used.</p>;
  }

  return <p>{state.message}</p>;
}
```

### Why this works

| Pattern | Strict Mode mount 1 | Strict Mode mount 2 |
|---------|---------------------|---------------------|
| Shared promise | Starts fetch, stores in Map | Reuses same promise from Map |
| `active` flag | Cleanup sets `active = false` | New mount sets `active = true`, receives result |
| Network | **One** `GET` → one Redis consume | No duplicate request |

### Do NOT use together

- `fetchedRef` that skips the second mount **and** a `cancelled` flag that blocks `setState`
- Automatic retry on 410 (token is already gone after first success)
- Calling `GET /verify/:token` from `/home` or any page other than `/verify/:token`

### If you already applied the previous double-fetch fix

Remove the `fetchedRef` early-return + `cancelled` combination from `docs/frontend-verify-double-fetch-fix-prompt.md` and replace it with the shared-promise pattern above.

---

## UI states

| State | Copy |
|-------|------|
| `loading` | "Opening verification link…" |
| `success` | "Verification started with **{agentName}**." |
| `gone` | "This link has expired or already been used." |
| `error` | Show `message` from state |

No login required. No agent session on this page.

---

## How to test

1. Backend at `http://localhost:3000`, frontend at `http://localhost:5173`
2. Log in as agent, send verification from `/home`
3. Copy **fresh** `verifyUrl` from backend terminal log
4. Open in incognito: `http://localhost:5173/verify/{token}`
5. **Expected:** Success message within ~1s — **not** stuck loading
6. **Backend log:** exactly **one** `GET /verify/... → 200` on first open
7. Refresh same URL → "expired or already used" (410)

**DevTools check if still broken:** Network tab → confirm `GET` returns 200 with JSON → if yes, it's a React state bug, not API/CORS.

---

## Acceptance checklist

- [ ] Fresh verify link shows success (not infinite loading)
- [ ] Backend shows only **one** `GET → 200` on first page load
- [ ] No combination of `fetchedRef` skip + `cancelled` blocking `setState`
- [ ] Shared in-flight promise (or equivalent) handles Strict Mode
- [ ] Refresh shows "expired/used" (410)
- [ ] Token passed with `encodeURIComponent(token)`

---

## Do NOT

- Change backend API
- Retry on 410
- Add Twilio
- Expect token to work more than once

---

## Reference

Backend repo `verime-server`:

- `GET /verify/:token` — one-time Redis consume
- `docs/frontend-verify-double-fetch-fix-prompt.md` — previous fix (superseded by this pattern)
- `docs/frontend-verification-integration-prompt.md` — full Send Verification integration

---

## Summary

The verify page hangs because Strict Mode causes the first fetch's result to be discarded while the second mount skips fetching. Fix with a **shared in-flight promise per token** so one request runs and the active mount receives the result. Backend is working; this is frontend-only.
