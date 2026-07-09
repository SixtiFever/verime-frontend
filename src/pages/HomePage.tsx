import { useState, type FormEvent } from "react";
import { AgentLayout } from "../components/AgentLayout";
import { isValidUkPhone } from "../lib/phone";
import { formatSsoLabel } from "../lib/format";
import { getSession } from "../lib/session";

const STUB_SUCCESS_MESSAGE =
  "SMS verification is not yet available. This will send a verification text to the customer.";

export function HomePage() {
  const session = getSession();

  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    setPhoneError(null);
    setSubmitting(true);

    await new Promise((resolve) => setTimeout(resolve, 400));

    setSuccessMessage(STUB_SUCCESS_MESSAGE);
    setSubmitting(false);
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
              <tr>
                <td colSpan={4} className="agent-empty-cell">
                  <div className="admin-empty">
                    <p>No verifications yet.</p>
                    <p>Send your first verification above.</p>
                  </div>
                </td>
              </tr>
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
