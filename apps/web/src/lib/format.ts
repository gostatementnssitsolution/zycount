import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

/** Dates are rendered the way Malaysian finance teams write them: 15 Jan 2026. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  return Number.isNaN(date.getTime()) ? "—" : format(date, "d MMM yyyy");
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  return Number.isNaN(date.getTime()) ? "—" : format(date, "d MMM yyyy, HH:mm");
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const date = typeof value === "string" ? parseISO(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return `${formatDistanceToNowStrict(date)} ago`;
}

/** `YYYY-MM-DD`, the form every API date field expects. */
export function toInputDate(value: Date = new Date()): string {
  return format(value, "yyyy-MM-dd");
}

/** Turn `journal.post` into "Journal posted" for the audit log. */
export function humaniseAction(action: string): string {
  const [module, verb] = action.split(".");
  const verbs: Record<string, string> = {
    create: "created",
    edit: "updated",
    delete: "deleted",
    post: "posted",
    reverse: "reversed",
    close: "closed",
    reopen: "reopened",
    archive: "archived",
    login: "signed in",
    logout: "signed out",
    generate: "generated",
  };

  const subject = module.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  return `${subject} ${verbs[verb] ?? verb?.replace(/_/g, " ") ?? ""}`.trim();
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
