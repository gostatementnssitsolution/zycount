export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
  /** Company ids this user has been granted access to. */
  companies: string[];
}

export interface ClientContext {
  ipAddress: string | null;
  userAgent: string | null;
}
