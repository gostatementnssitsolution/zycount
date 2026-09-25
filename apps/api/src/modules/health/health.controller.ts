import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/decorators";
import { PrismaService } from "../../common/prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness plus a real database round-trip, for the deploy smoke test. */
  @Public()
  @Get()
  async check() {
    const startedAt = Date.now();
    let database: "up" | "down" = "down";

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = "up";
    } catch {
      database = "down";
    }

    return {
      status: database === "up" ? "ok" : "degraded",
      service: "zycount-api",
      version: process.env.npm_package_version ?? "0.1.0",
      database,
      latencyMs: Date.now() - startedAt,
      time: new Date().toISOString(),
    };
  }
}
