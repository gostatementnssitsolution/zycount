import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      // The accounting engine and money maths carry the highest bar
      // (docs/spec/12 — Coverage policy).
      thresholds: { lines: 85, functions: 85, branches: 80, statements: 85 },
      include: ["src/money.ts", "src/invariants.ts", "src/permissions.ts", "src/accounting.ts"],
    },
  },
});
