/**
 * Permissions & roles (docs/spec/06-auth-and-permission-matrix.md §2).
 *
 * Codes are `<module>.<action>`. The API guards every mutating route on these;
 * the UI hides controls by the same codes, but the server stays the source of
 * truth — the UI never grants access the API would refuse.
 */

export const PERMISSION_ACTIONS = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "post",
  "reverse",
  "close",
  "reopen",
  "export",
  "print",
] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSIONS = {
  // Company & organisation
  COMPANY_VIEW: "company.view",
  COMPANY_CREATE: "company.create",
  COMPANY_EDIT: "company.edit",
  COMPANY_DELETE: "company.delete",

  // Users, roles
  USER_VIEW: "user.view",
  USER_CREATE: "user.create",
  USER_EDIT: "user.edit",
  USER_DELETE: "user.delete",
  ROLE_VIEW: "role.view",
  ROLE_EDIT: "role.edit",

  // Chart of accounts
  ACCOUNT_VIEW: "account.view",
  ACCOUNT_CREATE: "account.create",
  ACCOUNT_EDIT: "account.edit",
  ACCOUNT_DELETE: "account.delete",

  // Fiscal periods
  PERIOD_VIEW: "period.view",
  PERIOD_CREATE: "period.create",
  PERIOD_CLOSE: "period.close",
  PERIOD_REOPEN: "period.reopen",

  // Journals
  JOURNAL_VIEW: "journal.view",
  JOURNAL_CREATE: "journal.create",
  JOURNAL_EDIT: "journal.edit",
  JOURNAL_DELETE: "journal.delete",
  JOURNAL_POST: "journal.post",
  JOURNAL_REVERSE: "journal.reverse",

  // Ledger & reports
  LEDGER_VIEW: "ledger.view",
  REPORT_VIEW: "report.view",
  REPORT_EXPORT: "report.export",

  // Audit
  AUDIT_VIEW: "audit.view",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  "company.view": "View company profiles",
  "company.create": "Create a company",
  "company.edit": "Edit company settings",
  "company.delete": "Delete a company",
  "user.view": "View users",
  "user.create": "Invite or create users",
  "user.edit": "Edit users and assign roles",
  "user.delete": "Deactivate users",
  "role.view": "View roles and permissions",
  "role.edit": "Change role permissions",
  "account.view": "View the chart of accounts",
  "account.create": "Create ledger accounts",
  "account.edit": "Edit ledger accounts",
  "account.delete": "Delete or archive ledger accounts",
  "period.view": "View fiscal periods",
  "period.create": "Create fiscal periods",
  "period.close": "Close a fiscal period",
  "period.reopen": "Reopen a closed fiscal period",
  "journal.view": "View journal entries",
  "journal.create": "Create draft journal entries",
  "journal.edit": "Edit draft journal entries",
  "journal.delete": "Delete draft journal entries",
  "journal.post": "Post journal entries to the ledger",
  "journal.reverse": "Reverse posted journal entries",
  "ledger.view": "View the general ledger",
  "report.view": "View financial reports",
  "report.export": "Export financial reports",
  "audit.view": "View the audit log",
};

export const ROLES = [
  "SuperAdmin",
  "Admin",
  "Accountant",
  "FinanceManager",
  "Auditor",
  "Sales",
  "Purchaser",
  "HR",
  "Employee",
  "ReadOnly",
] as const;
export type RoleName = (typeof ROLES)[number];

export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  SuperAdmin: "Unrestricted access across the whole organisation.",
  Admin: "Administers companies, users, roles and settings.",
  Accountant: "Maintains the chart of accounts and posts to the ledger.",
  FinanceManager: "Posts and reverses entries, closes and reopens periods.",
  Auditor: "Read-only across financial data, plus the audit log. Never mutates.",
  Sales: "Creates sales documents; no ledger access.",
  Purchaser: "Creates purchasing documents; no ledger access.",
  HR: "Manages people and payroll.",
  Employee: "Submits their own expense claims.",
  ReadOnly: "Views reports and records; changes nothing.",
};

const READ_ONLY_FINANCIALS: Permission[] = [
  PERMISSIONS.COMPANY_VIEW,
  PERMISSIONS.ACCOUNT_VIEW,
  PERMISSIONS.PERIOD_VIEW,
  PERMISSIONS.JOURNAL_VIEW,
  PERMISSIONS.LEDGER_VIEW,
  PERMISSIONS.REPORT_VIEW,
  PERMISSIONS.REPORT_EXPORT,
];

/**
 * Role → permission matrix for Phase 1 modules. Mirrors the matrix in
 * docs/spec/06; custom per-tenant roles arrive in Phase 6.
 */
export const ROLE_PERMISSIONS: Record<RoleName, Permission[]> = {
  SuperAdmin: ALL_PERMISSIONS,

  Admin: ALL_PERMISSIONS,

  Accountant: [
    PERMISSIONS.COMPANY_VIEW,
    PERMISSIONS.ACCOUNT_VIEW,
    PERMISSIONS.ACCOUNT_CREATE,
    PERMISSIONS.ACCOUNT_EDIT,
    PERMISSIONS.ACCOUNT_DELETE,
    PERMISSIONS.PERIOD_VIEW,
    PERMISSIONS.PERIOD_CREATE,
    PERMISSIONS.JOURNAL_VIEW,
    PERMISSIONS.JOURNAL_CREATE,
    PERMISSIONS.JOURNAL_EDIT,
    PERMISSIONS.JOURNAL_DELETE,
    PERMISSIONS.JOURNAL_POST,
    PERMISSIONS.JOURNAL_REVERSE,
    PERMISSIONS.LEDGER_VIEW,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
  ],

  FinanceManager: [
    PERMISSIONS.COMPANY_VIEW,
    PERMISSIONS.ACCOUNT_VIEW,
    PERMISSIONS.PERIOD_VIEW,
    PERMISSIONS.PERIOD_CREATE,
    PERMISSIONS.PERIOD_CLOSE,
    PERMISSIONS.PERIOD_REOPEN,
    PERMISSIONS.JOURNAL_VIEW,
    PERMISSIONS.JOURNAL_CREATE,
    PERMISSIONS.JOURNAL_EDIT,
    PERMISSIONS.JOURNAL_DELETE,
    PERMISSIONS.JOURNAL_POST,
    PERMISSIONS.JOURNAL_REVERSE,
    PERMISSIONS.LEDGER_VIEW,
    PERMISSIONS.REPORT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.USER_VIEW,
  ],

  // Read-only across financial data *plus* the audit log; never mutates.
  Auditor: [...READ_ONLY_FINANCIALS, PERMISSIONS.AUDIT_VIEW, PERMISSIONS.USER_VIEW],

  Sales: [PERMISSIONS.COMPANY_VIEW],
  Purchaser: [PERMISSIONS.COMPANY_VIEW],
  HR: [PERMISSIONS.COMPANY_VIEW],
  Employee: [PERMISSIONS.COMPANY_VIEW],

  ReadOnly: READ_ONLY_FINANCIALS,
};

/** Split `"journal.post"` into its module and action halves. */
export function parsePermission(code: string): { module: string; action: string } {
  const [module = code, action = "view"] = code.split(".");
  return { module, action };
}

/** `true` when the effective permission set allows every required code. */
export function hasPermission(granted: readonly string[], ...required: string[]): boolean {
  if (required.length === 0) return true;
  const set = new Set(granted);
  return required.every((code) => set.has(code));
}

/** `true` when the effective permission set allows at least one code. */
export function hasAnyPermission(granted: readonly string[], ...required: string[]): boolean {
  if (required.length === 0) return true;
  const set = new Set(granted);
  return required.some((code) => set.has(code));
}

/** Union of the permissions carried by the given roles. */
export function permissionsForRoles(roles: readonly string[]): Permission[] {
  const set = new Set<Permission>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role as RoleName] ?? []) set.add(permission);
  }
  return [...set];
}
