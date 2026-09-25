import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuditModule } from "./common/audit/audit.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { CompanyScopeGuard } from "./common/guards/company-scope.guard";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { PrismaModule } from "./common/prisma/prisma.module";
import { AccountsModule } from "./modules/accounts/accounts.module";
import { AuditLogModule } from "./modules/audit/audit-log.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CompaniesModule } from "./modules/companies/companies.module";
import { HealthModule } from "./modules/health/health.module";
import { JournalsModule } from "./modules/journals/journals.module";
import { PeriodsModule } from "./modules/periods/periods.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { UsersModule } from "./modules/users/users.module";

/**
 * Root module. Guards are registered globally and run in order —
 * authenticate, then check permissions, then resolve and authorise the company
 * scope — so no route can accidentally skip one (docs/spec/06).
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // The API may be started from its own directory or from the repo root,
      // so both locations are searched for the environment file.
      envFilePath: [".env", "../../.env"],
    }),
    ThrottlerModule.forRoot([
      {
        name: "default",
        ttl: Number(process.env.RATE_LIMIT_TTL_MS ?? 60_000),
        // Raised well clear of the default for test runs, which drive hundreds
        // of requests from a single address in a few seconds.
        limit: Number(process.env.RATE_LIMIT_MAX ?? 300),
      },
    ]),
    PrismaModule,
    AuditModule,
    AuthModule,
    HealthModule,
    CompaniesModule,
    UsersModule,
    AccountsModule,
    PeriodsModule,
    JournalsModule,
    ReportsModule,
    AuditLogModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: CompanyScopeGuard },
  ],
})
export class AppModule {}
