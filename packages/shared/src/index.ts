/**
 * `@zycount/shared` — the contract between the web app and the API.
 *
 * Validation is defined **once** here as Zod schemas and enforced on both
 * sides (docs/spec/09), so a rule can never drift between client and server.
 */

export * from "./money";
export * from "./errors";
export * from "./permissions";
export * from "./accounting";
export * from "./invariants";

export * from "./schemas/common";
export * from "./schemas/auth";
export * from "./schemas/company";
export * from "./schemas/account";
export * from "./schemas/period";
export * from "./schemas/journal";
export * from "./schemas/report";
export * from "./schemas/user";
