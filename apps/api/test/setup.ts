import { config } from "dotenv";
import { resolve } from "node:path";

/**
 * Prisma reads `DATABASE_URL` when the client is constructed, which happens
 * before Nest's ConfigModule runs — so the environment is loaded here, before
 * any test file imports the application.
 */
config({ path: resolve(__dirname, "../../../.env") });
config({ path: resolve(__dirname, "../.env") });

process.env.NODE_ENV ??= "test";
process.env.JWT_ACCESS_SECRET ??= "integration-test-access-secret-value";
process.env.JWT_REFRESH_SECRET ??= "integration-test-refresh-secret-value";

// The suite drives hundreds of requests from one address in a few seconds, so
// the throttler is lifted here rather than weakened in the application itself.
process.env.RATE_LIMIT_MAX ??= "100000";
process.env.AUTH_RATE_LIMIT ??= "10000";
