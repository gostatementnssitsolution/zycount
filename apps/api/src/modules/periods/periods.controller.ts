import { Body, Controller, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import {
  PERMISSIONS,
  closePeriodSchema,
  createPeriodSchema,
  generatePeriodsSchema,
  reopenPeriodSchema,
  type CreatePeriodInput,
  type GeneratePeriodsInput,
} from "@zycount/shared";
import { z } from "zod";
import {
  ClientInfo,
  CompanyId,
  CurrentUser,
  RequireCompany,
  RequirePermission,
} from "../../common/decorators";
import type { AuthenticatedUser, ClientContext } from "../../common/guards/types";
import { zodBody } from "../../common/pipes/zod-validation.pipe";
import { PeriodsService } from "./periods.service";

@Controller()
@RequireCompany()
export class PeriodsController {
  constructor(private readonly periods: PeriodsService) {}

  @Get("companies/:companyId/fiscal-periods")
  @RequirePermission(PERMISSIONS.PERIOD_VIEW)
  list(@CompanyId() companyId: string, @Query("year") year?: string) {
    return this.periods.list(companyId, year ? Number(year) : undefined);
  }

  @Get("companies/:companyId/fiscal-periods/:id")
  @RequirePermission(PERMISSIONS.PERIOD_VIEW)
  findOne(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.periods.findOne(companyId, id);
  }

  @Get("companies/:companyId/fiscal-periods/:id/close-readiness")
  @RequirePermission(PERMISSIONS.PERIOD_VIEW)
  readiness(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.periods.closeReadiness(companyId, id);
  }

  @Post("companies/:companyId/fiscal-periods")
  @RequirePermission(PERMISSIONS.PERIOD_CREATE)
  create(
    @CompanyId() companyId: string,
    @Body(zodBody(createPeriodSchema)) body: CreatePeriodInput,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientContext,
  ) {
    return this.periods.create(companyId, body, user, client);
  }

  @Post("companies/:companyId/fiscal-periods/generate")
  @RequirePermission(PERMISSIONS.PERIOD_CREATE)
  generate(
    @CompanyId() companyId: string,
    @Body(zodBody(generatePeriodsSchema)) body: GeneratePeriodsInput,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientContext,
  ) {
    return this.periods.generate(companyId, body, user, client);
  }

  @Post("companies/:companyId/fiscal-periods/:id/close")
  @RequirePermission(PERMISSIONS.PERIOD_CLOSE)
  @HttpCode(200)
  close(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body(zodBody(closePeriodSchema)) body: z.infer<typeof closePeriodSchema>,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientContext,
  ) {
    return this.periods.close(companyId, id, body, user, client);
  }

  @Post("companies/:companyId/fiscal-periods/:id/reopen")
  @RequirePermission(PERMISSIONS.PERIOD_REOPEN)
  @HttpCode(200)
  reopen(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body(zodBody(reopenPeriodSchema)) body: z.infer<typeof reopenPeriodSchema>,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientContext,
  ) {
    return this.periods.reopen(companyId, id, body.reason, user, client);
  }
}
