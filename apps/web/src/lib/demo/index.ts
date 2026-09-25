/**
 * Preview data for the modules that arrive after Phase 1.
 *
 * Everything exported here is a fixture, not API data. The Phase 1 screens
 * (chart of accounts, journals, ledger, reports, users, audit) read the real
 * API through `@/hooks` and are untouched by any of this. Screens that render
 * from this module carry a `<PreviewBanner />` so nobody mistakes a fixture
 * for their own books.
 */

export * from "./types";
export * from "./build";
export * from "./catalog";
export * from "./sales";
export * from "./purchases";
export * from "./inventory";
export * from "./banking";
export * from "./payroll";
export * from "./insights";
export * from "./copilot";
