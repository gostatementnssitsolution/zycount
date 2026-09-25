import { Body, Controller, Get, Patch, Post } from "@nestjs/common";
import {
  PERMISSIONS,
  createCompanySchema,
  updateCompanySchema,
  type CreateCompanyInput,
  type UpdateCompanyInput,
} from "@zycount/shared";
import {
  ClientInfo,
  CompanyId,
  CurrentUser,
  RequireCompany,
  RequirePermission,
} from "../../common/decorators";
import type { AuthenticatedUser, ClientContext } from "../../common/guards/types";
import { zodBody } from "../../common/pipes/zod-validation.pipe";
import { CompaniesService } from "./companies.service";

@Controller("companies")
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  /** Not company-scoped: this is how the switcher discovers what to switch to. */
  @Get()
  @RequirePermission(PERMISSIONS.COMPANY_VIEW)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.companies.listForUser(user);
  }

  @Post()
  @RequirePermission(PERMISSIONS.COMPANY_CREATE)
  create(
    @Body(zodBody(createCompanySchema)) body: CreateCompanyInput,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientContext,
  ) {
    return this.companies.create(body, user, client);
  }

  @Get(":companyId")
  @RequireCompany()
  @RequirePermission(PERMISSIONS.COMPANY_VIEW)
  findOne(@CompanyId() companyId: string) {
    return this.companies.findOne(companyId);
  }

  @Get(":companyId/stats")
  @RequireCompany()
  @RequirePermission(PERMISSIONS.COMPANY_VIEW)
  stats(@CompanyId() companyId: string) {
    return this.companies.stats(companyId);
  }

  @Get(":companyId/branches")
  @RequireCompany()
  @RequirePermission(PERMISSIONS.COMPANY_VIEW)
  branches(@CompanyId() companyId: string) {
    return this.companies.listBranches(companyId);
  }

  @Patch(":companyId")
  @RequireCompany()
  @RequirePermission(PERMISSIONS.COMPANY_EDIT)
  update(
    @CompanyId() companyId: string,
    @Body(zodBody(updateCompanySchema)) body: UpdateCompanyInput,
    @CurrentUser() user: AuthenticatedUser,
    @ClientInfo() client: ClientContext,
  ) {
    return this.companies.update(companyId, body, user, client);
  }
}
