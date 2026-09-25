"use client";

import { AlertTriangle, RefreshCw, ShieldOff, WifiOff } from "lucide-react";
import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ApiError, NetworkError } from "@/lib/api-client";

/**
 * Error presentation (docs/spec/09 §50).
 *
 * The user never sees a raw failure. After a posting action the message says
 * plainly whether the transaction reached the ledger, and always quotes the
 * reference support will ask for.
 */
export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  if (error instanceof NetworkError) {
    return (
      <Alert variant="warning" className={className}>
        <WifiOff />
        <AlertTitle>No connection</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{error.message}</p>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw />
              Try again
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (error instanceof ApiError) {
    const denied = error.code === "PERMISSION_DENIED" || error.code === "COMPANY_ACCESS_DENIED";

    return (
      <Alert variant={denied ? "warning" : "destructive"} className={className}>
        {denied ? <ShieldOff /> : <AlertTriangle />}
        <AlertTitle>{denied ? "You do not have access" : "Something went wrong"}</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{error.message}</p>

          <PostedNotice posted={error.posted} />

          <p className="text-xs opacity-80">
            Reference <span className="font-mono">{error.reference}</span>
          </p>

          {onRetry && !denied && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw />
              Try again
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle />
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>An unexpected problem stopped this from loading. Nothing was changed.</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw />
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * The single most important line after a failed posting: did it hit the ledger?
 * Shown only when the server actually told us (docs/spec/09).
 */
export function PostedNotice({ posted }: { posted?: boolean }) {
  if (posted === undefined) return null;

  return (
    <p className="font-medium">
      {posted
        ? "Your transaction WAS posted to the ledger."
        : "Your transaction was NOT posted. Nothing has changed in your books."}
    </p>
  );
}

/** Compact inline error for form submissions, with field messages listed. */
export function FormError({ error }: { error: unknown }) {
  if (!error) return null;

  if (error instanceof ApiError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>{error.message}</AlertTitle>
        <AlertDescription className="space-y-2">
          <PostedNotice posted={error.posted} />
          {error.fields && Object.keys(error.fields).length > 0 && (
            <ul className="list-inside list-disc text-sm">
              {Object.entries(error.fields).map(([field, message]) => (
                <li key={field}>{message}</li>
              ))}
            </ul>
          )}
          <p className="text-xs opacity-80">
            Reference <span className="font-mono">{error.reference}</span>
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return <ErrorState error={error} />;
}
