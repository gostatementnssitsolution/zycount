"use client";

import type { AuthUser, LoginInput, LoginResponse } from "@zycount/shared";
import { hasPermission as checkPermission } from "@zycount/shared";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import {
  apiClient,
  setAccessToken,
  setCompanyContext,
  setUnauthenticatedHandler,
} from "@/lib/api-client";

const COMPANY_STORAGE_KEY = "zycount.activeCompanyId";

interface AuthContextValue {
  user: AuthUser | null;
  /** `null` until the initial session check finishes, so guards can wait. */
  isLoading: boolean;
  activeCompanyId: string | null;
  activeCompany: AuthUser["companies"][number] | null;
  login: (input: LoginInput) => Promise<LoginResponse>;
  verifyMfa: (mfaToken: string, code: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setActiveCompany: (companyId: string) => void;
  /** Mirrors the server guard — the UI hides what the API would refuse. */
  can: (...permissions: string[]) => boolean;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeCompanyId, setActiveCompanyIdState] = React.useState<string | null>(null);

  const applySession = React.useCallback((response: LoginResponse) => {
    if (!response.accessToken || !response.user) return;

    setAccessToken(response.accessToken);
    setUser(response.user);

    // Prefer the company the user last worked in, then their default, then the
    // first they can reach — so a returning user lands where they left off.
    const stored =
      typeof window === "undefined" ? null : window.localStorage.getItem(COMPANY_STORAGE_KEY);

    const candidate =
      response.user.companies.find((company) => company.id === stored) ??
      response.user.companies.find((company) => company.isDefault) ??
      response.user.companies[0];

    if (candidate) {
      setActiveCompanyIdState(candidate.id);
      setCompanyContext(candidate.id);
      window.localStorage.setItem(COMPANY_STORAGE_KEY, candidate.id);
    }
  }, []);

  const clearSession = React.useCallback(() => {
    setAccessToken(null);
    setCompanyContext(null);
    setUser(null);
    setActiveCompanyIdState(null);
  }, []);

  // Restore the session on load: the refresh cookie survives a page reload
  // even though the access token, held only in memory, does not.
  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await apiClient.post<LoginResponse>("/auth/refresh", undefined, {
          skipCompany: true,
        });
        if (!cancelled) applySession(response);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applySession, clearSession]);

  // A refresh that fails mid-session means the session is genuinely over.
  React.useEffect(() => {
    setUnauthenticatedHandler(() => {
      clearSession();
      if (!pathname.startsWith("/login") && !pathname.startsWith("/mfa")) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }
    });

    return () => setUnauthenticatedHandler(null);
  }, [clearSession, pathname, router]);

  const login = React.useCallback(
    async (input: LoginInput) => {
      const response = await apiClient.post<LoginResponse>("/auth/login", input, {
        skipCompany: true,
      });
      if (response.accessToken) applySession(response);
      return response;
    },
    [applySession],
  );

  const verifyMfa = React.useCallback(
    async (mfaToken: string, code: string) => {
      const response = await apiClient.post<LoginResponse>(
        "/auth/mfa/verify",
        { mfaToken, code },
        { skipCompany: true },
      );
      if (response.accessToken) applySession(response);
      return response;
    },
    [applySession],
  );

  const logout = React.useCallback(async () => {
    try {
      await apiClient.post("/auth/logout", undefined, { skipCompany: true });
    } finally {
      clearSession();
      router.replace("/login");
    }
  }, [clearSession, router]);

  const refreshUser = React.useCallback(async () => {
    const fresh = await apiClient.get<AuthUser>("/auth/me", { skipCompany: true });
    setUser(fresh);
  }, []);

  const setActiveCompany = React.useCallback((companyId: string) => {
    setActiveCompanyIdState(companyId);
    setCompanyContext(companyId);
    window.localStorage.setItem(COMPANY_STORAGE_KEY, companyId);
  }, []);

  const can = React.useCallback(
    (...permissions: string[]) => checkPermission(user?.permissions ?? [], ...permissions),
    [user],
  );

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      activeCompanyId,
      activeCompany: user?.companies.find((company) => company.id === activeCompanyId) ?? null,
      login,
      verifyMfa,
      logout,
      refreshUser,
      setActiveCompany,
      can,
    }),
    [user, isLoading, activeCompanyId, login, verifyMfa, logout, refreshUser, setActiveCompany, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

/** The active company id, for hooks that cannot run without one. */
export function useCompanyId(): string {
  const { activeCompanyId } = useAuth();
  return activeCompanyId ?? "";
}
