/**
 * Seed script — demo data (blueprint §52).
 * Phase 0: seeds roles, permissions, and a demo organisation + company with a
 * standard Malaysian chart of accounts and an open fiscal period.
 *
 * Expand per docs/spec/13-seed-and-demo-data.md as later phases land.
 */
import { PrismaClient, AccountType } from "@prisma/client";

const prisma = new PrismaClient();

const ROLES = [
  "SuperAdmin",
  "Admin",
  "Accountant",
  "FinanceManager",
  "Auditor",
  "Sales",
  "Purchaser",
  "HR",
  "Employee",
  "ReadOnly",
];

const COA: Array<{ code: string; name: string; type: AccountType; postable?: boolean }> = [
  { code: "1000", name: "ASSETS", type: AccountType.ASSET, postable: false },
  { code: "1100", name: "Cash", type: AccountType.ASSET },
  { code: "1200", name: "Bank", type: AccountType.ASSET },
  { code: "1300", name: "Accounts Receivable", type: AccountType.ASSET },
  { code: "1400", name: "Inventory", type: AccountType.ASSET },
  { code: "1500", name: "Fixed Assets", type: AccountType.ASSET },
  { code: "2000", name: "LIABILITIES", type: AccountType.LIABILITY, postable: false },
  { code: "2100", name: "Accounts Payable", type: AccountType.LIABILITY },
  { code: "2200", name: "Loans", type: AccountType.LIABILITY },
  { code: "2300", name: "Tax Payable", type: AccountType.LIABILITY },
  { code: "3000", name: "EQUITY", type: AccountType.EQUITY, postable: false },
  { code: "3100", name: "Share Capital", type: AccountType.EQUITY },
  { code: "3200", name: "Retained Earnings", type: AccountType.EQUITY },
  { code: "3300", name: "Drawings", type: AccountType.EQUITY },
  { code: "4000", name: "REVENUE", type: AccountType.REVENUE, postable: false },
  { code: "4100", name: "Sales", type: AccountType.REVENUE },
  { code: "4200", name: "Service Revenue", type: AccountType.REVENUE },
  { code: "5000", name: "Cost of Sales", type: AccountType.COST_OF_SALES },
  { code: "6000", name: "EXPENSES", type: AccountType.EXPENSE, postable: false },
  { code: "6100", name: "Salary", type: AccountType.EXPENSE },
  { code: "6200", name: "Rental", type: AccountType.EXPENSE },
  { code: "6300", name: "Utilities", type: AccountType.EXPENSE },
  { code: "6400", name: "Depreciation", type: AccountType.EXPENSE },
];

async function main() {
  for (const name of ROLES) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }

  const org = await prisma.organization.create({ data: { name: "Demo Group" } });
  const company = await prisma.company.create({
    data: { organizationId: org.id, name: "Demo Trading Sdn Bhd", baseCurrency: "MYR" },
  });

  for (const a of COA) {
    await prisma.account.create({
      data: {
        companyId: company.id,
        code: a.code,
        name: a.name,
        type: a.type,
        isPostable: a.postable ?? true,
      },
    });
  }

  await prisma.fiscalPeriod.create({
    data: {
      companyId: company.id,
      name: "January 2026",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-31"),
    },
  });

  console.log("Seed complete:", { org: org.name, company: company.name, accounts: COA.length });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
