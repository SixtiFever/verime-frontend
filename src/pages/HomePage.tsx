import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AgentLayout } from "../components/AgentLayout";
import { ApiError, listVerifications, sendVerification, type Verification } from "../lib/api";
import {
  formatCustomerVerificationStatus,
  formatDateTime,
  formatSsoLabel,
} from "../lib/format";
import { isValidUkPhone, normalizeUkPhone } from "../lib/phone";
import { clearSession, getSession } from "../lib/session";

export function HomePage() {
  const session = getSession();
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [verificationsLoading, setVerificationsLoading] = useState(true);
  const [verificationsError, setVerificationsError] = useState<string | null>(null);

  const fetchVerifications = useCallback(async () => {
    const token = session?.token;
    if (!token) return;

    setVerificationsLoading(true);
    setVerificationsError(null);

    try {
      const data = await listVerifications(token);
      setVerifications(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        navigate("/login");
        return;
      }

      setVerificationsError(
        err instanceof ApiError
          ? err.message
          : "Failed to load verifications. Check your connection.",
      );
    } finally {
      setVerificationsLoading(false);
    }
  }, [navigate, session?.token]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  if (!session) {
    return null;
  }

  const { agent } = session;
  const ssoLabel = formatSsoLabel(session.sso);
  const trimmedPhone = phone.trim();
  const canSubmit = trimmedPhone.length > 0 && isValidUkPhone(trimmedPhone) && !submitting;

  function validatePhone(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (!isValidUkPhone(trimmed)) return "Enter a valid UK mobile number";
    return null;
  }

  function handlePhoneBlur() {
    setPhoneError(validatePhone(phone));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const error = validatePhone(phone);
    if (error) {
      setPhoneError(error);
      return;
    }

    const token = session?.token;
    if (!token) {
      clearSession();
      navigate("/login");
      return;
    }

    setPhoneError(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSubmitting(true);

    try {
      await sendVerification(token, {
        phone: normalizeUkPhone(phone),
        reference: reference.trim() || undefined,
      });
      setSuccessMessage("Verification link sent to customer.");
      await fetchVerifications();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        navigate("/login");
        return;
      }

      setErrorMessage(
        err instanceof ApiError
          ? err.message
          : "Failed to send verification. Check your connection.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AgentLayout>
      {successMessage && (
        <div className="admin-banner">
          {successMessage}
          <button type="button" className="admin-banner-dismiss" onClick={() => setSuccessMessage(null)}>
            ×
          </button>
        </div>
      )}

      <section className="agent-section">
        <h2 className="admin-section-title">Customer verification</h2>
        <div className="agent-verification-card">
          <form onSubmit={handleSubmit} className="auth-form">
            <label htmlFor="phone" className="auth-label">
              Customer phone number
            </label>
            <input
              id="phone"
              type="tel"
              className="auth-input"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) setPhoneError(null);
              }}
              onBlur={handlePhoneBlur}
              placeholder="07xxx xxxxxx"
              autoComplete="tel"
              autoFocus
              disabled={submitting}
              required
            />
            {phoneError && <div className="auth-error">{phoneError}</div>}

            <label htmlFor="reference" className="auth-label">
              Reference (optional)
            </label>
            <input
              id="reference"
              type="text"
              className="auth-input"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Account or policy number"
              disabled={submitting}
            />
            <p className="admin-field-hint">Optional — helps identify the customer on your call</p>

            {errorMessage && <div className="auth-error">{errorMessage}</div>}

            <div className="agent-form-actions">
              <button type="submit" className="auth-button" disabled={!canSubmit}>
                {submitting ? "Sending…" : "Send Verification"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="agent-section">
        <h2 className="admin-section-title">Recent verifications</h2>
        {verificationsError && <div className="auth-error">{verificationsError}</div>}
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Phone</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Sent at</th>
              </tr>
            </thead>
            <tbody>
              {verificationsLoading ? (
                <tr>
                  <td colSpan={4} className="agent-empty-cell">
                    <div className="admin-empty">
                      <p>Loading verifications…</p>
                    </div>
                  </td>
                </tr>
              ) : verifications.length === 0 ? (
                <tr>
                  <td colSpan={4} className="agent-empty-cell">
                    <div className="admin-empty">
                      <p>No verifications yet.</p>
                      <p>Send your first verification above.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                verifications.map((verification) => (
                  <tr key={verification.id}>
                    <td>{verification.customer_phone}</td>
                    <td>{verification.reference ?? "—"}</td>
                    <td>
                      <span className={`badge badge-${verification.status}`}>
                        {formatCustomerVerificationStatus(verification.status)}
                      </span>
                    </td>
                    <td>{formatDateTime(verification.sent_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="agent-footer">
        <span>Signed in as {agent.email}</span>
        {ssoLabel && <span className="session-sso-label">{ssoLabel}</span>}
      </footer>
    </AgentLayout>
  );
}
