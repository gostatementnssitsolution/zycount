"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, type ChangePasswordInput } from "@zycount/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  KeyRound,
  Laptop,
  LogOut,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { MfaSetupDialog } from "@/components/admin/mfa-setup-dialog";
import { FormError } from "@/components/common/error-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiClient, ApiError } from "@/lib/api-client";
import { formatDateTime, formatRelative, initials } from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { useAuth } from "@/providers/auth-provider";

interface SessionRow {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
}

interface LoginRow {
  id: string;
  success: boolean;
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export default function AccountPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div>
      <PageHeader
        title="Your account"
        description="Sign-in details, two-factor verification and the devices you are signed in on."
      />

      <div className="mb-4 flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand text-base font-semibold text-brand-foreground">
          {initials(user.name)}
        </span>
        <div className="min-w-0">
          <div className="truncate font-medium">{user.name}</div>
          <div className="truncate text-sm text-muted-foreground">{user.email}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {user.roles.map((role) => (
              <Badge key={role} variant="brand" className="font-normal">
                {role}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Tabs defaultValue="security">
        <TabsList>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="activity">Sign-in history</TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="space-y-4">
          <PasswordCard />
          <MfaCard />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionsCard />
        </TabsContent>

        <TabsContent value="activity">
          <LoginHistoryCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PasswordCard() {
  const [error, setError] = React.useState<unknown>(null);

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);

    try {
      await apiClient.post("/auth/password", values, { skipCompany: true });
      toast.success("Password changed. Your other sessions have been ended.");
      form.reset();
    } catch (caught) {
      setError(caught);

      if (caught instanceof ApiError && caught.fields) {
        for (const [field, message] of Object.entries(caught.fields)) {
          form.setError(field as keyof ChangePasswordInput, { message });
        }
      }
    }
  });

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" aria-hidden />
          <CardTitle className="text-base">Password</CardTitle>
        </div>
        <CardDescription>
          Changing your password signs you out everywhere else.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmit} className="max-w-sm space-y-4" noValidate>
          {error != null && <FormError error={error} />}

          <div className="space-y-1.5">
            <Label htmlFor="currentPassword" required>
              Current password
            </Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              invalid={Boolean(form.formState.errors.currentPassword)}
              {...form.register("currentPassword")}
            />
            {form.formState.errors.currentPassword && (
              <p className="text-sm text-destructive">
                {form.formState.errors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="newPassword" required>
              New password
            </Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              invalid={Boolean(form.formState.errors.newPassword)}
              {...form.register("newPassword")}
            />
            {form.formState.errors.newPassword ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.newPassword.message}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                At least 12 characters, with upper and lower case, a number and a symbol.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" required>
              Confirm new password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              invalid={Boolean(form.formState.errors.confirmPassword)}
              {...form.register("confirmPassword")}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-destructive">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" loading={form.formState.isSubmitting}>
            Change password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MfaCard() {
  const { user, refreshUser } = useAuth();
  const [setupOpen, setSetupOpen] = React.useState(false);
  const [disabling, setDisabling] = React.useState(false);
  const [password, setPassword] = React.useState("");

  const onDisable = async () => {
    setDisabling(true);

    try {
      await apiClient.post("/auth/mfa/disable", { password }, { skipCompany: true });
      await refreshUser();
      setPassword("");
      toast.success("Two-factor verification turned off.");
    } catch (caught) {
      toast.error(caught instanceof ApiError ? caught.message : "Could not turn that off.");
    } finally {
      setDisabling(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          {user?.mfaEnabled ? (
            <ShieldCheck className="size-4 text-success" aria-hidden />
          ) : (
            <ShieldOff className="size-4 text-muted-foreground" aria-hidden />
          )}
          <CardTitle className="text-base">Two-factor verification</CardTitle>
          {user?.mfaEnabled && <Badge variant="success">On</Badge>}
        </div>
        <CardDescription>
          A code from your authenticator app is required alongside your password.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {user?.mfaEnabled ? (
          <div className="max-w-sm space-y-3">
            <p className="text-sm text-muted-foreground">
              Turning this off makes your account easier to compromise. Confirm with your password.
            </p>
            <Input
              type="password"
              placeholder="Your password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => void onDisable()}
              disabled={!password}
              loading={disabling}
            >
              <ShieldOff />
              Turn off two-factor
            </Button>
          </div>
        ) : (
          <Button onClick={() => setSetupOpen(true)}>
            <ShieldCheck />
            Set up two-factor
          </Button>
        )}
      </CardContent>

      <MfaSetupDialog open={setupOpen} onOpenChange={setSetupOpen} />
    </Card>
  );
}

function SessionsCard() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.auth.sessions,
    queryFn: () => apiClient.get<SessionRow[]>("/auth/sessions", { skipCompany: true }),
  });

  const revoke = async (id: string) => {
    try {
      await apiClient.delete(`/auth/sessions/${id}`, { skipCompany: true });
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.sessions });
      toast.success("That session has been ended.");
    } catch {
      toast.error("Could not end that session.");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Where you are signed in</CardTitle>
        <CardDescription>
          End any session you do not recognise, then change your password.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">No other active sessions.</p>
        ) : (
          <ul className="divide-y">
            {data?.map((session) => (
              <li key={session.id} className="flex items-center gap-3 py-3 first:pt-0">
                <Laptop className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{describeAgent(session.userAgent)}</p>
                  <p className="text-xs text-muted-foreground">
                    {session.ipAddress ?? "Unknown address"} · started{" "}
                    {formatRelative(session.createdAt)}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => void revoke(session.id)}>
                  <LogOut />
                  End
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function LoginHistoryCard() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.auth.loginHistory,
    queryFn: () => apiClient.get<LoginRow[]>("/auth/login-history", { skipCompany: true }),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent sign-in attempts</CardTitle>
        <CardDescription>
          Both successful and failed attempts on your account are recorded.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (data?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
        ) : (
          <ul className="divide-y">
            {data?.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                {entry.success ? (
                  <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <ShieldOff className="size-4 shrink-0 text-destructive" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    {entry.success ? "Signed in" : "Failed attempt"}
                    {entry.reason && (
                      <span className="text-muted-foreground"> · {entry.reason.replace(/_/g, " ")}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.ipAddress ?? "Unknown address"} · {describeAgent(entry.userAgent)}
                  </p>
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                  {formatDateTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/** A user agent string is unreadable; name the browser and platform instead. */
function describeAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";

  const browser =
    /Edg\//.test(userAgent) ? "Edge"
    : /Chrome\//.test(userAgent) ? "Chrome"
    : /Safari\//.test(userAgent) ? "Safari"
    : /Firefox\//.test(userAgent) ? "Firefox"
    : "Browser";

  const platform =
    /Windows/.test(userAgent) ? "Windows"
    : /Macintosh|Mac OS/.test(userAgent) ? "macOS"
    : /Android/.test(userAgent) ? "Android"
    : /iPhone|iPad/.test(userAgent) ? "iOS"
    : /Linux/.test(userAgent) ? "Linux"
    : "";

  return platform ? `${browser} on ${platform}` : browser;
}
