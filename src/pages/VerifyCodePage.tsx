import { type FormEvent, useState } from "react";
import { useLocation } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { ApiError, submitVerifyCode, type VerifyTokenResponse } from "../lib/api";
import { VERIFY_PAGE_DISPLAY } from "../lib/constants";

type PageState =
  | { status: "form" }
  | { status: "success"; data: VerifyTokenResponse }
  | { status: "error"; message: string };

export function VerifyCodePage() {
  const location = useLocation();
  const redirectMessage = (location.state as { message?: string } | null)?.message;

  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [state, setState] = useState<PageState>({ status: "form" });

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
          You are speaking with <strong>{agentName}</strong>
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
      {redirectMessage && (
        <div className="verify-redirect-banner">{redirectMessage}</div>
      )}

      <div className="verify-trust-copy">
        <p>VeriMe will never send you a link.</p>
        <p>You should have typed this address yourself.</p>
        <p className="verify-page-url">{VERIFY_PAGE_DISPLAY}</p>
        <p>We will never ask for your password, PIN, or personal details.</p>
        <p className="verify-safety-line">
          Didn&apos;t expect this call? Hang up and verify independently.
        </p>
      </div>

      {state.status === "error" && (
        <div className="auth-error">{state.message}</div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
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
