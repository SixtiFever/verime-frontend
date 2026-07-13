import { type FormEvent, useEffect, useRef, useState } from "react";
import { AuthLayout } from "../components/AuthLayout";
import { ApiError, submitVerifyCode, type VerifyTokenResponse } from "../lib/api";

interface OTPCredential extends Credential {
  code: string;
}

type PageState =
  | { status: "form" }
  | { status: "success"; data: VerifyTokenResponse }
  | { status: "error"; message: string };

export function VerifyCodePage() {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<PageState>({ status: "form" });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!("OTPCredential" in window)) return;

    const ac = new AbortController();
    const form = formRef.current;
    if (form) {
      form.addEventListener("submit", () => ac.abort(), { once: true });
    }

    navigator.credentials
      .get({
        otp: { transport: ["sms"] },
        signal: ac.signal,
      } as CredentialRequestOptions)
      .then((otp) => {
        const cred = otp as OTPCredential | null;
        if (cred?.code) {
          setCode(cred.code);
        }
      })
      .catch(() => {
        // user dismissed or unsupported — ignore
      });

    return () => ac.abort();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      setState({
        status: "error",
        message: "Please enter a valid 6-digit code.",
      });
      return;
    }

    setSubmitting(true);
    setState({ status: "form" });

    try {
      const data = await submitVerifyCode(trimmed);
      setState({ status: "success", data });
    } catch (err) {
      setState({
        status: "error",
        message:
          err instanceof ApiError
            ? err.message
            : "Could not reach the server.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (state.status === "success") {
    const { orgName, agentName } = state.data;

    return (
      <AuthLayout title="VeriMe">
        <p className="auth-subtitle">
          <strong>Verified</strong> — You are speaking with{" "}
          <strong>{agentName}</strong>
          {orgName ? (
            <>
              {" "}
              from <strong>{orgName}</strong>
            </>
          ) : (
            <> from your caller&apos;s organisation</>
          )}
          .
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Enter your verification code">
      <p className="auth-subtitle">
        VeriMe will never ask for your password, PIN, or personal details.
      </p>

      {state.status === "error" && (
        <div className="auth-error">{state.message}</div>
      )}

      <form ref={formRef} className="auth-form" onSubmit={handleSubmit}>
        <label className="auth-label" htmlFor="verify-code">
          6-digit code
        </label>
        <input
          id="verify-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="123456"
          className="auth-input verify-code-input"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          disabled={submitting}
          autoFocus
        />
        <button type="submit" className="auth-button" disabled={submitting}>
          {submitting ? "Verifying…" : "Verify"}
        </button>
      </form>
    </AuthLayout>
  );
}
