import type { HealthMetric, SeriesPoint } from "./types";

/** Preview data for Business Health and Analytics. See `./types`. */

export const REVENUE_MOVEMENT: SeriesPoint[] = [
  { label: "Oct 25", revenue: 412000, expenses: 318000, netProfit: 94000, cash: 286000 },
  { label: "Nov 25", revenue: 438500, expenses: 331200, netProfit: 107300, cash: 312400 },
  { label: "Dec 25", revenue: 521800, expenses: 372600, netProfit: 149200, cash: 368900 },
  { label: "Jan 26", revenue: 396400, expenses: 341100, netProfit: 55300, cash: 341200 },
  { label: "Feb 26", revenue: 428900, expenses: 336800, netProfit: 92100, cash: 358600 },
  { label: "Mar 26", revenue: 467300, expenses: 352400, netProfit: 114900, cash: 382900 },
  { label: "Apr 26", revenue: 489100, expenses: 366900, netProfit: 122200, cash: 401500 },
  { label: "May 26", revenue: 451200, expenses: 359800, netProfit: 91400, cash: 396200 },
  { label: "Jun 26", revenue: 502600, expenses: 374300, netProfit: 128300, cash: 418700 },
  { label: "Jul 26", revenue: 534800, expenses: 388100, netProfit: 146700, cash: 442100 },
  { label: "Aug 26", revenue: 561300, expenses: 401200, netProfit: 160100, cash: 468300 },
  { label: "Sep 26", revenue: 601676, expenses: 243855, netProfit: 357821, cash: 412860 },
];

export const EXPENSE_MIX = [
  { name: "Cost of goods sold", value: 98420, accountCode: "5000" },
  { name: "Salaries & wages", value: 73700, accountCode: "6100" },
  { name: "Rent", value: 18000, accountCode: "6200" },
  { name: "Freight & transport", value: 32264, accountCode: "6310" },
  { name: "Marketing", value: 14600, accountCode: "6300" },
  { name: "Other overheads", value: 6871, accountCode: "6900" },
];

export const INVENTORY_MOVEMENT: SeriesPoint[] = [
  { label: "Apr 26", inbound: 186000, outbound: 142000, closing: 228400 },
  { label: "May 26", inbound: 142000, outbound: 168000, closing: 202400 },
  { label: "Jun 26", inbound: 204000, outbound: 179000, closing: 227400 },
  { label: "Jul 26", inbound: 168000, outbound: 194000, closing: 201400 },
  { label: "Aug 26", inbound: 221000, outbound: 206000, closing: 216400 },
  { label: "Sep 26", inbound: 148500, outbound: 140404, closing: 224496 },
];

export const CASH_MOVEMENT: SeriesPoint[] = [
  { label: "Week 1", inflow: 148200, outflow: 96400, closing: 364700 },
  { label: "Week 2", inflow: 96800, outflow: 142100, closing: 319400 },
  { label: "Week 3", inflow: 212400, outflow: 88900, closing: 442900 },
  { label: "Week 4", inflow: 77436, outflow: 107476, closing: 412860 },
];

export const PAYMENT_STATUS_MIX = [
  { name: "Paid", value: 486300, tone: "success" as const },
  { name: "Outstanding", value: 325313.2, tone: "info" as const },
  { name: "Overdue", value: 63226.8, tone: "destructive" as const },
];

export const MARGIN_TREND: SeriesPoint[] = [
  { label: "Apr 26", grossMargin: 41.2, operatingMargin: 18.6 },
  { label: "May 26", grossMargin: 39.8, operatingMargin: 16.9 },
  { label: "Jun 26", grossMargin: 42.6, operatingMargin: 19.8 },
  { label: "Jul 26", grossMargin: 43.9, operatingMargin: 21.4 },
  { label: "Aug 26", grossMargin: 44.8, operatingMargin: 22.6 },
  { label: "Sep 26", grossMargin: 46.1, operatingMargin: 24.2 },
];

export const HEALTH_METRICS: HealthMetric[] = [
  { key: "runway", label: "Cash runway", value: "8.4", unit: "MONTHS", target: "6.0", trend: [5.2, 5.8, 6.1, 6.9, 7.4, 8.4], signal: 1, hint: "Closing cash divided by the average monthly net burn of the last three months." },
  { key: "grossMargin", label: "Gross margin", value: "46.1", unit: "PERCENT", target: "45.0", trend: [41.2, 39.8, 42.6, 43.9, 44.8, 46.1], signal: 1, hint: "Revenue less cost of goods sold, as a share of revenue." },
  { key: "operatingMargin", label: "Operating margin", value: "24.2", unit: "PERCENT", target: "20.0", trend: [18.6, 16.9, 19.8, 21.4, 22.6, 24.2], signal: 1, hint: "Operating profit as a share of revenue, before tax and financing." },
  { key: "dso", label: "Debtor days", value: "38", unit: "DAYS", target: "30", trend: [44, 42, 41, 39, 40, 38], signal: 0, hint: "Average days a sales invoice waits to be paid. Your standard term is 30 days." },
  { key: "dpo", label: "Creditor days", value: "31", unit: "DAYS", target: "30", trend: [26, 28, 27, 30, 29, 31], signal: 1, hint: "Average days taken to settle supplier bills." },
  { key: "currentRatio", label: "Current ratio", value: "2.14", unit: "RATIO", target: "1.50", trend: [1.82, 1.88, 1.94, 2.02, 2.08, 2.14], signal: 1, hint: "Current assets divided by current liabilities." },
  { key: "inventoryDays", label: "Inventory days", value: "64", unit: "DAYS", target: "45", trend: [58, 61, 63, 66, 68, 64], signal: -1, hint: "How long stock sits before it sells. Two SKUs are carrying most of the excess." },
  { key: "burn", label: "Net monthly burn", value: "48920.00", unit: "MONEY", trend: [62000, 58400, 54100, 51200, 49800, 48920], signal: 1, hint: "Average cash out less cash in over the last three months." },
];

/** Share is derived from revenue where it is shown, so the two never disagree. */
export const TOP_CUSTOMERS = [
  { name: "Pantai Logistics Bhd", revenue: "1128400.00", change: -4.2 },
  { name: "Bayu Hospitality Group", revenue: "864200.00", change: 12.8 },
  { name: "Sunway Retail Group Sdn Bhd", revenue: "742180.00", change: 22.4 },
  { name: "Tanjung Agro Industries", revenue: "402750.00", change: 6.1 },
  { name: "Meridian Softworks Pte Ltd", revenue: "312600.00", change: 3.3 },
];

export const TOP_ITEMS = [
  { sku: "SKU-1042", name: "Zycount POS Terminal — Model T3", units: 412, revenue: "762200.00", margin: 47.0 },
  { sku: "SKU-4110", name: "Fleet tracking device — LTE", units: 286, revenue: "160160.00", margin: 52.1 },
  { sku: "SKU-2210", name: "Thermal receipt printer", units: 348, revenue: "146160.00", margin: 56.0 },
  { sku: "SKU-5001", name: "Barcode scanner — wireless", units: 264, revenue: "81840.00", margin: 54.2 },
  { sku: "SKU-7220", name: "Customer display — 10 inch", units: 118, revenue: "75520.00", margin: 51.6 },
];

/** Items on the dashboard's action list. Each one links to the record behind it. */
export const WORKSPACE_TASKS = [
  { id: "wt-1", label: "Approve 3 invoices above RM 50,000", detail: "Oldest waiting 2 days", href: "/sales/invoices?status=PENDING", tone: "warning" as const, count: 3 },
  { id: "wt-2", label: "5 bank lines need a decision", detail: "Maybank Current Account", href: "/banking/reconciliation", tone: "info" as const, count: 6 },
  { id: "wt-3", label: "2 receipts waiting on review", detail: "Extracted, not yet posted", href: "/purchases/expenses", tone: "info" as const, count: 2 },
  { id: "wt-4", label: "RM 63,226.80 is overdue from 2 customers", detail: "Aurora Digital is 22 days late", href: "/sales/ar-aging", tone: "destructive" as const, count: 2 },
  { id: "wt-5", label: "September payroll is ready to post", detail: "Pay date 28 Sep", href: "/payroll/pay-runs", tone: "warning" as const, count: 1 },
  { id: "wt-6", label: "Depreciation for September not yet run", detail: "6 assets, RM 11,551.25", href: "/fixed-assets/depreciation", tone: "info" as const, count: 1 },
];
