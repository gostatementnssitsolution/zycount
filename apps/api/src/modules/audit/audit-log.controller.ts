import { Controller, Get, Param, Query, Req } from "@nestjs/common";
import { PERMISSIONS, listAuditQuerySchema } from "@zycount/shared";
import type { Request } from "express";
import { z } from "zod";
import { RequirePermission } from "../../common/decorators";
import { zodQuery } from "../../common/pipes/zod-validation.pipe";
import { AuditLogService } from "./audit-log.service";

@Controller("audit-log")
export class AuditLogController {
  constructor(private readonly auditLog: AuditLogService) {}

  @Get()
  @RequirePermission(PERMISSIONS.AUDIT_VIEW)
  list(
    @Req() request: Request,
    @Query(zodQuery(listAuditQuerySchema)) query: z.infer<typeof listAuditQuerySchema>,
  ) {
    // The company filter is optional here: an auditor reviewing user and role
    // changes needs the organisation-wide view too.
    const header = request.headers["x-company-id"];
    return this.auditLog.list(typeof header === "string" ? header : null, query);
  }

  @Get("actions")
  @RequirePermission(PERMISSIONS.AUDIT_VIEW)
  actions() {
    return this.auditLog.actions();
  }

  @Get(":entityType/:entityId")
  @RequirePermission(PERMISSIONS.AUDIT_VIEW)
  forEntity(@Param("entityType") entityType: string, @Param("entityId") entityId: string) {
    return this.auditLog.forEntity(entityType, entityId);
  }
}
