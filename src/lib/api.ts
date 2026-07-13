import type { Agent, ExchangeResponse } from "../types/session";

export const API_URL = import.meta.env.VITE_API_URL as string;

if (!API_URL) {
  console.warn("VITE_API_URL is not set. API calls will fail.");
}

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseError(res: Response, fallback: string): Promise<never> {
  try {
    const body = await res.json();
    throw new ApiError(body.error ?? fallback, res.status);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(fallback, res.status);
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

export type SendVerificationResponse = {
  status: "sent";
  phone: string;
  reference?: string;
  expiresInSeconds: number;
};

export type VerifyTokenResponse = {
  orgId: string;
  orgName?: string;
  agentId: string;
  agentName: string;
  jobTitle?: string;
};

export type SendVerificationBody = {
  phone: string;
  reference?: string;
};

export type Verification = {
  id: string;
  customer_phone: string;
  reference: string | null;
  status: "sent" | "opened" | "expired";
  sent_at: string;
  opened_at: string | null;
  expires_at: string;
};

export async function sendVerification(
  token: string,
  body: SendVerificationBody,
): Promise<SendVerificationResponse> {
  const res = await fetch(`${API_URL}/verifications`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 201) {
    return res.json() as Promise<SendVerificationResponse>;
  }

  return parseError(res, "Failed to send verification.");
}

export async function listVerifications(token: string): Promise<Verification[]> {
  const res = await fetch(`${API_URL}/verifications`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    await parseError(res, "Failed to load verifications.");
  }

  return res.json();
}

export async function submitVerifyCode(code: string): Promise<VerifyTokenResponse> {
  const res = await fetch(`${API_URL}/verify-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: code.trim() }),
  });

  if (res.ok) {
    return res.json() as Promise<VerifyTokenResponse>;
  }

  const fallbacks: Record<number, string> = {
    400: "Please enter a valid 6-digit code.",
    410: "This code is invalid or has expired.",
    429: "Too many attempts. Please wait a few minutes and try again.",
  };

  return parseError(res, fallbacks[res.status] ?? "Something went wrong.");
}
