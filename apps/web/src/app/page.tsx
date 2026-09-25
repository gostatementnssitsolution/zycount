// Dashboard shell (blueprint §18). KPI tiles are placeholders until the
// reporting API lands in Phase 1.

const KPIS = [
  { label: "Revenue", value: "—" },
  { label: "Expenses", value: "—" },
  { label: "Net Profit", value: "—" },
  { label: "Cash", value: "—" },
  { label: "Receivables", value: "—" },
  { label: "Payables", value: "—" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-black/50 dark:text-white/50">
          Phase 0 shell — connect to the reporting API in Phase 1.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {KPIS.map((k) => (
          <div
            key={k.label}
            className="rounded-xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5"
          >
            <div className="text-xs uppercase tracking-wide text-black/40 dark:text-white/40">{k.label}</div>
            <div className="mt-1 text-2xl font-semibold">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-black/15 p-8 text-center text-sm text-black/50 dark:border-white/15 dark:text-white/50">
        Charts &amp; business-health panels render here once the accounting engine is live.
        <br />
        See <code>docs/spec/</code> for the full specification.
      </div>
    </div>
  );
}
