"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AccountDto,
  AccountTreeNode,
  BalanceSheetReport,
  CompanyDto,
  CreateAccountInput,
  CreateJournalInput,
  DashboardReport,
  FiscalPeriodDto,
  JournalEntryDto,
  JournalEntrySummary,
  LedgerReport,
  Paginated,
  PeriodCloseReadiness,
  ProfitLossReport,
  ReverseJournalInput,
  TrialBalanceReport,
  UpdateAccountInput,
  UpdateJournalInput,
} from "@zycount/shared";
import { apiClient } from "@/lib/api-client";
import { ledgerDerivedKeys, queryKeys } from "@/lib/query-keys";
import { useCompanyId } from "@/providers/auth-provider";

// ── Companies ────────────────────────────────────────────────

export function useCompanies() {
  return useQuery({
    queryKey: queryKeys.companies.all,
    queryFn: () => apiClient.get<CompanyDto[]>("/companies", { skipCompany: true }),
  });
}

export function useCompany(companyId: string) {
  return useQuery({
    queryKey: queryKeys.companies.detail(companyId),
    queryFn: () => apiClient.get<CompanyDto>(`/companies/${companyId}`),
    enabled: Boolean(companyId),
  });
}

export function useCompanyStats(companyId: string) {
  return useQuery({
    queryKey: queryKeys.companies.stats(companyId),
    queryFn: () =>
      apiClient.get<{
        accounts: number;
        periods: number;
        postedJournals: number;
        draftJournals: number;
        users: number;
      }>(`/companies/${companyId}/stats`),
    enabled: Boolean(companyId),
  });
}

// ── Chart of accounts ────────────────────────────────────────

export interface AccountFilters {
  type?: string;
  q?: string;
  postableOnly?: boolean;
  includeInactive?: boolean;
  /** Lets a filter object be passed straight through as search parameters. */
  [key: string]: string | number | boolean | undefined;
}

export function useAccounts(filters: AccountFilters = {}, enabled = true) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: queryKeys.accounts.list(companyId, filters),
    queryFn: () =>
      apiClient.get<AccountDto[]>(`/companies/${companyId}/accounts`, { searchParams: filters }),
    enabled: Boolean(companyId) && enabled,
  });
}

export function useAccountTree(includeInactive = false) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: queryKeys.accounts.tree(companyId, includeInactive),
    queryFn: () =>
      apiClient.get<AccountTreeNode[]>(`/companies/${companyId}/accounts/tree`, {
        searchParams: { includeInactive },
      }),
    enabled: Boolean(companyId),
  });
}

export function useCreateAccount() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAccountInput) =>
      apiClient.post<AccountDto>(`/companies/${companyId}/accounts`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all(companyId) });
    },
  });
}

export function useUpdateAccount() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAccountInput }) =>
      apiClient.patch<AccountDto>(`/companies/${companyId}/accounts/${id}`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all(companyId) });
    },
  });
}

export function useDeleteAccount() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ deleted: boolean; archived: boolean }>(
        `/companies/${companyId}/accounts/${id}`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all(companyId) });
    },
  });
}

// ── Fiscal periods ───────────────────────────────────────────

export function usePeriods(year?: number) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: queryKeys.periods.list(companyId, year),
    queryFn: () =>
      apiClient.get<FiscalPeriodDto[]>(`/companies/${companyId}/fiscal-periods`, {
        searchParams: { year },
      }),
    enabled: Boolean(companyId),
  });
}

export function useCloseReadiness(periodId: string | null) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: queryKeys.periods.readiness(companyId, periodId ?? ""),
    queryFn: () =>
      apiClient.get<PeriodCloseReadiness>(
        `/companies/${companyId}/fiscal-periods/${periodId}/close-readiness`,
      ),
    enabled: Boolean(companyId && periodId),
  });
}

export function useGeneratePeriods() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { year: number; startMonth?: number; periodsPerYear: number }) =>
      apiClient.post<FiscalPeriodDto[]>(`/companies/${companyId}/fiscal-periods/generate`, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.periods.all(companyId) });
    },
  });
}

export function useClosePeriod() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, override, note }: { id: string; override?: boolean; note?: string }) =>
      apiClient.post<FiscalPeriodDto>(`/companies/${companyId}/fiscal-periods/${id}/close`, {
        override: override ?? false,
        note,
      }),
    onSuccess: () => {
      for (const key of ledgerDerivedKeys(companyId)) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export function useReopenPeriod() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.post<FiscalPeriodDto>(`/companies/${companyId}/fiscal-periods/${id}/reopen`, { reason }),
    onSuccess: () => {
      for (const key of ledgerDerivedKeys(companyId)) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

// ── Journals ─────────────────────────────────────────────────

export interface JournalFilters {
  [key: string]: string | number | boolean | undefined;
  page?: number;
  pageSize?: number;
  status?: string;
  source?: string;
  fiscalPeriodId?: string;
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  sort?: string;
}

export function useJournals(filters: JournalFilters = {}, enabled = true) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: queryKeys.journals.list(companyId, filters),
    queryFn: () =>
      apiClient.get<Paginated<JournalEntrySummary>>(`/companies/${companyId}/journals`, {
        searchParams: filters as Record<string, string | number | undefined>,
      }),
    enabled: Boolean(companyId) && enabled,
    // Keeps the previous page on screen while the next one loads, so the table
    // does not collapse to a spinner on every page change.
    placeholderData: (previous) => previous,
  });
}

export function useJournal(id: string | null) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: queryKeys.journals.detail(companyId, id ?? ""),
    queryFn: () => apiClient.get<JournalEntryDto>(`/companies/${companyId}/journals/${id}`),
    enabled: Boolean(companyId && id),
  });
}

export function useCreateJournal() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, post }: { input: CreateJournalInput; post?: boolean }) =>
      apiClient.post<JournalEntryDto>(`/companies/${companyId}/journals`, input, {
        searchParams: { post: post ? "true" : undefined },
      }),
    onSuccess: () => {
      for (const key of ledgerDerivedKeys(companyId)) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export function useUpdateJournal() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateJournalInput }) =>
      apiClient.patch<JournalEntryDto>(`/companies/${companyId}/journals/${id}`, input),
    onSuccess: (entry) => {
      queryClient.setQueryData(queryKeys.journals.detail(companyId, entry.id), entry);
      void queryClient.invalidateQueries({ queryKey: queryKeys.journals.all(companyId) });
    },
  });
}

export function useDeleteJournal() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/companies/${companyId}/journals/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.journals.all(companyId) });
    },
  });
}

export function usePostJournal() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, version }: { id: string; version?: number }) =>
      apiClient.post<JournalEntryDto>(`/companies/${companyId}/journals/${id}/post`, { version }),
    onSuccess: (entry) => {
      queryClient.setQueryData(queryKeys.journals.detail(companyId, entry.id), entry);
      for (const key of ledgerDerivedKeys(companyId)) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export function useReverseJournal() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReverseJournalInput }) =>
      apiClient.post<JournalEntryDto>(`/companies/${companyId}/journals/${id}/reverse`, input),
    onSuccess: () => {
      for (const key of ledgerDerivedKeys(companyId)) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });
}

export function useDuplicateJournal() {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<JournalEntryDto>(`/companies/${companyId}/journals/${id}/duplicate`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.journals.all(companyId) });
    },
  });
}

// ── Reports ──────────────────────────────────────────────────

export interface ReportParams {
  [key: string]: string | number | boolean | undefined;
  fiscalPeriodId?: string;
  dateFrom?: string;
  dateTo?: string;
  comparePrevious?: boolean;
  includeZeroBalances?: boolean;
}

/** A report needs either a period or an end date before it can run. */
function reportReady(companyId: string, params: ReportParams): boolean {
  return Boolean(companyId && (params.fiscalPeriodId || params.dateTo));
}

export function useTrialBalance(params: ReportParams) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: queryKeys.reports.trialBalance(companyId, params),
    queryFn: () =>
      apiClient.get<TrialBalanceReport>(`/companies/${companyId}/reports/trial-balance`, {
        searchParams: params as Record<string, string | boolean | undefined>,
      }),
    enabled: reportReady(companyId, params),
  });
}

export function useProfitLoss(params: ReportParams) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: queryKeys.reports.profitLoss(companyId, params),
    queryFn: () =>
      apiClient.get<ProfitLossReport>(`/companies/${companyId}/reports/profit-loss`, {
        searchParams: params as Record<string, string | boolean | undefined>,
      }),
    enabled: reportReady(companyId, params),
  });
}

export function useBalanceSheet(params: ReportParams) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: queryKeys.reports.balanceSheet(companyId, params),
    queryFn: () =>
      apiClient.get<BalanceSheetReport>(`/companies/${companyId}/reports/balance-sheet`, {
        searchParams: params as Record<string, string | boolean | undefined>,
      }),
    enabled: reportReady(companyId, params),
  });
}

export interface LedgerParams {
  [key: string]: string | number | boolean | undefined;
  accountId?: string;
  fiscalPeriodId?: string;
  dateFrom?: string;
  dateTo?: string;
  source?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export function useLedger(params: LedgerParams) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: queryKeys.reports.ledger(companyId, params),
    queryFn: () =>
      apiClient.get<LedgerReport>(`/companies/${companyId}/ledger`, {
        searchParams: params as Record<string, string | number | undefined>,
      }),
    enabled: Boolean(companyId),
    placeholderData: (previous) => previous,
  });
}

export function useDashboard(params: ReportParams) {
  const companyId = useCompanyId();

  return useQuery({
    queryKey: queryKeys.reports.dashboard(companyId, params),
    queryFn: () =>
      apiClient.get<DashboardReport>(`/companies/${companyId}/dashboard`, {
        searchParams: params as Record<string, string | boolean | undefined>,
      }),
    enabled: reportReady(companyId, params),
  });
}
