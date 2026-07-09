export function mapBackendError(error: string): string {
  if (error.includes("No VeriMe account")) {
    return "We couldn't find a VeriMe account for this email. Contact your administrator.";
  }
  if (error.includes("SSO is not yet active") || error.includes("not active")) {
    return "Your organisation hasn't finished setting up SSO with VeriMe yet.";
  }
  if (error.includes("multiple organizations")) {
    return "This email is linked to more than one organisation. Contact support.";
  }
  if (error.includes("SSO authentication failed")) {
    return "Sign-in was cancelled or failed. Please try again.";
  }
  if (error.includes("already registered") || error.includes("already taken")) {
    return "This email is already registered for this organisation.";
  }
  if (error.includes("Enterprise SSO connection must be active")) {
    return "Your organisation's SSO connection must be active before agents can be added.";
  }
  if (error.includes("Email cannot be changed")) {
    return "Email cannot be changed after the agent has signed in.";
  }
  return error || "Something went wrong. Please try again.";
}
