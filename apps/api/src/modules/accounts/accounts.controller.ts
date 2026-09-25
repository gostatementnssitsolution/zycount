import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  PERMISSIONS,
  createAccountSchema,
  listAccountsQuerySchema,
  updateAccountSchema,
  type CreateAccountInput,
  type UpdateAccountInput,
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
import { AccountsService } from "./accounts.service";

@Controller()
@RequireCompany()
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get("companies/:companyId/accounts")
  @RequirePermission(PERMISSIONS.ACCOUNT_VIEW)
  list(
    @CompanyId() companyId: string,
    @Query(zodQuery(listAccountsQuerySchema)) query: z.infer<typeof listAccountsQuerySchema>,
  ) {
    return this.accounts.list(companyId, query);
  }

  @Get("companies/:companyId/accounts/tree")
  @RequirePermission(PERMISSIONS.ACCOUNT_VIEW)
  tree(@CompanyId() companyId: string, @Query("includeInactive") includeInactive?: string) {
    return this.accounts.tree(companyId, includeInactive === "true");
  }

  @Get("companies/:companyId/accounts/:id")
  @RequirePermission(PERMISSIONS.ACCOUNT_VIEW)
  findOne(@CompanyId() companyId: string, @Param("id") id: string) {
    return this.accounts.findOne(companyId, id);
  }

  @Post("companies/:companyId/accounts")
  @RequirePermission(PERMISSIONS.ACCOUNT_CREATE)
  create(
    @CompanyId() companyId: string,
    @Body(zodBody(createAccountSchema)) body: CreateAccountInput,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientContext,
  ) {
    return this.accounts.create(companyId, body, user, client);
  }

  @Patch("companies/:companyId/accounts/:id")
  @RequirePermission(PERMISSIONS.ACCOUNT_EDIT)
  update(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @Body(zodBody(updateAccountSchema)) body: UpdateAccountInput,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientContext,
  ) {
    return this.accounts.update(companyId, id, body, user, client);
  }

  @Delete("companies/:companyId/accounts/:id")
  @RequirePermission(PERMISSIONS.ACCOUNT_DELETE)
  remove(
    @CompanyId() companyId: string,
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientContext,
  ) {
    return this.accounts.remove(companyId, id, user, client);
  }
}
