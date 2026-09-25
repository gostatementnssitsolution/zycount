import { PERMISSIONS } from "@zycount/shared";
import {
  Banknote,
  BookOpen,
  Bot,
  Boxes,
  Building2,
  CalendarRange,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Gauge,
  HeartPulse,
  Landmark,
  LayoutDashboard,
  Layers,
  type LucideIcon,
  PieChart,
  Receipt,
  Repeat,
  ScanLine,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Hidden unless the user holds this permission. */
  permission?: string;
  /**
   * The screen is built and navigable but renders the preview fixture rather
   * than live API data until the phase named here ships. It is marked in the
   * navigation and on the screen itself — never shown as if it were real.
   */
  previewPhase?: number;
  shortcut?: string;
  /** Shown in the command palette and the module landing cards. */
  description?: string;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
}

/**
 * The portal's navigation (docs/spec/07 §62).
 *
 * Every module a finance team touches in a month has a home here, in the order
 * the work happens: what the business earns, what it spends, what it holds,
 * where the money sits, how it is recorded, who is paid, what it owns, what it
 * reports, and what it can ask.
 */
export const NAVIGATION: NavGroup[] = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        permission: PERMISSIONS.REPORT_VIEW,
        shortcut: "G D",
        description: "Today's position and what needs a decision",
      },
      {
        label: "Business Health",
        href: "/insights/business-health",
        icon: HeartPulse,
        permission: PERMISSIONS.REPORT_VIEW,
        previewPhase: 5,
        description: "Runway, margin, working capital and the ratios behind them",
      },
      {
        label: "Analytics",
        href: "/insights/analytics",
        icon: PieChart,
        permission: PERMISSIONS.REPORT_VIEW,
        previewPhase: 5,
        description: "Movement in revenue, expense, cash and stock",
      },
    ],
  },
  {
    label: "Sales",
    icon: TrendingUp,
    items: [
      { label: "Customers", href: "/sales/customers", icon: Users, previewPhase: 2, description: "Who owes you, and on what terms" },
      { label: "Quotations", href: "/sales/quotations", icon: FileText, previewPhase: 2, description: "Offers out, and what they are worth" },
      { label: "Invoices", href: "/sales/invoices", icon: Receipt, previewPhase: 2, shortcut: "G I", description: "Issue, track and post sales invoices" },
      { label: "Receipts", href: "/sales/receipts", icon: Wallet, previewPhase: 2, description: "Money in, matched to the invoice it settles" },
      { label: "AR Aging", href: "/sales/ar-aging", icon: FileSpreadsheet, previewPhase: 2, description: "How late each customer is" },
    ],
  },
  {
    label: "Purchases",
    icon: ShoppingCart,
    items: [
      { label: "Suppliers", href: "/purchases/suppliers", icon: Building2, previewPhase: 2, description: "Who you owe, and on what terms" },
      { label: "Purchase Orders", href: "/purchases/orders", icon: ClipboardList, previewPhase: 3, description: "Committed spend before the bill arrives" },
      { label: "Bills", href: "/purchases/bills", icon: FileText, previewPhase: 2, shortcut: "G B", description: "Approve and post what suppliers charge" },
      { label: "Payments", href: "/purchases/payments", icon: CreditCard, previewPhase: 2, description: "Money out, matched to the bill it settles" },
      { label: "Expenses & OCR", href: "/purchases/expenses", icon: ScanLine, previewPhase: 3, description: "Photograph a receipt, review the coding, post it" },
      { label: "AP Aging", href: "/purchases/ap-aging", icon: FileSpreadsheet, previewPhase: 2, description: "What falls due, and when" },
    ],
  },
  {
    label: "Inventory",
    icon: Boxes,
    items: [
      { label: "Items", href: "/inventory", icon: Boxes, previewPhase: 3, description: "Stock on hand, reserved and available" },
      { label: "Stock Movements", href: "/inventory/movements", icon: Repeat, previewPhase: 3, description: "Every in and out, with its value" },
      { label: "Reorder Planner", href: "/inventory/reorder", icon: Truck, previewPhase: 3, description: "What to buy before it runs out" },
    ],
  },
  {
    label: "Banking",
    icon: Landmark,
    items: [
      { label: "Accounts", href: "/banking", icon: Landmark, previewPhase: 2, description: "Bank, card and cash balances against the ledger" },
      { label: "Reconciliation", href: "/banking/reconciliation", icon: Scale, previewPhase: 2, shortcut: "G R", description: "Match the statement to the books, line by line" },
    ],
  },
  {
    label: "Accounting",
    icon: BookOpen,
    items: [
      { label: "Chart of Accounts", href: "/accounting/chart-of-accounts", icon: Layers, permission: PERMISSIONS.ACCOUNT_VIEW, shortcut: "G A", description: "The accounts everything posts to" },
      { label: "Journal Entries", href: "/accounting/journals", icon: BookOpen, permission: PERMISSIONS.JOURNAL_VIEW, shortcut: "G J", description: "Draft, post and reverse entries" },
      { label: "General Ledger", href: "/accounting/general-ledger", icon: ScrollText, permission: PERMISSIONS.LEDGER_VIEW, shortcut: "G L", description: "Every posted line with a running balance" },
      { label: "Fiscal Periods", href: "/accounting/periods", icon: CalendarRange, permission: PERMISSIONS.PERIOD_VIEW, description: "Open, close and reopen the books" },
    ],
  },
  {
    label: "Payroll",
    icon: Users,
    items: [
      { label: "Employees", href: "/payroll/employees", icon: Users, previewPhase: 4, description: "People, pay and statutory particulars" },
      { label: "Pay Runs", href: "/payroll/pay-runs", icon: Banknote, previewPhase: 4, description: "Run the month, review it, post it" },
      { label: "Statutory", href: "/payroll/statutory", icon: ShieldCheck, previewPhase: 4, description: "EPF, SOCSO, EIS and PCB, and when each is due" },
    ],
  },
  {
    label: "Fixed Assets",
    icon: Gauge,
    items: [
      { label: "Asset Register", href: "/fixed-assets", icon: Gauge, previewPhase: 4, description: "What the business owns and what it is worth" },
      { label: "Depreciation", href: "/fixed-assets/depreciation", icon: TrendingUp, previewPhase: 4, description: "The monthly charge, before it posts" },
    ],
  },
  {
    label: "Reports",
    icon: FileBarChart,
    items: [
      { label: "All Reports", href: "/reports", icon: FileBarChart, permission: PERMISSIONS.REPORT_VIEW, description: "Every statement in one place" },
      { label: "Trial Balance", href: "/reports/trial-balance", icon: Scale, permission: PERMISSIONS.REPORT_VIEW, shortcut: "G T", description: "Debits and credits, account by account" },
      { label: "Profit & Loss", href: "/reports/profit-loss", icon: TrendingUp, permission: PERMISSIONS.REPORT_VIEW, shortcut: "G P", description: "Performance across a period" },
      { label: "Balance Sheet", href: "/reports/balance-sheet", icon: FileBarChart, permission: PERMISSIONS.REPORT_VIEW, description: "Position at a date" },
      { label: "Cash Flow", href: "/reports/cash-flow", icon: Wallet, permission: PERMISSIONS.REPORT_VIEW, previewPhase: 5, description: "Where the cash came from and went" },
    ],
  },
  {
    label: "Intelligence",
    icon: Bot,
    items: [
      {
        label: "Finance Copilot",
        href: "/ai",
        icon: Bot,
        permission: PERMISSIONS.REPORT_VIEW,
        previewPhase: 6,
        shortcut: "G C",
        description: "Ask the ledger a question and get a cited answer",
      },
    ],
  },
  {
    label: "Administration",
    icon: Settings,
    items: [
      { label: "Users & Roles", href: "/admin/users", icon: ShieldCheck, permission: PERMISSIONS.USER_VIEW, description: "Who can do what" },
      { label: "Audit Log", href: "/admin/audit-log", icon: ScrollText, permission: PERMISSIONS.AUDIT_VIEW, description: "Every privileged action, append-only" },
      { label: "Settings", href: "/admin/settings", icon: Settings, permission: PERMISSIONS.COMPANY_VIEW, description: "Company, fiscal year and preferences" },
    ],
  },
];

/** Labels for the "preview until Phase N" hint. */
export const PHASE_LABELS: Record<number, string> = {
  2: "Phase 2",
  3: "Phase 3",
  4: "Phase 4",
  5: "Phase 5",
  6: "Phase 6",
};

/** Flattened, for the command palette and route lookups. */
export const NAV_ITEMS: Array<NavItem & { group: string }> = NAVIGATION.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.label })),
);

export function findNavItem(pathname: string): (NavItem & { group: string }) | undefined {
  // Longest match wins, so `/sales/invoices/inv-1` resolves to Invoices rather
  // than to the dashboard at `/`.
  return [...NAV_ITEMS]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)));
}
