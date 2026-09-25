import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  PERMISSIONS,
  createJournalSchema,
  listJournalsQuerySchema,
  postJournalSchema,
  reverseJournalSchema,
  updateJournalSchema,
  type CreateJournalInput,
  type ListJournalsQuery,
  type ReverseJournalInput,
  type UpdateJournalInput,
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
import { zodBody, zodQuery } from "../../common/pipes/zod-validation.pipe";
import { JournalsService } from "./journals.service";

@Controller()
@RequireCompany()
export class JournalsController {
  constructor(private readonly journals: JournalsService) {}

  @Get("companies/:companyId/journals")
  @RequirePermission(PERMISSIONS.JOURNAL_VIEW)
  list(
    @CompanyId() companyId: string,
    @Query(zodQuery(listJournalsQuerySchema)) query: ListJournalsQuery,
  ) {
    return this.journals.list(companyId, query);
  }

  @Get("companies/:companyId/journals/:id")
  @RequirePermission(PERMISSIONS.JOURNAL_VIEW)
  findOne(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.journals.findOne(companyId, id);
  }

  @Get("companies/:companyId/journals/:id/reversal-preview")
  @RequirePermission(PERMISSIONS.JOURNAL_VIEW)
  previewReversal(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.journals.previewReversal(companyId, id);
  }

  @Post("companies/:companyId/journals")
  @RequirePermission(PERMISSIONS.JOURNAL_CREATE)
  create(
    @CompanyId() companyId: string,
    @Body(zodBody(createJournalSchema)) body: CreateJournalInput,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientContext,
    @Query("post") post?: string,
  ) {
    return this.journals.create(companyId, body, user, client, post === "true");
  }

  @Post("companies/:companyId/journals/:id/duplicate")
  @RequirePermission(PERMISSIONS.JOURNAL_CREATE)
  duplicate(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientContext,
  ) {
    return this.journals.duplicate(companyId, id, user, client);
  }

  @Patch("companies/:companyId/journals/:id")
  @RequirePermission(PERMISSIONS.JOURNAL_EDIT)
  update(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body(zodBody(updateJournalSchema)) body: UpdateJournalInput,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientContext,
  ) {
    return this.journals.update(companyId, id, body, user, client);
  }

  @Delete("companies/:companyId/journals/:id")
  @RequirePermission(PERMISSIONS.JOURNAL_DELETE)
  @HttpCode(204)
  remove(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientContext,
  ) {
    return this.journals.remove(companyId, id, user, client);
  }

  @Post("companies/:companyId/journals/:id/post")
  @RequirePermission(PERMISSIONS.JOURNAL_POST)
  @HttpCode(200)
  post(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body(zodBody(postJournalSchema)) body: z.infer<typeof postJournalSchema>,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientContext,
  ) {
    return this.journals.post(companyId, id, body.version, user, client);
  }

  @Post("companies/:companyId/journals/:id/reverse")
  @RequirePermission(PERMISSIONS.JOURNAL_REVERSE)
  @HttpCode(200)
  reverse(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body(zodBody(reverseJournalSchema)) body: ReverseJournalInput,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientContext,
  ) {
    return this.journals.reverse(companyId, id, body, user, client);
  }
}
