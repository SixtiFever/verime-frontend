import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AdminLayout } from "../../components/AdminLayout";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ApiError, deleteAgent, listAgents } from "../../lib/api";
import { mapBackendError } from "../../lib/errors";
import { formatDate, formatRole, formatVerificationStatus } from "../../lib/format";
import { clearSession, getSession } from "../../lib/session";
import type { Agent } from "../../types/session";

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getSession();
  const organizationId = session?.organization.id;
  const currentAgentId = session?.agent.id;

  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const message = (location.state as { message?: string } | null)?.message;
    if (!message) return;
    setSuccessMessage(message);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const fetchAgents = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listAgents(organizationId);
      setAgents(data);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? mapBackendError(err.message)
          : "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  function handleEdit(agent: Agent) {
    navigate(`/admin/agents/${agent.id}/edit`, { state: { agent } });
  }

  async function handleConfirmDelete() {
    if (!agentToDelete) return;
    const isSelfDelete = agentToDelete.id === currentAgentId;
    setDeleting(true);
    try {
      await deleteAgent(agentToDelete.id);
      setAgentToDelete(null);
      if (isSelfDelete) {
        clearSession();
        navigate("/login", { replace: true });
        return;
      }
      setSuccessMessage("Agent removed.");
      await fetchAgents();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? mapBackendError(err.message)
          : "Something went wrong. Please try again.";
      setError(message);
      setAgentToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminLayout>
      {successMessage && (
        <div className="admin-banner">
          {successMessage}
          <button type="button" className="admin-banner-dismiss" onClick={() => setSuccessMessage(null)}>
            ×
          </button>
        </div>
      )}

      <div className="admin-section-header">
        <h2 className="admin-section-title">Agents</h2>
        <Link to="/admin/agents/new" className="auth-button admin-add-button">
          + Add agent
        </Link>
      </div>

      {loading && <p className="admin-status">Loading agents…</p>}

      {error && !loading && (
        <div className="admin-error-block">
          <div className="auth-error">{error}</div>
          <button type="button" className="auth-button auth-button-secondary" onClick={fetchAgents}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && agents.length === 0 && (
        <p className="admin-empty">No agents yet. Add your first agent to get started.</p>
      )}

      {!loading && !error && agents.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Verified at</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const isCurrentUser = agent.id === currentAgentId;
                return (
                  <tr key={agent.id} className={isCurrentUser ? "row-current" : undefined}>
                    <td>
                      {agent.name}
                      {isCurrentUser && <span className="admin-you-label"> (You)</span>}
                    </td>
                    <td>{agent.email}</td>
                    <td>
                      <span className={`badge badge-${agent.role}`}>{formatRole(agent.role)}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${agent.verification_status}`}>
                        {formatVerificationStatus(agent.verification_status)}
                      </span>
                    </td>
                    <td>{formatDate(agent.verified_at)}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button" className="admin-action-btn" onClick={() => handleEdit(agent)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="admin-action-btn admin-action-danger"
                          onClick={() => setAgentToDelete(agent)}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {agentToDelete && (
        <ConfirmDialog
          title="Remove agent"
          message={
            <>
              <p>
                Remove <strong>{agentToDelete.name}</strong> ({agentToDelete.email})?
              </p>
              {agentToDelete.id === currentAgentId && (
                <p className="confirm-dialog-warning">
                  You are removing your own account. You will be signed out and unable to access the admin
                  dashboard.
                </p>
              )}
            </>
          }
          confirmLabel="Remove"
          loading={deleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => setAgentToDelete(null)}
        />
      )}
    </AdminLayout>
  );
}
