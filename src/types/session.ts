export type Agent = {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  role: "admin" | "agent";
  verification_status: "pending" | "verified";
  verified_at: string | null;
  workos_user_id: string | null;
  created_at: string;
};

export type Organization = {
  id: string;
  name: string;
  logoUrl: string | null;
};

export type SsoConnectionInfo = {
  connectionId: string;
  connectionName: string;
  connectionType: string;
  providerLabel: string;
};

export type VeriMeSession = {
  agent: Agent;
  organization: Organization;
  sso?: SsoConnectionInfo;
  token: string;
};

export type ExchangeResponse = {
  agent: Agent;
  organization: Organization;
  authenticationMethod: "SSO";
  sso?: SsoConnectionInfo;
  token: string;
};
