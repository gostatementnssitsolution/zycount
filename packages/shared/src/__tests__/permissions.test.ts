import { describe, expect, it } from "vitest";
import {
  ALL_PERMISSIONS,
  PERMISSIONS,
  PERMISSION_DESCRIPTIONS,
  ROLES,
  ROLE_PERMISSIONS,
  hasAnyPermission,
  hasPermission,
  parsePermission,
  permissionsForRoles,
} from "../permissions";

describe("permission catalogue", () => {
  it("describes every permission it defines", () => {
    for (const code of ALL_PERMISSIONS) {
      expect(PERMISSION_DESCRIPTIONS[code], `missing description for ${code}`).toBeTruthy();
    }
  });

  it("splits a code into its module and action", () => {
    expect(parsePermission("journal.post")).toEqual({ module: "journal", action: "post" });
  });

  it("gives every role a grant list", () => {
    for (const role of ROLES) {
      expect(ROLE_PERMISSIONS[role], `missing grants for ${role}`).toBeDefined();
    }
  });
});

describe("role matrix (docs/spec/06)", () => {
  it("gives administrators everything", () => {
    expect(ROLE_PERMISSIONS.SuperAdmin).toHaveLength(ALL_PERMISSIONS.length);
    expect(ROLE_PERMISSIONS.Admin).toHaveLength(ALL_PERMISSIONS.length);
  });

  it("lets accountants post but not close periods", () => {
    expect(ROLE_PERMISSIONS.Accountant).toContain(PERMISSIONS.JOURNAL_POST);
    expect(ROLE_PERMISSIONS.Accountant).not.toContain(PERMISSIONS.PERIOD_CLOSE);
  });

  it("lets finance managers close and reopen periods", () => {
    expect(ROLE_PERMISSIONS.FinanceManager).toContain(PERMISSIONS.PERIOD_CLOSE);
    expect(ROLE_PERMISSIONS.FinanceManager).toContain(PERMISSIONS.PERIOD_REOPEN);
  });

  it("keeps auditors read-only while giving them the audit log", () => {
    const auditor = ROLE_PERMISSIONS.Auditor;
    expect(auditor).toContain(PERMISSIONS.AUDIT_VIEW);

    // An auditor must never be able to change financial data.
    const mutating = auditor.filter((code) => !/\.(view|export|print)$/.test(code));
    expect(mutating).toEqual([]);
  });

  it("keeps ReadOnly away from the audit log and from every mutation", () => {
    const readOnly = ROLE_PERMISSIONS.ReadOnly;
    expect(readOnly).not.toContain(PERMISSIONS.AUDIT_VIEW);
    expect(readOnly.filter((code) => !/\.(view|export|print)$/.test(code))).toEqual([]);
  });

  it("keeps operational roles out of the ledger", () => {
    for (const role of ["Sales", "Purchaser", "HR", "Employee"] as const) {
      expect(ROLE_PERMISSIONS[role]).not.toContain(PERMISSIONS.JOURNAL_POST);
      expect(ROLE_PERMISSIONS[role]).not.toContain(PERMISSIONS.LEDGER_VIEW);
    }
  });
});

describe("permission checks", () => {
  const granted = [PERMISSIONS.JOURNAL_VIEW, PERMISSIONS.JOURNAL_CREATE];

  it("requires every code when several are asked for", () => {
    expect(hasPermission(granted, PERMISSIONS.JOURNAL_VIEW)).toBe(true);
    expect(hasPermission(granted, PERMISSIONS.JOURNAL_VIEW, PERMISSIONS.JOURNAL_POST)).toBe(false);
  });

  it("requires only one code for an any-of check", () => {
    expect(hasAnyPermission(granted, PERMISSIONS.JOURNAL_POST, PERMISSIONS.JOURNAL_CREATE)).toBe(true);
    expect(hasAnyPermission(granted, PERMISSIONS.PERIOD_CLOSE)).toBe(false);
  });

  it("treats an empty requirement as satisfied", () => {
    expect(hasPermission([])).toBe(true);
  });

  it("unions the grants of several roles", () => {
    const combined = permissionsForRoles(["Accountant", "FinanceManager"]);
    expect(combined).toContain(PERMISSIONS.JOURNAL_POST);
    expect(combined).toContain(PERMISSIONS.PERIOD_CLOSE);
    expect(new Set(combined).size).toBe(combined.length);
  });

  it("ignores roles it does not know", () => {
    expect(permissionsForRoles(["NotARole"])).toEqual([]);
  });
});
