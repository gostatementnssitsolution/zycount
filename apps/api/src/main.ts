import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";

/** Fail fast rather than booting with a guessable signing key. */
function assertSecrets(): void {
  const required = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "DATABASE_URL"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (process.env.NODE_ENV === "production") {
    const weak = required
      .filter((key) => key.startsWith("JWT_"))
      .filter((key) => (process.env[key] ?? "").length < 32 || process.env[key]!.includes("change-me"));

    if (weak.length > 0) {
      throw new Error(
        `Refusing to start in production with placeholder or short secrets: ${weak.join(", ")}. ` +
          "Generate strong values and load them from your secret manager.",
      );
    }
  }
}

async function bootstrap(): Promise<void> {
  assertSecrets();

  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.setGlobalPrefix("api", { exclude: ["health"] });
  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cookieParser());
  // Validation is per-route via Zod schemas from `@zycount/shared`, so there is
  // deliberately no global class-validator pipe here.

  app.enableCors({
    origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    credentials: true,
    exposedHeaders: ["X-Correlation-Id"],
  });

  app.enableShutdownHooks();

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port);

  Logger.log(`Zycount API listening on http://localhost:${port}`, "Bootstrap");
}

void bootstrap();
