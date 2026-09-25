"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AuditLogDto,
  CreateUserInput,
  Paginated,
  RoleDto,
  UpdateUserInput,
  UserDto,
} from "@zycount/shared";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface UserFilters {
  [key: string]: string | number | boolean | undefined;
  page?: number;
  pageSize?: number;
  q?: string;
  role?: string;
  isActive?: boolean;
  sort?: string;
}

export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: queryKeys.users.list(filters),
    queryFn: () =>
      apiClient.get<Paginated<UserDto>>("/users", {
        skipCompany: true,
        searchParams: filters as Record<string, string | number | boolean | undefined>,
      }),
    placeholderData: (previous) => previous,
  });
}

export function useRoles() {
  return useQuery({
    queryKey: queryKeys.users.roles,
    queryFn: () => apiClient.get<RoleDto[]>("/roles", { skipCompany: true }),
    // The role matrix is fixed until Phase 6 introduces custom roles.
    staleTime: 10 * 60_000,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUserInput) =>
      apiClient.post<UserDto>("/users", input, { skipCompany: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      apiClient.patch<UserDto>(`/users/${id}`, input, { skipCompany: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete<UserDto>(`/users/${id}`, { skipCompany: true }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export interface AuditFilters {
  [key: string]: string | number | boolean | undefined;
  page?: number;
  pageSize?: number;
  action?: string;
  entityType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
}

export function useAuditLog(filters: AuditFilters = {}) {
  return useQuery({
    queryKey: queryKeys.audit.list(filters),
    queryFn: () =>
      apiClient.get<Paginated<AuditLogDto>>("/audit-log", {
        searchParams: filters as Record<string, string | number | undefined>,
      }),
    placeholderData: (previous) => previous,
  });
}

/** The Audit tab on a detail page — the full history of one record. */
export function useEntityAudit(entityType: string, entityId: string | null) {
  return useQuery({
    queryKey: queryKeys.audit.forEntity(entityType, entityId ?? ""),
    queryFn: () => apiClient.get<AuditLogDto[]>(`/audit-log/${entityType}/${entityId}`),
    enabled: Boolean(entityId),
  });
}

export function useAuditActions() {
  return useQuery({
    queryKey: queryKeys.audit.actions,
    queryFn: () => apiClient.get<string[]>("/audit-log/actions"),
    staleTime: 10 * 60_000,
  });
}
