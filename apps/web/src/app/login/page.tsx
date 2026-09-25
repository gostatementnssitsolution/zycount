"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, mfaVerifySchema, type LoginInput } from "@zycount/shared";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormError } from "@/components/common/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";

export default function LoginPage() {
  return (
    <React.Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </React.Suspense>
  );
}

function LoginFallback() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <BrandPanel />
      <div className="grid place-items-center px-4 py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, verifyMfa, user, isLoading } = useAuth();

  const [mfaToken, setMfaToken] = React.useState<string | null>(null);
  const [error, setError] = React.useState<unknown>(null);

  const next = searchParams.get("next") ?? "/";

  // Someone already signed in has no business on the sign-in page.
  React.useEffect(() => {
    if (!isLoading && user) router.replace(next);
  }, [isLoading, user, next, router]);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberDevice: false },
  });

  const mfaForm = useForm<{ code: string }>({
    resolver: zodResolver(mfaVerifySchema.pick({ code: true })),
    defaultValues: { code: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);

    try {
      const response = await login(values);

      if (response.mfaRequired && response.mfaToken) {
        setMfaToken(response.mfaToken);
        return;
      }

      toast.success(`Welcome back, ${response.user?.name.split(" ")[0] ?? ""}`.trim());
      router.replace(next);
    } catch (caught) {
      setError(caught);

      // Field-level messages from the server land on the matching input.
      if (caught instanceof ApiError && caught.fields) {
        for (const [field, message] of Object.entries(caught.fields)) {
          form.setError(field as keyof LoginInput, { message });
        }
      }
    }
  });

  const onVerify = mfaForm.handleSubmit(async (values) => {
    if (!mfaToken) return;
    setError(null);

    try {
      await verifyMfa(mfaToken, values.code);
      toast.success("Signed in");
      router.replace(next);
    } catch (caught) {
      setError(caught);
      mfaForm.setValue("code", "");
    }
  });

  if (isLoading) return <LoginFallback />;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <BrandPanel />

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-brand text-lg font-semibold text-brand-foreground">
              Z
            </span>
          </div>

          {mfaToken ? (
            <Card>
              <CardHeader>
                <div className="mb-1 grid size-9 place-items-center rounded-lg bg-brand/10 text-brand">
                  <ShieldCheck className="size-5" aria-hidden />
                </div>
                <CardTitle>Two-factor verification</CardTitle>
                <CardDescription>
                  Enter the 6-digit code from your authenticator app, or one of your recovery codes.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={onVerify} className="space-y-4">
                  {error != null && <FormError error={error} />}

                  <div className="space-y-1.5">
                    <Label htmlFor="code">Verification code</Label>
                    <Input
                      id="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      placeholder="000000"
                      className="text-center font-mono text-lg tracking-[0.4em]"
                      invalid={Boolean(mfaForm.formState.errors.code)}
                      {...mfaForm.register("code")}
                    />
                    {mfaForm.formState.errors.code && (
                      <p className="text-sm text-destructive">
                        {mfaForm.formState.errors.code.message}
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" loading={mfaForm.formState.isSubmitting}>
                    Verify and sign in
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setMfaToken(null);
                      setError(null);
                    }}
                  >
                    Use a different account
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="mb-1 grid size-9 place-items-center rounded-lg bg-brand/10 text-brand">
                  <KeyRound className="size-5" aria-hidden />
                </div>
                <CardTitle>Sign in to Zycount</CardTitle>
                <CardDescription>Enter your details to reach your books.</CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={onSubmit} className="space-y-4" noValidate>
                  {error != null && <FormError error={error} />}

                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      placeholder="you@company.com"
                      invalid={Boolean(form.formState.errors.email)}
                      {...form.register("email")}
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      invalid={Boolean(form.formState.errors.password)}
                      {...form.register("password")}
                    />
                    {form.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
                    Sign in
                  </Button>
                </form>

                <DemoCredentials
                  onUse={(email) => {
                    form.setValue("email", email);
                    form.setValue("password", "Zycount!Demo2026");
                  }}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="relative hidden flex-col justify-between bg-sidebar p-12 text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-lg bg-brand font-semibold text-brand-foreground">
          Z
        </span>
        <span className="text-lg font-semibold tracking-tight">Zycount</span>
      </div>

      <div className="max-w-md space-y-5">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight">
          Every transaction, correctly accounted for.
        </h1>
        <p className="text-sidebar-muted">
          Zycount is a financial operating system: business activity produces the right accounting
          impact automatically, and every figure stays traceable back to the document behind it.
        </p>

        <div className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-4 font-mono text-xs leading-relaxed text-sidebar-muted">
          SOURCE DOCUMENT
          <br />
          &nbsp;&nbsp;→ BUSINESS TRANSACTION
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;→ ACCOUNTING POSTING
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ JOURNAL → GENERAL LEDGER
          <br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→ FINANCIAL REPORT
        </div>
      </div>

      <p className="text-xs text-sidebar-muted">
        Phase 1 · Core Accounting — authentication, chart of accounts, journals, ledger and statements.
      </p>
    </div>
  );
}

const DEMO_ACCOUNTS = [
  { email: "admin@zycount.test", role: "Full access" },
  { email: "accountant@zycount.test", role: "Posts entries" },
  { email: "manager@zycount.test", role: "Closes periods" },
  { email: "auditor@zycount.test", role: "Read-only + audit" },
];

/** Shown only against a local API, so demo hints never reach production. */
function DemoCredentials({ onUse }: { onUse: (email: string) => void }) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const isLocal = apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1");

  if (!isLocal) return null;

  return (
    <div className="mt-6 rounded-lg border border-dashed p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Demo accounts — password <span className="font-mono">Zycount!Demo2026</span>
      </p>
      <div className="grid gap-1">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.email}
            type="button"
            onClick={() => onUse(account.email)}
            className="flex items-center justify-between rounded px-2 py-1 text-left text-xs transition-colors hover:bg-accent"
          >
            <span className="font-mono">{account.email}</span>
            <span className="text-muted-foreground">{account.role}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
