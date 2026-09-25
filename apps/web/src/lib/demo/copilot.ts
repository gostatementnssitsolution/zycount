import type { CopilotMessage } from "./types";

/**
 * Preview data for the finance copilot.
 *
 * The boundaries in docs/spec/11 are the point of the screen: the assistant
 * reads the ledger and explains it, cites every figure back to the record it
 * came from, and never posts anything by itself. Drafts it prepares go to a
 * person for approval.
 */

export const COPILOT_THREAD: CopilotMessage[] = [
  {
    id: "msg-1",
    role: "user",
    content: "Why did profit decrease this month?",
  },
  {
    id: "msg-2",
    role: "assistant",
    content: `Net profit for September is RM 357,821 against RM 160,100 in August — it rose, not fell. What did decrease is **gross profit per unit sold**, and three things account for it:

1. **Freight cost jumped 34%.** Seri Mutiara billed RM 32,264 in September against RM 24,080 in August, on roughly the same volume. The September bill is still pending a goods-received note.
2. **A 5% discount was given on 24 printer units** in INV-2026-0148 — RM 504 of margin, the first discount granted to this customer in nine months.
3. **Cloud hosting overran by RM 520** against the standing monthly fee.

Revenue itself is up 7.2% month on month, and gross margin improved to 46.1% because the September mix leaned towards services, which carry no cost of goods.`,
    citations: [
      { label: "BIL-2026-0313 — Seri Mutiara Logistics", href: "/purchases/bills/bil-4" },
      { label: "INV-2026-0148 — Sunway Retail Group", href: "/sales/invoices/inv-1" },
      { label: "BIL-2026-0310 — Cloudline Services", href: "/purchases/bills/bil-3" },
      { label: "Profit & Loss — September 2026", href: "/reports/profit-loss" },
    ],
    followUps: [
      "Show me freight cost by month",
      "Which customers received discounts this quarter?",
      "Draft a reversal for the Cloudline overage",
    ],
  },
];

export const COPILOT_SUGGESTIONS = [
  "How much cash will I have at the end of October?",
  "Which invoices are at risk of going overdue?",
  "Explain the movement in inventory value this quarter",
  "What is my effective tax position year to date?",
  "Summarise September for the board in five lines",
  "Which expense accounts are above last year's run rate?",
];

/** The figures the copilot has in view, so its answers are auditable. */
export const COPILOT_CONTEXT = [
  { label: "Revenue — September", value: "601676.00", href: "/reports/profit-loss" },
  { label: "Expenses — September", value: "243855.00", href: "/reports/profit-loss" },
  { label: "Net profit — September", value: "357821.00", href: "/reports/profit-loss" },
  { label: "Cash at bank", value: "502188.00", href: "/banking" },
  { label: "Receivables", value: "520050.00", href: "/sales/ar-aging" },
  { label: "Payables", value: "301020.00", href: "/purchases/bills" },
];

export const COPILOT_BOUNDARIES = [
  "Reads posted ledger data for the company you are in — nothing outside it.",
  "Every figure it states links to the journal, document or report it came from.",
  "It can draft a journal or a document; a person with the permission posts it.",
  "It never closes a period, changes a posted entry, or moves money.",
  "Each question and answer is written to the audit trail.",
];
