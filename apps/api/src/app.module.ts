import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";

/**
 * Root module. Feature modules (auth, company, accounts, journals, ledger,
 * reports, …) are registered here as Phase 1 lands. See
 * docs/spec/15-repo-structure-and-devops.md for the module map.
 */
@Module({
  imports: [],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
