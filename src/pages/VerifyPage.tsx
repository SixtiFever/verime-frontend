import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { API_URL } from "../lib/api";

type VerifyPayload = {
  orgId: string;
  orgName?: string;
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
          const res = await fetch(`${API_URL}/verify/${encodeURIComponent(token)}`);

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
    return (
      <AuthLayout title="VeriMe">
        <p className="auth-subtitle">Checking this link…</p>
      </AuthLayout>
    );
  }

  if (state.status === "success") {
    const { orgName, agentName, jobTitle } = state.data;

    return (
      <AuthLayout title="VeriMe">
        <p className="auth-subtitle">
          {orgName ? (
            <>
              This call was initiated by <strong>{orgName}</strong>.
            </>
          ) : (
            <>This call was initiated on behalf of your caller&apos;s organisation.</>
          )}
        </p>
        <p className="auth-subtitle">
          <strong>{agentName}</strong>
          {jobTitle ? ` · ${jobTitle}` : null}
        </p>
      </AuthLayout>
    );
  }

  if (state.status === "gone") {
    return (
      <AuthLayout title="VeriMe">
        <div className="auth-error">This link has expired or has already been used.</div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="VeriMe">
      <div className="auth-error">{state.message}</div>
    </AuthLayout>
  );
}
