import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { ApiError, listAgents, updateAgent } from "../../lib/api";
import { mapBackendError } from "../../lib/errors";
import { getSession } from "../../lib/session";
import type { Agent } from "../../types/session";

export function EditAgentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const organizationId = getSession()?.organization.id;

  const [agent, setAgent] = useState<Agent | null>(
    (location.state as { agent?: Agent } | null)?.agent ?? null,
  );
  const [name, setName] = useState(agent?.name ?? "");
  const [email, setEmail] = useState(agent?.email ?? "");
  const [role, setRole] = useState<"admin" | "agent">(agent?.role ?? "agent");
  const [loadingAgent, setLoadingAgent] = useState(!agent);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const emailLocked = agent?.verification_status === "verified";

  useEffect(() => {
    if (agent || !id || !organizationId) return;

    setLoadingAgent(true);
    listAgents(organizationId)
      .then((agents) => {
        const found = agents.find((a) => a.id === id);
        if (!found) {
          setError("Agent not found.");
          return;
        }
        setAgent(found);
        setName(found.name);
        setEmail(found.email);
        setRole(found.role);
      })
      .catch((err) => {
        const message =
          err instanceof ApiError
            ? mapBackendError(err.message)
            : "Something went wrong. Please try again.";
        setError(message);
      })
      .finally(() => setLoadingAgent(false));
  }, [agent, id, organizationId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agent) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (!emailLocked && (!trimmedEmail || !trimmedEmail.includes("@"))) {
      setError("Please enter a valid work email.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const body: { name: string; role: "admin" | "agent"; email?: string } = {
        name: trimmedName,
        role,
      };
      if (!emailLocked) {
        body.email = trimmedEmail;
      }

      await updateAgent(agent.id, body);
      navigate("/admin", {
        replace: true,
        state: { message: "Agent updated." },
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

  if (loadingAgent) {
    return (
      <AdminLayout>
        <p className="admin-status">Loading agent…</p>
      </AdminLayout>
    );
  }

  if (!agent && error) {
    return (
      <AdminLayout>
        <div className="admin-error-block">
          <div className="auth-error">{error}</div>
          <Link to="/admin" className="auth-link">
            Back to agents
          </Link>
        </div>
      </AdminLayout>
    );
  }

  if (!agent) {
    return (
      <AdminLayout>
        <div className="admin-error-block">
          <div className="auth-error">Agent not found.</div>
          <Link to="/admin" className="auth-link">
            Back to agents
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-form-page">
        <h2 className="admin-section-title">Edit agent</h2>

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
            disabled={loading || emailLocked}
            required
          />
          {emailLocked && (
            <p className="admin-field-hint">Email cannot be changed after the agent has signed in.</p>
          )}

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
              {loading ? "Saving…" : "Save changes"}
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
