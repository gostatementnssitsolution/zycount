import type { Employee, FixedAsset, PayRun } from "./types";

/** Preview data for Payroll and Fixed Assets. See `./types`. */

export const EMPLOYEES: Employee[] = [
  { id: "emp-1", code: "E-001", name: "Faizal Rahman", role: "Finance Manager", department: "Finance", joinedOn: "2020-03-02", status: "ACTIVE", grossMonthly: "14500.00", epfEmployee: "1595.00", epfEmployer: "1740.00", socso: "24.75", eis: "9.90", pcb: "1842.00", netMonthly: "11028.35", bankAccount: "Maybank •••• 3321" },
  { id: "emp-2", code: "E-002", name: "Nurul Aina Zulkifli", role: "Senior Accountant", department: "Finance", joinedOn: "2021-07-19", status: "ACTIVE", grossMonthly: "9200.00", epfEmployee: "1012.00", epfEmployer: "1104.00", socso: "24.75", eis: "9.90", pcb: "742.00", netMonthly: "7411.35", bankAccount: "CIMB •••• 8842" },
  { id: "emp-3", code: "E-003", name: "Siti Mariam Abdullah", role: "Accounts Executive", department: "Finance", joinedOn: "2023-01-09", status: "ACTIVE", grossMonthly: "5400.00", epfEmployee: "594.00", epfEmployer: "648.00", socso: "24.75", eis: "9.90", pcb: "188.00", netMonthly: "4583.35", bankAccount: "Maybank •••• 1180" },
  { id: "emp-4", code: "E-004", name: "Daniel Tan Wei Ming", role: "Head of Sales", department: "Sales", joinedOn: "2019-11-04", status: "ACTIVE", grossMonthly: "16800.00", epfEmployee: "1848.00", epfEmployer: "2016.00", socso: "24.75", eis: "9.90", pcb: "2410.00", netMonthly: "12507.35", bankAccount: "Public Bank •••• 5520" },
  { id: "emp-5", code: "E-005", name: "Priya Sundaram", role: "Solutions Consultant", department: "Sales", joinedOn: "2022-05-16", status: "ACTIVE", grossMonthly: "8600.00", epfEmployee: "946.00", epfEmployer: "1032.00", socso: "24.75", eis: "9.90", pcb: "634.00", netMonthly: "6985.35", bankAccount: "Maybank •••• 7714" },
  { id: "emp-6", code: "E-006", name: "Hafiz Ismail", role: "Warehouse Supervisor", department: "Operations", joinedOn: "2021-02-08", status: "ACTIVE", grossMonthly: "4800.00", epfEmployee: "528.00", epfEmployer: "576.00", socso: "24.75", eis: "9.90", pcb: "132.00", netMonthly: "4105.35", bankAccount: "RHB •••• 2290" },
  { id: "emp-7", code: "E-007", name: "Chong Li Hua", role: "Software Engineer", department: "Product", joinedOn: "2023-08-21", status: "ON_LEAVE", grossMonthly: "11200.00", epfEmployee: "1232.00", epfEmployer: "1344.00", socso: "24.75", eis: "9.90", pcb: "1104.00", netMonthly: "8829.35", bankAccount: "Maybank •••• 9903" },
  { id: "emp-8", code: "E-008", name: "Arif Danial", role: "Delivery Driver", department: "Operations", joinedOn: "2024-04-01", status: "ACTIVE", grossMonthly: "3200.00", epfEmployee: "352.00", epfEmployer: "384.00", socso: "22.40", eis: "8.96", pcb: "0.00", netMonthly: "2816.64", bankAccount: "Bank Islam •••• 4418" },
];

export const PAY_RUNS: PayRun[] = [
  {
    id: "run-1",
    period: "September 2026",
    payDate: "2026-09-28",
    status: "PENDING",
    headcount: 8,
    gross: "73700.00",
    statutory: "16148.31",
    net: "58267.09",
    employerCost: "82547.31",
    posting: {
      source: "PAYROLL_RUN",
      date: "2026-09-28",
      lines: [
        { accountCode: "6100", accountName: "Salaries & Wages", debit: "73700.00", credit: "0.00" },
        { accountCode: "6110", accountName: "EPF — Employer", debit: "8844.00", credit: "0.00" },
        { accountCode: "6120", accountName: "SOCSO & EIS — Employer", debit: "3.31", credit: "0.00" },
        { accountCode: "2210", accountName: "EPF Payable", debit: "0.00", credit: "16951.00" },
        { accountCode: "2220", accountName: "SOCSO & EIS Payable", debit: "0.00", credit: "229.21" },
        { accountCode: "2230", accountName: "PCB Payable", debit: "0.00", credit: "7052.00" },
        { accountCode: "2240", accountName: "Net Salaries Payable", debit: "0.00", credit: "58315.10" },
      ],
    },
  },
  {
    id: "run-2",
    period: "August 2026",
    payDate: "2026-08-28",
    status: "POSTED",
    headcount: 8,
    gross: "73700.00",
    statutory: "16148.31",
    net: "58267.09",
    employerCost: "82547.31",
    posting: { source: "PAYROLL_RUN", date: "2026-08-28", journalReference: "JV-2026-08-0240", lines: [] },
  },
  {
    id: "run-3",
    period: "July 2026",
    payDate: "2026-07-28",
    status: "POSTED",
    headcount: 7,
    gross: "62500.00",
    statutory: "13684.00",
    net: "49416.00",
    employerCost: "70012.00",
    posting: { source: "PAYROLL_RUN", date: "2026-07-28", journalReference: "JV-2026-07-0198", lines: [] },
  },
];

export const STATUTORY_SUBMISSIONS = [
  { id: "stat-1", name: "EPF (KWSP Form A)", period: "September 2026", dueOn: "2026-10-15", amount: "16951.00", status: "PENDING" as const, channel: "i-Akaun employer" },
  { id: "stat-2", name: "SOCSO & EIS (Borang 8A)", period: "September 2026", dueOn: "2026-10-15", amount: "229.21", status: "PENDING" as const, channel: "ASSIST portal" },
  { id: "stat-3", name: "Monthly tax deduction (PCB / CP39)", period: "September 2026", dueOn: "2026-10-15", amount: "7052.00", status: "PENDING" as const, channel: "e-PCB" },
  { id: "stat-4", name: "EPF (KWSP Form A)", period: "August 2026", dueOn: "2026-09-15", amount: "16951.00", status: "PAID" as const, channel: "i-Akaun employer" },
  { id: "stat-5", name: "Monthly tax deduction (PCB / CP39)", period: "August 2026", dueOn: "2026-09-15", amount: "7052.00", status: "PAID" as const, channel: "e-PCB" },
];

export const FIXED_ASSETS: FixedAsset[] = [
  { id: "fa-1", code: "FA-0001", name: "Toyota Hilux 2.8G — WXY 4412", category: "Motor Vehicles", acquiredOn: "2024-02-15", cost: "148000.00", residual: "20000.00", method: "STRAIGHT_LINE", usefulLifeMonths: 60, monthlyCharge: "2133.33", accumulated: "40533.27", netBookValue: "107466.73", status: "IN_USE", location: "Shah Alam DC" },
  { id: "fa-2", code: "FA-0002", name: "Warehouse racking system", category: "Furniture & Fittings", acquiredOn: "2023-06-01", cost: "86400.00", residual: "0.00", method: "STRAIGHT_LINE", usefulLifeMonths: 120, monthlyCharge: "720.00", accumulated: "28080.00", netBookValue: "58320.00", status: "IN_USE", location: "Shah Alam DC" },
  { id: "fa-3", code: "FA-0003", name: "Dell PowerEdge R760 server", category: "Office Equipment", acquiredOn: "2025-01-20", cost: "62500.00", residual: "5000.00", method: "REDUCING_BALANCE", usefulLifeMonths: 48, monthlyCharge: "1197.92", accumulated: "23958.40", netBookValue: "38541.60", status: "IN_USE", location: "HQ — Level 8" },
  { id: "fa-4", code: "FA-0004", name: "Office fit-out — Level 8", category: "Furniture & Fittings", acquiredOn: "2022-09-01", cost: "210000.00", residual: "0.00", method: "STRAIGHT_LINE", usefulLifeMonths: 60, monthlyCharge: "3500.00", accumulated: "171500.00", netBookValue: "38500.00", status: "IN_USE", location: "HQ — Level 8" },
  { id: "fa-5", code: "FA-0005", name: "Perodua Alza — WVB 1180", category: "Motor Vehicles", acquiredOn: "2021-03-10", cost: "62000.00", residual: "8000.00", method: "STRAIGHT_LINE", usefulLifeMonths: 60, monthlyCharge: "900.00", accumulated: "54000.00", netBookValue: "8000.00", status: "FULLY_DEPRECIATED", location: "HQ — Level 8" },
  { id: "fa-6", code: "FA-0006", name: "Forklift — Toyota 8FG25", category: "Office Equipment", acquiredOn: "2020-08-14", cost: "94000.00", residual: "10000.00", method: "STRAIGHT_LINE", usefulLifeMonths: 84, monthlyCharge: "1000.00", accumulated: "73000.00", netBookValue: "21000.00", status: "IN_USE", location: "Prai Warehouse" },
  { id: "fa-7", code: "FA-0007", name: "MacBook Pro fleet (12 units)", category: "Office Equipment", acquiredOn: "2025-07-01", cost: "108000.00", residual: "0.00", method: "STRAIGHT_LINE", usefulLifeMonths: 36, monthlyCharge: "3000.00", accumulated: "42000.00", netBookValue: "66000.00", status: "IN_USE", location: "HQ — Level 8" },
  { id: "fa-8", code: "FA-0008", name: "Honda City — WPQ 8842", category: "Motor Vehicles", acquiredOn: "2019-05-02", cost: "84000.00", residual: "6000.00", method: "STRAIGHT_LINE", usefulLifeMonths: 60, monthlyCharge: "1300.00", accumulated: "78000.00", netBookValue: "6000.00", status: "DISPOSED", location: "—" },
];

export const DEPRECIATION_RUN = {
  period: "September 2026",
  status: "PENDING" as const,
  assets: 6,
  charge: "11551.25",
  posting: {
    source: "DEPRECIATION_RUN",
    date: "2026-09-30",
    lines: [
      { accountCode: "6600", accountName: "Depreciation", debit: "11551.25", credit: "0.00" },
      { accountCode: "1590", accountName: "Accumulated Depreciation", debit: "0.00", credit: "11551.25" },
    ],
  },
};
