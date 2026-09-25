import { config } from "dotenv";
import { resolve } from "node:path";

/**
 * Prisma reads `DATABASE_URL` when the client is constructed, which happens
 * before Nest's ConfigModule runs — so the environment is loaded here, before
 * any test file imports the application.
 */
config({ path: resolve(__dirname, "../../../.env") });
config({ path: resolve(__dirname, "../.env") });

/**
 * The suite truncates tables and posts its own entries, so it must never point
 * at the database a developer is working in: fixtures left behind there show up
 * in the demo books and in anything generated from them. `TEST_DATABASE_URL`
 * wins if it is set; otherwise the development database name gains a `_test`
 * suffix, which is the database CI provisions too.
 */
function testDatabaseUrl(): string {
  const explicit = process.env.TEST_DATABASE_URL;
  if (explicit) return explicit;

  const configured = process.env.DATABASE_URL;
  if (!configured) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env before running the tests.");
  }

  const url = new URL(configured);
  const name = url.pathname.replace(/^\//, "");
  if (name.endsWith("_test")) return configured;

  url.pathname = `/${name}_test`;
  return url.toString();
}

process.env.DATABASE_URL = testDatabaseUrl();

process.env.NODE_ENV ??= "test";
process.env.JWT_ACCESS_SECRET ??= "integration-test-access-secret-value";
process.env.JWT_REFRESH_SECRET ??= "integration-test-refresh-secret-value";

// The suite drives hundreds of requests from one address in a few seconds, so
// the throttler is lifted here rather than weakened in the application itself.
process.env.RATE_LIMIT_MAX ??= "100000";
process.env.AUTH_RATE_LIMIT ??= "10000";
