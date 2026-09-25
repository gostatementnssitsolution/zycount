"use client";

import { Check, Copy, ShieldCheck } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { FormError } from "@/components/common/error-state";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";

/**
 * TOTP enrolment (docs/spec/06 — MFA).
 *
 * The secret is only activated once a valid code proves the authenticator
 * works, and the recovery codes are shown exactly once — the server keeps only
 * their hashes.
 */
export function MfaSetupDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { refreshUser } = useAuth();

  const [step, setStep] = React.useState<"scan" | "codes">("scan");
  const [secret, setSecret] = React.useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[]>([]);
  const [error, setError] = React.useState<unknown>(null);
  const [busy, setBusy] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setStep("scan");
      setSecret(null);
      setCode("");
      setRecoveryCodes([]);
      setError(null);
      return;
    }

    setBusy(true);
    apiClient
      .post<{ secret: string; otpauthUrl: string }>("/auth/mfa/enrol", undefined, {
        skipCompany: true,
      })
      .then((response) => {
        setSecret(response.secret);
        setOtpauthUrl(response.otpauthUrl);
      })
      .catch(setError)
      .finally(() => setBusy(false));
  }, [open]);

  const confirm = async () => {
    setError(null);
    setBusy(true);

    try {
      const response = await apiClient.post<{ recoveryCodes: string[] }>(
        "/auth/mfa/enrol/confirm",
        { code },
        { skipCompany: true },
      );
      setRecoveryCodes(response.recoveryCodes);
      setStep("codes");
      await refreshUser();
    } catch (caught) {
      setError(caught);
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const copyCodes = async () => {
    await navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {step === "scan" ? (
          <>
            <DialogHeader>
              <DialogTitle>Set up two-factor verification</DialogTitle>
              <DialogDescription>
                Add this account to an authenticator app, then enter the code it shows to confirm
                it works.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {error != null && <FormError error={error} />}

              <div className="space-y-1.5">
                <Label>Setup key</Label>
                <div className="flex gap-2">
                  <Input
                    value={secret ?? "Generating…"}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={!secret}
                    onClick={() => {
                      void navigator.clipboard.writeText(secret ?? "");
                      toast.success("Setup key copied.");
                    }}
                    aria-label="Copy the setup key"
                  >
                    <Copy />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  In your authenticator app choose &ldquo;enter a setup key&rdquo; and paste this.
                </p>
              </div>

              {otpauthUrl && (
                <p className="break-all rounded-lg border bg-muted/40 p-2 font-mono text-2xs text-muted-foreground">
                  {otpauthUrl}
                </p>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="mfa-code" required>
                  Code from the app
                </Label>
                <Input
                  id="mfa-code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  className="text-center font-mono text-lg tracking-[0.4em]"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={() => void confirm()} disabled={code.length !== 6} loading={busy}>
                <ShieldCheck />
                Confirm and turn on
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Save your recovery codes</DialogTitle>
              <DialogDescription>
                Each code works once, and gets you in if you lose your authenticator.
              </DialogDescription>
            </DialogHeader>

            <Alert variant="warning">
              <ShieldCheck />
              <AlertTitle>This is the only time these are shown</AlertTitle>
              <AlertDescription>
                Zycount stores only a hash of each code and cannot show them again. Keep them
                somewhere safe and private.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-2 rounded-lg border p-3 font-mono text-sm">
              {recoveryCodes.map((recoveryCode) => (
                <span key={recoveryCode} className="tabular">
                  {recoveryCode}
                </span>
              ))}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => void copyCodes()}>
                {copied ? <Check /> : <Copy />}
                {copied ? "Copied" : "Copy all"}
              </Button>
              <Button onClick={() => onOpenChange(false)}>I have saved them</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
