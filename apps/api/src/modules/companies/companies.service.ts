import { Injectable } from "@nestjs/common";
import type { Company } from "@zycount/db";
import {
  ERROR_CODES,
  ZycountError,
  type CompanyDto,
  type CreateCompanyInput,
  type UpdateCompanyInput,
} from "@zycount/shared";
import { AuditService } from "../../common/audit/audit.service";
import type { AuthenticatedUser, ClientContext } from "../../common/guards/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { MY_CHART_OF_ACCOUNTS } from "@zycount/db";

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toDto(company: Company): CompanyDto {
    return {
      id: company.id,
      organizationId: company.organizationId,
      name: company.name,
      registrationNo: company.registrationNo,
      taxNo: company.taxNo,
      baseCurrency: company.baseCurrency,
      address: company.address,
      phone: company.phone,
      email: company.email,
      fiscalYearStartMonth: company.fiscalYearStartMonth,
      timezone: company.timezone,
      isDemo: company.isDemo,
      isActive: company.isActive,
      createdAt: company.createdAt.toISOString(),
    };
  }

  /** Only the companies this user has been granted access to. */
  async listForUser(user: AuthenticatedUser): Promise<CompanyDto[]> {
    const companies = await this.prisma.company.findMany({
      where: { id: { in: user.companies }, isActive: true },
      orderBy: { name: "asc" },
    });
    return companies.map((company) => this.toDto(company));
  }

  async findOne(companyId: string): Promise<CompanyDto> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new ZycountError(ERROR_CODES.NOT_FOUND, "That company does not exist.");
    }
    return this.toDto(company);
  }

  /**
   * Create a company, grant its creator access, and lay down the standard
   * chart of accounts so the books are usable immediately (docs/spec/13 §51).
   */
  async create(
    input: CreateCompanyInput,
    user: AuthenticatedUser,
    client: ClientContext,
  ): Promise<CompanyDto> {
    const company = await this.prisma.$transaction(async (tx) => {
      const created = await tx.company.create({
        data: {
          organizationId: user.organizationId,
          name: input.name,
          registrationNo: input.registrationNo || null,
          taxNo: input.taxNo || null,
          baseCurrency: input.baseCurrency,
          address: input.address || null,
          phone: input.phone || null,
          email: input.email || null,
          fiscalYearStartMonth: input.fiscalYearStartMonth,
          timezone: input.timezone,
        },
      });

      await tx.userCompany.create({
        data: { userId: user.id, companyId: created.id, isDefault: false },
      });

      const idByCode = new Map<string, string>();
      for (const template of MY_CHART_OF_ACCOUNTS) {
        const account = await tx.account.create({
          data: {
            companyId: created.id,
            code: template.code,
            name: template.name,
            type: template.type,
            subType: template.subType ?? null,
            parentId: template.parent ? (idByCode.get(template.parent) ?? null) : null,
            description: template.description ?? null,
            isPostable: template.postable ?? true,
            isSystem: template.system ?? false,
          },
        });
        idByCode.set(template.code, account.id);
      }

      return created;
    });

    await this.audit.record({
      userId: user.id,
      companyId: company.id,
      action: "company.create",
      entityType: "Company",
      entityId: company.id,
      metadata: { name: company.name, baseCurrency: company.baseCurrency },
      client,
    });

    return this.toDto(company);
  }

  async update(
    companyId: string,
    input: UpdateCompanyInput,
    user: AuthenticatedUser,
    client: ClientContext,
  ): Promise<CompanyDto> {
    const existing = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!existing) {
      throw new ZycountError(ERROR_CODES.NOT_FOUND, "That company does not exist.");
    }

    // Changing the base currency after the books have started would restate
    // every posted figure, so it is fixed once the ledger is in use.
    if (input.baseCurrency && input.baseCurrency !== existing.baseCurrency) {
      const postedCount = await this.prisma.journalEntry.count({
        where: { companyId, status: { in: ["POSTED", "REVERSED"] } },
      });
      if (postedCount > 0) {
        throw new ZycountError(
          ERROR_CODES.CONFLICT,
          "The base currency cannot change once entries have been posted.",
          { fields: { baseCurrency: "Locked because the ledger is in use." } },
        );
      }
    }

    const company = await this.prisma.company.update({
      where: { id: companyId },
      data: {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.registrationNo === undefined ? {} : { registrationNo: input.registrationNo || null }),
        ...(input.taxNo === undefined ? {} : { taxNo: input.taxNo || null }),
        ...(input.baseCurrency === undefined ? {} : { baseCurrency: input.baseCurrency }),
        ...(input.address === undefined ? {} : { address: input.address || null }),
        ...(input.phone === undefined ? {} : { phone: input.phone || null }),
        ...(input.email === undefined ? {} : { email: input.email || null }),
        ...(input.fiscalYearStartMonth === undefined ? {} : { fiscalYearStartMonth: input.fiscalYearStartMonth }),
        ...(input.timezone === undefined ? {} : { timezone: input.timezone }),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      },
    });

    await this.audit.record({
      userId: user.id,
      companyId,
      action: "company.edit",
      entityType: "Company",
      entityId: companyId,
      metadata: { fields: Object.keys(input) },
      client,
    });

    return this.toDto(company);
  }

  /** Headline counts for the company settings page. */
  async stats(companyId: string) {
    const [accounts, periods, posted, drafts, users] = await Promise.all([
      this.prisma.account.count({ where: { companyId, isActive: true } }),
      this.prisma.fiscalPeriod.count({ where: { companyId } }),
      this.prisma.journalEntry.count({ where: { companyId, status: { in: ["POSTED", "REVERSED"] } } }),
      this.prisma.journalEntry.count({ where: { companyId, status: "DRAFT" } }),
      this.prisma.userCompany.count({ where: { companyId } }),
    ]);

    return { accounts, periods, postedJournals: posted, draftJournals: drafts, users };
  }

  async listBranches(companyId: string) {
    return this.prisma.branch.findMany({ where: { companyId }, orderBy: { code: "asc" } });
  }
}
