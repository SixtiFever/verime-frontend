import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { exchangeCode, ApiError } from "../lib/api";
import { mapBackendError } from "../lib/errors";
import { setSession } from "../lib/session";

function getInitialError(ssoError: string | null, code: string | null): string | null {
  if (ssoError) {
    return mapBackendError(`SSO authentication failed: ${ssoError}`);
  }
  if (!code) {
    return "Missing sign-in code. Please try again.";
  }
  return null;
}

export function CallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const code = searchParams.get("code");
  const ssoError = searchParams.get("error");
  const initialError = getInitialError(ssoError, code);

  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialError);

  useEffect(() => {
    if (initialError || !code) return;

    exchangeCode(code)
      .then((data) => {
        setSession({
          agent: data.agent,
          organization: data.organization,
          sso: data.sso,
        });
        if (data.agent.role === "admin") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/home", { replace: true });
        }
      })
      .catch((err) => {
        const message =
          err instanceof ApiError
            ? mapBackendError(err.message)
            : "Something went wrong. Please try again.";
        setExchangeError(message);
        setLoading(false);
      });
  }, [code, initialError, navigate]);

  const error = initialError ?? exchangeError;

  if (loading && !error) {
    return (
      <AuthLayout title="VeriMe">
        <p className="auth-subtitle">Signing you in…</p>
      </AuthLayout>
    );
  }

  if (error) {
    return (
      <AuthLayout title="VeriMe">
        <div className="auth-error">{error}</div>
        <Link to="/login" className="auth-link">
          Try again
        </Link>
      </AuthLayout>
    );
  }

  return null;
}
