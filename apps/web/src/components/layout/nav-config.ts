import { PERMISSIONS } from "@zycount/shared";
import {
  Banknote,
  BookOpen,
  Boxes,
  Building2,
  CalendarRange,
  ClipboardList,
  FileBarChart,
  FileSpreadsheet,
  LayoutDashboard,
  Layers,
  type LucideIcon,
  Receipt,
  ScrollText,
  Scale,
  Settings,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Hidden unless the user holds this permission. */
  permission?: string;
  /** Modules that arrive in a later phase are shown, disabled, with the phase. */
  phase?: number;
  shortcut?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * The sidebar mirrors the blueprint's final navigation (docs/spec/07 §62).
 *
 * Later-phase modules stay visible but disabled: the shape of the product is
 * part of the pitch, and an empty menu would hide where it is going.
 */
export const NAVIGATION: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard, permission: PERMISSIONS.REPORT_VIEW, shortcut: "G D" },
    ],
  },
  {
    label: "Accounting",
    items: [
      {
        label: "Chart of Accounts",
        href: "/accounting/chart-of-accounts",
        icon: Layers,
        permission: PERMISSIONS.ACCOUNT_VIEW,
        shortcut: "G A",
      },
      {
        label: "Journal Entries",
        href: "/accounting/journals",
        icon: BookOpen,
        permission: PERMISSIONS.JOURNAL_VIEW,
        shortcut: "G J",
      },
      {
        label: "General Ledger",
        href: "/accounting/general-ledger",
        icon: ScrollText,
        permission: PERMISSIONS.LEDGER_VIEW,
        shortcut: "G L",
      },
      {
        label: "Fiscal Periods",
        href: "/accounting/periods",
        icon: CalendarRange,
        permission: PERMISSIONS.PERIOD_VIEW,
      },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        label: "Trial Balance",
        href: "/reports/trial-balance",
        icon: Scale,
        permission: PERMISSIONS.REPORT_VIEW,
        shortcut: "G T",
      },
      {
        label: "Profit & Loss",
        href: "/reports/profit-loss",
        icon: TrendingUp,
        permission: PERMISSIONS.REPORT_VIEW,
        shortcut: "G P",
      },
      {
        label: "Balance Sheet",
        href: "/reports/balance-sheet",
        icon: FileBarChart,
        permission: PERMISSIONS.REPORT_VIEW,
        shortcut: "G B",
      },
    ],
  },
  {
    label: "Sales",
    items: [
      { label: "Customers", href: "/sales/customers", icon: Users, phase: 2 },
      { label: "Invoices", href: "/sales/invoices", icon: Receipt, phase: 2 },
      { label: "Receipts", href: "/sales/receipts", icon: Wallet, phase: 2 },
      { label: "AR Aging", href: "/sales/ar-aging", icon: FileSpreadsheet, phase: 2 },
    ],
  },
  {
    label: "Purchases",
    items: [
      { label: "Suppliers", href: "/purchases/suppliers", icon: Building2, phase: 2 },
      { label: "Bills", href: "/purchases/bills", icon: ClipboardList, phase: 2 },
      { label: "Payments", href: "/purchases/payments", icon: Banknote, phase: 2 },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Banking", href: "/banking", icon: Banknote, phase: 2 },
      { label: "Inventory", href: "/inventory", icon: Boxes, phase: 3 },
      { label: "Purchasing", href: "/purchasing", icon: ShoppingCart, phase: 3 },
      { label: "Payroll", href: "/payroll", icon: Users, phase: 4 },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Users & Roles", href: "/admin/users", icon: ShieldCheck, permission: PERMISSIONS.USER_VIEW },
      { label: "Audit Log", href: "/admin/audit-log", icon: ScrollText, permission: PERMISSIONS.AUDIT_VIEW },
      { label: "Settings", href: "/admin/settings", icon: Settings, permission: PERMISSIONS.COMPANY_VIEW },
    ],
  },
];

/** Labels for the "coming in Phase N" hint on disabled items. */
export const PHASE_LABELS: Record<number, string> = {
  2: "Phase 2",
  3: "Phase 3",
  4: "Phase 4",
  5: "Phase 5",
  6: "Phase 6",
};
