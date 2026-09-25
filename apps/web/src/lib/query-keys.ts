/**
 * Query keys, centralised so an invalidation can never miss a cache entry.
 *
 * Every company-scoped key carries the company id, so switching company
 * swaps the whole cached view rather than leaking one company's data into
 * another's screen.
 */
export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
    sessions: ["auth", "sessions"] as const,
    loginHistory: ["auth", "login-history"] as const,
  },

  companies: {
    all: ["companies"] as const,
    detail: (id: string) => ["companies", id] as const,
    stats: (id: string) => ["companies", id, "stats"] as const,
  },

  accounts: {
    all: (companyId: string) => ["accounts", companyId] as const,
    list: (companyId: string, filters: unknown) => ["accounts", companyId, "list", filters] as const,
    tree: (companyId: string, includeInactive: boolean) =>
      ["accounts", companyId, "tree", includeInactive] as const,
    detail: (companyId: string, id: string) => ["accounts", companyId, id] as const,
  },

  periods: {
    all: (companyId: string) => ["periods", companyId] as const,
    list: (companyId: string, year?: number) => ["periods", companyId, "list", year ?? null] as const,
    detail: (companyId: string, id: string) => ["periods", companyId, id] as const,
    readiness: (companyId: string, id: string) => ["periods", companyId, id, "readiness"] as const,
  },

  journals: {
    all: (companyId: string) => ["journals", companyId] as const,
    list: (companyId: string, filters: unknown) => ["journals", companyId, "list", filters] as const,
    detail: (companyId: string, id: string) => ["journals", companyId, id] as const,
  },

  reports: {
    all: (companyId: string) => ["reports", companyId] as const,
    trialBalance: (companyId: string, params: unknown) =>
      ["reports", companyId, "trial-balance", params] as const,
    profitLoss: (companyId: string, params: unknown) =>
      ["reports", companyId, "profit-loss", params] as const,
    balanceSheet: (companyId: string, params: unknown) =>
      ["reports", companyId, "balance-sheet", params] as const,
    ledger: (companyId: string, params: unknown) => ["reports", companyId, "ledger", params] as const,
    dashboard: (companyId: string, params: unknown) =>
      ["reports", companyId, "dashboard", params] as const,
  },

  users: {
    all: ["users"] as const,
    list: (filters: unknown) => ["users", "list", filters] as const,
    detail: (id: string) => ["users", id] as const,
    roles: ["roles"] as const,
    permissions: ["permissions"] as const,
  },

  audit: {
    all: ["audit-log"] as const,
    list: (filters: unknown) => ["audit-log", "list", filters] as const,
    forEntity: (entityType: string, entityId: string) =>
      ["audit-log", entityType, entityId] as const,
    actions: ["audit-log", "actions"] as const,
  },
} as const;

/**
 * Everything derived from the ledger. Posting or reversing an entry invalidates
 * this whole family, because a single posting moves the journal list, the
 * ledger, every statement and the dashboard at once.
 */
export function ledgerDerivedKeys(companyId: string) {
  return [
    queryKeys.journals.all(companyId),
    queryKeys.reports.all(companyId),
    queryKeys.periods.all(companyId),
    queryKeys.companies.stats(companyId),
  ];
}
