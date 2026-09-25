/**
 * Standard Malaysian chart of accounts template (docs/spec/13 §51 step 4).
 *
 * `parent` references another entry's `code`; header accounts are not postable,
 * so the ledger only ever receives leaf postings. `system` marks accounts the
 * posting rules resolve by role (docs/spec/04) — they cannot be deleted.
 */
import type { AccountSubType, AccountType } from "@zycount/shared";

export interface CoaTemplateAccount {
  code: string;
  name: string;
  type: AccountType;
  subType?: AccountSubType;
  parent?: string;
  postable?: boolean;
  system?: boolean;
  description?: string;
}

export const MY_CHART_OF_ACCOUNTS: CoaTemplateAccount[] = [
  // ── Assets ───────────────────────────────────────────────
  { code: "1000", name: "ASSETS", type: "ASSET", postable: false, system: true },

  { code: "1100", name: "Current Assets", type: "ASSET", subType: "CURRENT_ASSET", parent: "1000", postable: false, system: true },
  { code: "1110", name: "Cash in Hand", type: "ASSET", subType: "CURRENT_ASSET", parent: "1100", system: true },
  { code: "1120", name: "Petty Cash", type: "ASSET", subType: "CURRENT_ASSET", parent: "1100" },
  { code: "1130", name: "Bank Accounts", type: "ASSET", subType: "CURRENT_ASSET", parent: "1100", postable: false, system: true },
  { code: "1131", name: "Maybank Current Account", type: "ASSET", subType: "CURRENT_ASSET", parent: "1130", system: true },
  { code: "1132", name: "CIMB Current Account", type: "ASSET", subType: "CURRENT_ASSET", parent: "1130" },
  { code: "1140", name: "Fixed Deposits", type: "ASSET", subType: "CURRENT_ASSET", parent: "1100" },
  { code: "1150", name: "Accounts Receivable", type: "ASSET", subType: "CURRENT_ASSET", parent: "1100", system: true, description: "Trade debtors control account." },
  { code: "1155", name: "Allowance for Doubtful Debts", type: "ASSET", subType: "CURRENT_ASSET", parent: "1100", description: "Contra-asset against receivables." },
  { code: "1160", name: "Other Receivables", type: "ASSET", subType: "CURRENT_ASSET", parent: "1100" },
  { code: "1170", name: "Inventory", type: "ASSET", subType: "CURRENT_ASSET", parent: "1100", system: true },
  { code: "1180", name: "Prepaid Expenses", type: "ASSET", subType: "CURRENT_ASSET", parent: "1100", system: true },
  { code: "1190", name: "Deposits Paid", type: "ASSET", subType: "CURRENT_ASSET", parent: "1100" },
  { code: "1195", name: "SST Input Tax", type: "ASSET", subType: "CURRENT_ASSET", parent: "1100", system: true, description: "Recoverable input tax (tax receivable)." },

  { code: "1500", name: "Non-Current Assets", type: "ASSET", subType: "NON_CURRENT_ASSET", parent: "1000", postable: false, system: true },
  { code: "1510", name: "Land and Buildings", type: "ASSET", subType: "NON_CURRENT_ASSET", parent: "1500" },
  { code: "1515", name: "Accumulated Depreciation — Land and Buildings", type: "ASSET", subType: "NON_CURRENT_ASSET", parent: "1500" },
  { code: "1520", name: "Plant and Machinery", type: "ASSET", subType: "NON_CURRENT_ASSET", parent: "1500" },
  { code: "1525", name: "Accumulated Depreciation — Plant and Machinery", type: "ASSET", subType: "NON_CURRENT_ASSET", parent: "1500" },
  { code: "1530", name: "Motor Vehicles", type: "ASSET", subType: "NON_CURRENT_ASSET", parent: "1500" },
  { code: "1535", name: "Accumulated Depreciation — Motor Vehicles", type: "ASSET", subType: "NON_CURRENT_ASSET", parent: "1500" },
  { code: "1540", name: "Office Equipment", type: "ASSET", subType: "NON_CURRENT_ASSET", parent: "1500" },
  { code: "1545", name: "Accumulated Depreciation — Office Equipment", type: "ASSET", subType: "NON_CURRENT_ASSET", parent: "1500" },
  { code: "1550", name: "Furniture and Fittings", type: "ASSET", subType: "NON_CURRENT_ASSET", parent: "1500" },
  { code: "1555", name: "Accumulated Depreciation — Furniture and Fittings", type: "ASSET", subType: "NON_CURRENT_ASSET", parent: "1500" },
  { code: "1560", name: "Computer Equipment", type: "ASSET", subType: "NON_CURRENT_ASSET", parent: "1500" },
  { code: "1565", name: "Accumulated Depreciation — Computer Equipment", type: "ASSET", subType: "NON_CURRENT_ASSET", parent: "1500" },
  { code: "1580", name: "Intangible Assets", type: "ASSET", subType: "NON_CURRENT_ASSET", parent: "1500" },

  // ── Liabilities ──────────────────────────────────────────
  { code: "2000", name: "LIABILITIES", type: "LIABILITY", postable: false, system: true },

  { code: "2100", name: "Current Liabilities", type: "LIABILITY", subType: "CURRENT_LIABILITY", parent: "2000", postable: false, system: true },
  { code: "2110", name: "Accounts Payable", type: "LIABILITY", subType: "CURRENT_LIABILITY", parent: "2100", system: true, description: "Trade creditors control account." },
  { code: "2120", name: "Other Payables", type: "LIABILITY", subType: "CURRENT_LIABILITY", parent: "2100" },
  { code: "2130", name: "Accrued Expenses", type: "LIABILITY", subType: "CURRENT_LIABILITY", parent: "2100", system: true },
  { code: "2140", name: "Goods Received Not Invoiced", type: "LIABILITY", subType: "CURRENT_LIABILITY", parent: "2100", system: true, description: "GRNI clearing account for three-way match." },
  { code: "2150", name: "SST Output Tax", type: "LIABILITY", subType: "CURRENT_LIABILITY", parent: "2100", system: true, description: "Output tax collected (tax payable)." },
  { code: "2160", name: "EPF Payable", type: "LIABILITY", subType: "CURRENT_LIABILITY", parent: "2100", system: true },
  { code: "2165", name: "SOCSO Payable", type: "LIABILITY", subType: "CURRENT_LIABILITY", parent: "2100", system: true },
  { code: "2170", name: "EIS Payable", type: "LIABILITY", subType: "CURRENT_LIABILITY", parent: "2100", system: true },
  { code: "2175", name: "PCB Payable", type: "LIABILITY", subType: "CURRENT_LIABILITY", parent: "2100", system: true },
  { code: "2180", name: "Salaries Payable", type: "LIABILITY", subType: "CURRENT_LIABILITY", parent: "2100", system: true },
  { code: "2185", name: "Employee Claims Payable", type: "LIABILITY", subType: "CURRENT_LIABILITY", parent: "2100", system: true },
  { code: "2190", name: "Bank Overdraft", type: "LIABILITY", subType: "CURRENT_LIABILITY", parent: "2100" },
  { code: "2195", name: "Current Portion of Term Loans", type: "LIABILITY", subType: "CURRENT_LIABILITY", parent: "2100" },
  { code: "2198", name: "Deposits Received", type: "LIABILITY", subType: "CURRENT_LIABILITY", parent: "2100" },

  { code: "2500", name: "Non-Current Liabilities", type: "LIABILITY", subType: "NON_CURRENT_LIABILITY", parent: "2000", postable: false, system: true },
  { code: "2510", name: "Term Loans", type: "LIABILITY", subType: "NON_CURRENT_LIABILITY", parent: "2500" },
  { code: "2520", name: "Hire Purchase Creditors", type: "LIABILITY", subType: "NON_CURRENT_LIABILITY", parent: "2500" },
  { code: "2530", name: "Deferred Taxation", type: "LIABILITY", subType: "NON_CURRENT_LIABILITY", parent: "2500" },

  // ── Equity ───────────────────────────────────────────────
  { code: "3000", name: "EQUITY", type: "EQUITY", subType: "EQUITY", postable: false, system: true },
  { code: "3100", name: "Share Capital", type: "EQUITY", subType: "EQUITY", parent: "3000", system: true },
  { code: "3200", name: "Retained Earnings", type: "EQUITY", subType: "EQUITY", parent: "3000", system: true, description: "Accumulated result of prior years; year-end close posts here." },
  { code: "3300", name: "Shareholders' Drawings", type: "EQUITY", subType: "EQUITY", parent: "3000" },
  { code: "3400", name: "Reserves", type: "EQUITY", subType: "EQUITY", parent: "3000" },

  // ── Revenue ──────────────────────────────────────────────
  { code: "4000", name: "REVENUE", type: "REVENUE", postable: false, system: true },
  { code: "4100", name: "Operating Revenue", type: "REVENUE", subType: "OPERATING_REVENUE", parent: "4000", postable: false, system: true },
  { code: "4110", name: "Sales — Goods", type: "REVENUE", subType: "OPERATING_REVENUE", parent: "4100", system: true },
  { code: "4120", name: "Sales — Services", type: "REVENUE", subType: "OPERATING_REVENUE", parent: "4100", system: true },
  { code: "4130", name: "Sales Returns and Allowances", type: "REVENUE", subType: "OPERATING_REVENUE", parent: "4100", description: "Contra-revenue." },
  { code: "4140", name: "Discounts Allowed", type: "REVENUE", subType: "OPERATING_REVENUE", parent: "4100", description: "Contra-revenue." },

  { code: "4500", name: "Other Income", type: "REVENUE", subType: "OTHER_INCOME", parent: "4000", postable: false, system: true },
  { code: "4510", name: "Interest Income", type: "REVENUE", subType: "OTHER_INCOME", parent: "4500" },
  { code: "4520", name: "Rental Income", type: "REVENUE", subType: "OTHER_INCOME", parent: "4500" },
  { code: "4530", name: "Gain on Disposal of Assets", type: "REVENUE", subType: "OTHER_INCOME", parent: "4500" },
  { code: "4540", name: "Foreign Exchange Gain", type: "REVENUE", subType: "OTHER_INCOME", parent: "4500" },
  { code: "4590", name: "Sundry Income", type: "REVENUE", subType: "OTHER_INCOME", parent: "4500" },

  // ── Cost of sales ────────────────────────────────────────
  { code: "5000", name: "COST OF SALES", type: "COST_OF_SALES", subType: "COST_OF_SALES", postable: false, system: true },
  { code: "5100", name: "Cost of Goods Sold", type: "COST_OF_SALES", subType: "COST_OF_SALES", parent: "5000", system: true },
  { code: "5200", name: "Purchases", type: "COST_OF_SALES", subType: "COST_OF_SALES", parent: "5000", system: true },
  { code: "5300", name: "Direct Labour", type: "COST_OF_SALES", subType: "COST_OF_SALES", parent: "5000" },
  { code: "5400", name: "Freight and Duty Inward", type: "COST_OF_SALES", subType: "COST_OF_SALES", parent: "5000" },
  { code: "5500", name: "Inventory Adjustment", type: "COST_OF_SALES", subType: "COST_OF_SALES", parent: "5000", system: true },
  { code: "5600", name: "Subcontractor Costs", type: "COST_OF_SALES", subType: "COST_OF_SALES", parent: "5000" },

  // ── Operating expenses ───────────────────────────────────
  { code: "6000", name: "EXPENSES", type: "EXPENSE", postable: false, system: true },

  { code: "6100", name: "Staff Costs", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6000", postable: false, system: true },
  { code: "6110", name: "Salaries and Wages", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6100", system: true },
  { code: "6120", name: "EPF — Employer", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6100", system: true },
  { code: "6130", name: "SOCSO — Employer", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6100", system: true },
  { code: "6140", name: "EIS — Employer", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6100", system: true },
  { code: "6150", name: "Bonus and Allowances", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6100" },
  { code: "6160", name: "Staff Welfare", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6100" },
  { code: "6170", name: "Staff Training", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6100" },

  { code: "6200", name: "Occupancy Costs", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6000", postable: false, system: true },
  { code: "6210", name: "Rental of Premises", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6200", system: true },
  { code: "6220", name: "Utilities", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6200", system: true },
  { code: "6230", name: "Repairs and Maintenance", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6200" },
  { code: "6240", name: "Insurance", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6200" },
  { code: "6250", name: "Quit Rent and Assessment", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6200" },

  { code: "6300", name: "Administrative Expenses", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6000", postable: false, system: true },
  { code: "6310", name: "Office Supplies", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6300" },
  { code: "6320", name: "Printing and Stationery", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6300" },
  { code: "6330", name: "Telephone and Internet", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6300" },
  { code: "6340", name: "Postage and Courier", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6300" },
  { code: "6350", name: "Professional Fees", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6300" },
  { code: "6360", name: "Audit Fees", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6300" },
  { code: "6370", name: "Secretarial Fees", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6300" },
  { code: "6380", name: "Bank Charges", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6300", system: true },
  { code: "6390", name: "Licences and Permits", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6300" },

  { code: "6400", name: "Selling and Distribution", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6000", postable: false, system: true },
  { code: "6410", name: "Advertising and Promotion", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6400" },
  { code: "6420", name: "Travelling and Transport", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6400" },
  { code: "6430", name: "Entertainment", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6400" },
  { code: "6440", name: "Freight Outward", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6400" },
  { code: "6450", name: "Commission", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6400" },

  { code: "6500", name: "Depreciation and Amortisation", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6000", postable: false, system: true },
  { code: "6510", name: "Depreciation — Land and Buildings", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6500" },
  { code: "6520", name: "Depreciation — Plant and Machinery", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6500" },
  { code: "6530", name: "Depreciation — Motor Vehicles", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6500" },
  { code: "6540", name: "Depreciation — Office Equipment", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6500", system: true },
  { code: "6550", name: "Depreciation — Furniture and Fittings", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6500" },
  { code: "6560", name: "Depreciation — Computer Equipment", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6500", system: true },
  { code: "6590", name: "Amortisation of Intangibles", type: "EXPENSE", subType: "OPERATING_EXPENSE", parent: "6500" },

  // ── Non-operating ────────────────────────────────────────
  { code: "6600", name: "Finance Costs", type: "EXPENSE", subType: "OTHER_EXPENSE", parent: "6000", postable: false, system: true },
  { code: "6610", name: "Interest on Term Loans", type: "EXPENSE", subType: "OTHER_EXPENSE", parent: "6600", system: true },
  { code: "6620", name: "Hire Purchase Interest", type: "EXPENSE", subType: "OTHER_EXPENSE", parent: "6600" },

  { code: "6700", name: "Other Expenses", type: "EXPENSE", subType: "OTHER_EXPENSE", parent: "6000", postable: false, system: true },
  { code: "6710", name: "Bad Debts Written Off", type: "EXPENSE", subType: "OTHER_EXPENSE", parent: "6700", system: true },
  { code: "6720", name: "Loss on Disposal of Assets", type: "EXPENSE", subType: "OTHER_EXPENSE", parent: "6700" },
  { code: "6730", name: "Foreign Exchange Loss", type: "EXPENSE", subType: "OTHER_EXPENSE", parent: "6700" },
  { code: "6740", name: "Donations", type: "EXPENSE", subType: "OTHER_EXPENSE", parent: "6700" },
  { code: "6790", name: "Sundry Expenses", type: "EXPENSE", subType: "OTHER_EXPENSE", parent: "6700" },
];

/** Codes the posting engine and reports resolve by name — never deleted. */
export const SYSTEM_ACCOUNT_CODES = {
  cash: "1110",
  bank: "1131",
  accountsReceivable: "1150",
  inventory: "1170",
  prepaidExpenses: "1180",
  inputTax: "1195",
  accountsPayable: "2110",
  accruedExpenses: "2130",
  grni: "2140",
  outputTax: "2150",
  epfPayable: "2160",
  socsoPayable: "2165",
  eisPayable: "2170",
  pcbPayable: "2175",
  salariesPayable: "2180",
  shareCapital: "3100",
  retainedEarnings: "3200",
  salesGoods: "4110",
  salesServices: "4120",
  costOfGoodsSold: "5100",
  purchases: "5200",
  inventoryAdjustment: "5500",
  salariesExpense: "6110",
  epfEmployer: "6120",
  socsoEmployer: "6130",
  eisEmployer: "6140",
  rental: "6210",
  utilities: "6220",
  bankCharges: "6380",
  depreciationOfficeEquipment: "6540",
  depreciationComputerEquipment: "6560",
  interestExpense: "6610",
  badDebts: "6710",
} as const;
