// Primary navigation — mirrors the blueprint's final sidebar (§62).
// Grouped, top-level items only for the Phase-0 shell; sub-routes land per phase.

const NAV: Array<{ group: string; items: string[] }> = [
  { group: "Overview", items: ["Dashboard"] },
  {
    group: "Accounting",
    items: ["Chart of Accounts", "Journal", "General Ledger", "Trial Balance", "Accounting Periods"],
  },
  {
    group: "Sales",
    items: ["Customers", "Quotations", "Sales Orders", "Invoices", "Credit Notes", "Receipts", "AR Aging"],
  },
  {
    group: "Purchases",
    items: ["Suppliers", "Purchase Orders", "GRN", "Bills", "Debit Notes", "Payments", "AP Aging"],
  },
  { group: "Inventory", items: ["Products", "Warehouses", "Stock", "Transfers", "Adjustments", "Valuation"] },
  { group: "Banking", items: ["Bank Accounts", "Transactions", "Reconciliation", "Bank Rules"] },
  { group: "Fixed Assets", items: ["Asset Register", "Depreciation", "Disposal", "Asset Reports"] },
  { group: "Payroll", items: ["Employees", "Payroll", "EPF", "SOCSO", "EIS", "PCB"] },
  {
    group: "Reports",
    items: ["Profit & Loss", "Balance Sheet", "Cash Flow", "Trial Balance", "General Ledger", "Tax Reports", "Budget"],
  },
  { group: "More", items: ["Projects", "Multi-Currency", "Companies", "Documents", "Notifications", "AI"] },
  { group: "Admin", items: ["Users & Roles", "Settings", "Audit Log"] },
];

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 overflow-y-auto border-r border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="mb-6 px-2 text-xl font-semibold tracking-tight">Zycount</div>
      <nav className="space-y-5 text-sm">
        {NAV.map((section) => (
          <div key={section.group}>
            <div className="px-2 text-[11px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
              {section.group}
            </div>
            <ul className="mt-1 space-y-0.5">
              {section.items.map((item) => (
                <li key={item}>
                  <span className="block cursor-pointer rounded-md px-2 py-1.5 hover:bg-black/5 dark:hover:bg-white/10">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
