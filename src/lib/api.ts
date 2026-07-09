import type { Agent, ExchangeResponse } from "../types/session";

export const API_URL = import.meta.env.VITE_API_URL as string;

if (!API_URL) {
  console.warn("VITE_API_URL is not set. API calls will fail.");
}

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(res: Response, fallback: string): Promise<never> {
  try {
    const body = await res.json();
    throw new ApiError(body.error ?? fallback);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(fallback);
  }
}

export async function exchangeCode(code: string): Promise<ExchangeResponse> {
  const res = await fetch(`${API_URL}/auth/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    await parseError(res, "Failed to complete sign-in.");
  }

  return res.json();
}

export async function listAgents(organizationId: string): Promise<Agent[]> {
  const res = await fetch(
    `${API_URL}/agents?organizationId=${encodeURIComponent(organizationId)}`,
  );

  if (!res.ok) {
    await parseError(res, "Failed to load agents.");
  }

  return res.json();
}

export type CreateAgentBody = {
  organizationId: string;
  name: string;
  email: string;
  role?: "admin" | "agent";
};

export async function createAgent(body: CreateAgentBody): Promise<Agent> {
  const res = await fetch(`${API_URL}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    await parseError(res, "Failed to add agent.");
  }

  return res.json();
}

export type UpdateAgentBody = {
  name?: string;
  email?: string;
  role?: "admin" | "agent";
};

export async function updateAgent(id: string, body: UpdateAgentBody): Promise<Agent> {
  const res = await fetch(`${API_URL}/agents/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    await parseError(res, "Failed to update agent.");
  }

  return res.json();
}

export async function deleteAgent(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/agents/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    await parseError(res, "Failed to remove agent.");
  }
}
