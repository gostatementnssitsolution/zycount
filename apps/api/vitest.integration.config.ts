import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Nest's dependency injection relies on `emitDecoratorMetadata`, which
  // esbuild does not implement — swc compiles the tests instead so guards and
  // services resolve exactly as they do at runtime.
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.e2e-spec.ts"],
    setupFiles: ["test/setup.ts"],
    // Booting Nest and querying a real database is slow; these are not unit tests.
    testTimeout: 60_000,
    hookTimeout: 180_000,
    // The suite shares one database, so files must not run concurrently.
    fileParallelism: false,
  },
});
