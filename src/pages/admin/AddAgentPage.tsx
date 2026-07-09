import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { ApiError, createAgent } from "../../lib/api";
import { mapBackendError } from "../../lib/errors";
import { getSession } from "../../lib/session";

export function AddAgentPage() {
  const navigate = useNavigate();
  const session = getSession();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "agent">("agent");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Please enter a valid work email.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await createAgent({
        organizationId: session.organization.id,
        name: trimmedName,
        email: trimmedEmail,
        role,
      });
      navigate("/admin", {
        replace: true,
        state: {
          message:
            "Agent added. They can sign in at VeriMe using their work email once SSO is active.",
        },
      });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? mapBackendError(err.message)
          : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      <div className="admin-form-page">
        <h2 className="admin-section-title">Add agent</h2>

        <form onSubmit={handleSubmit} className="auth-form admin-form">
          <label htmlFor="name" className="auth-label">
            Name
          </label>
          <input
            id="name"
            type="text"
            className="auth-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={loading}
            required
          />

          <label htmlFor="email" className="auth-label">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@company.com"
            disabled={loading}
            required
          />
          <p className="admin-field-hint">Must match the email they use at your company IdP.</p>

          <label htmlFor="role" className="auth-label">
            Role
          </label>
          <select
            id="role"
            className="auth-input"
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "agent")}
            disabled={loading}
          >
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
          </select>

          {error && <div className="auth-error">{error}</div>}

          <div className="admin-form-actions">
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? "Adding…" : "Add agent"}
            </button>
            <Link to="/admin" className="auth-button auth-button-secondary admin-cancel-link">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
