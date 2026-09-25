"use client";

import { ShieldOff } from "lucide-react";
import * as React from "react";
import { EmptyState } from "./empty-state";
import { useAuth } from "@/providers/auth-provider";

/**
 * Hides what the API would refuse. The server remains the authority — this
 * only spares the user from clicking into a denial (docs/spec/06).
 */
export function PermissionGate({
  permission,
  children,
  fallback,
}: {
  permission: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { can } = useAuth();
  const required = Array.isArray(permission) ? permission : [permission];

  if (!can(...required)) return <>{fallback ?? null}</>;
  return <>{children}</>;
}

/** Whole-page guard, for routes a role cannot open at all. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: string | string[];
  children: React.ReactNode;
}) {
  const { can } = useAuth();
  const required = Array.isArray(permission) ? permission : [permission];

  if (!can(...required)) {
    return (
      <EmptyState
        icon={ShieldOff}
        title="You do not have access to this page"
        description="Your role does not include this area of Zycount. Ask an administrator if you need it."
      />
    );
  }

  return <>{children}</>;
}
