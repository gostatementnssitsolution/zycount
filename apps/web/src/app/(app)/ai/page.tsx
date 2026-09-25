"use client";

import { PERMISSIONS } from "@zycount/shared";
import { ArrowUp, Bot, ExternalLink, Shield, Sparkles, User } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { RequirePermission } from "@/components/common/permission-gate";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/portal/detail";
import { PreviewBanner } from "@/components/portal/preview-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Textarea } from "@/components/ui/textarea";
import {
  COPILOT_BOUNDARIES,
  COPILOT_CONTEXT,
  COPILOT_SUGGESTIONS,
  COPILOT_THREAD,
  DEMO_CURRENCY,
  type CopilotMessage,
} from "@/lib/demo";
import { cn } from "@/lib/utils";

export default function CopilotPage() {
  return (
    <RequirePermission permission={PERMISSIONS.REPORT_VIEW}>
      <Copilot />
    </RequirePermission>
  );
}

function Copilot() {
  const [thread, setThread] = React.useState<CopilotMessage[]>(COPILOT_THREAD);
  const [draft, setDraft] = React.useState("");
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread]);

  const ask = (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    setThread((current) => [
      ...current,
      { id: `user-${current.length}`, role: "user", content: trimmed },
      {
        id: `assistant-${current.length}`,
        role: "assistant",
        content:
          "This build is the interface only — the copilot is connected to the ledger in Phase 6. The exchange above is a worked example of the answer it gives: the figures, the three causes behind them, and a link to each source document. Nothing here was inferred from your books.",
      },
    ]);
    setDraft("");
  };

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Finance copilot"
        description="Ask the ledger a question. Every figure in the answer links to the record it came from."
        actions={
          <Badge variant="brand">
            <Sparkles className="size-3" aria-hidden />
            Reads only — never posts
          </Badge>
        }
      />

      <PreviewBanner module="Finance copilot" phase={6} />

      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Card className="flex min-h-[32rem] flex-col">
          <CardContent className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
            {thread.map((message) => (
              <Message key={message.id} message={message} onFollowUp={ask} />
            ))}
            <div ref={endRef} />
          </CardContent>

          <div className="border-t p-4">
            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    ask(draft);
                  }
                }}
                rows={1}
                placeholder="Ask about revenue, cash, a customer, an account…"
                aria-label="Ask the finance copilot"
                className="min-h-[2.5rem] resize-none"
              />
              <Button size="icon" onClick={() => ask(draft)} disabled={!draft.trim()} aria-label="Send question">
                <ArrowUp />
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {COPILOT_SUGGESTIONS.slice(0, 4).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => ask(suggestion)}
                  className="rounded-full border border-input bg-card px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <div className="min-w-0 space-y-5">
          <Section
            title="What it can see"
            description="The figures behind the current answer, from posted entries only."
          >
            <ul className="space-y-2.5">
              {COPILOT_CONTEXT.map((item) => (
                <li key={item.label} className="flex items-baseline justify-between gap-3 text-sm">
                  <Link href={item.href} className="min-w-0 truncate text-muted-foreground hover:text-brand hover:underline">
                    {item.label}
                  </Link>
                  <Money value={item.value} currency={DEMO_CURRENCY} className="shrink-0 font-medium" />
                </li>
              ))}
            </ul>
          </Section>

          <Section
            title="Where the line is"
            description="The boundaries the assistant works inside (docs/spec/11)."
          >
            <ul className="space-y-2.5">
              {COPILOT_BOUNDARIES.map((boundary) => (
                <li key={boundary} className="flex gap-2 text-sm text-muted-foreground">
                  <Shield className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
                  <span>{boundary}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Message({ message, onFollowUp }: { message: CopilotMessage; onFollowUp: (question: string) => void }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full",
          isUser ? "bg-secondary text-secondary-foreground" : "bg-brand/10 text-brand",
        )}
        aria-hidden
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
      </span>

      <div className={cn("min-w-0 max-w-2xl", isUser && "text-right")}>
        <div
          className={cn(
            "inline-block rounded-xl px-4 py-3 text-left text-sm",
            isUser ? "bg-secondary" : "border bg-card",
          )}
        >
          <RichText content={message.content} />
        </div>

        {message.citations && message.citations.length > 0 && (
          <div className="mt-2.5">
            <div className="text-2xs font-medium uppercase tracking-wide text-muted-foreground">Sources</div>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {message.citations.map((citation) => (
                <li key={citation.href}>
                  <Link
                    href={citation.href}
                    className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand"
                  >
                    {citation.label}
                    <ExternalLink className="size-3" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {message.followUps && message.followUps.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {message.followUps.map((followUp) => (
              <button
                key={followUp}
                type="button"
                onClick={() => onFollowUp(followUp)}
                className="rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-solid hover:bg-accent hover:text-foreground"
              >
                {followUp}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The assistant's answers carry light structure — bold for the figures that
 * matter and numbered causes. Anything richer belongs in a report, not a chat
 * bubble, so only those two are rendered.
 */
function RichText({ content }: { content: string }) {
  return (
    <>
      {content.split("\n\n").map((block, index) => {
        const lines = block.split("\n");
        const numbered = lines.length > 1 && lines.every((line) => /^\d+\.\s/.test(line));

        if (numbered) {
          return (
            <ol key={index} className={cn("list-decimal space-y-1.5 pl-5", index > 0 && "mt-2.5")}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex}>
                  <Emphasis text={line.replace(/^\d+\.\s/, "")} />
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p key={index} className={cn(index > 0 && "mt-2.5")}>
            <Emphasis text={block} />
          </p>
        );
      })}
    </>
  );
}

/** `**bold**` around the figures that carry the answer; nothing else. */
function Emphasis({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        ),
      )}
    </>
  );
}
