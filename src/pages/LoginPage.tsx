import { useState, type FormEvent } from "react";
import { AuthLayout } from "../components/AuthLayout";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Please enter a valid work email.");
      return;
    }
    setError(null);
    setLoading(true);
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/login?email=${encodeURIComponent(trimmed)}`;
  }

  return (
    <AuthLayout title="VeriMe">
      <p className="auth-subtitle">Sign in with your work email</p>

      <form onSubmit={handleSubmit} className="auth-form">
        <label htmlFor="email" className="auth-label">
          Work email
        </label>
        <input
          id="email"
          type="email"
          className="auth-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          disabled={loading}
          required
        />

        {error && <div className="auth-error">{error}</div>}

        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}
