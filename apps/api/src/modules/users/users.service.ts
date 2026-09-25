import { Injectable } from "@nestjs/common";
import { hash } from "@node-rs/argon2";
import type { Prisma } from "@zycount/db";
import {
  ERROR_CODES,
  ZycountError,
  parseSort,
  type CreateUserInput,
  type Paginated,
  type RoleDto,
  type UpdateUserInput,
  type UserDto,
} from "@zycount/shared";
import { AuditService } from "../../common/audit/audit.service";
import type { AuthenticatedUser, ClientContext } from "../../common/guards/types";
import { PrismaService } from "../../common/prisma/prisma.service";
import { paginate, skipTake } from "../../common/util/pagination";

const ARGON_OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

const userInclude = {
  roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
  companies: { include: { company: { select: { id: true, name: true } } } },
} satisfies Prisma.UserInclude;

type UserWithRelations = Prisma.UserGetPayload<{ include: typeof userInclude }>;

const SORTABLE = ["name", "email", "createdAt", "lastLoginAt"] as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toDto(user: UserWithRelations): UserDto {
    const permissions = new Set<string>();
    for (const userRole of user.roles) {
      for (const rolePermission of userRole.role.permissions) {
        permissions.add(rolePermission.permission.code);
      }
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
      roles: user.roles.map((userRole) => userRole.role.name),
      permissions: [...permissions].sort(),
      companies: user.companies.map((link) => link.company),
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async list(
    organizationId: string,
    query: { page: number; pageSize: number; q?: string; role?: string; isActive?: boolean; sort?: string },
  ): Promise<Paginated<UserDto>> {
    const where: Prisma.UserWhereInput = { organizationId };

    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
      ];
    }
    if (query.role) where.roles = { some: { role: { name: query.role } } };
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const sort = parseSort(query.sort, SORTABLE, { field: "name", direction: "asc" });
    const { skip, take } = skipTake(query.page, query.pageSize);

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: userInclude,
        orderBy: { [sort.field]: sort.direction },
        skip,
        take,
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(users.map((user) => this.toDto(user)), total, query.page, query.pageSize);
  }

  async findOne(organizationId: string, id: string): Promise<UserDto> {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      include: userInclude,
    });
    if (!user) {
      throw new ZycountError(ERROR_CODES.NOT_FOUND, "That user does not exist in this organisation.");
    }
    return this.toDto(user);
  }

  async create(
    input: CreateUserInput,
    actor: AuthenticatedUser,
    client: ClientContext,
  ): Promise<UserDto> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ZycountError(
        ERROR_CODES.VALIDATION_DUPLICATE,
        "Someone is already using that email address.",
        { fields: { email: "That email address is already registered." } },
      );
    }

    await this.assertCompaniesInScope(actor, input.companyIds);
    const roleIds = await this.resolveRoleIds(input.roles);

    const user = await this.prisma.user.create({
      data: {
        organizationId: actor.organizationId,
        email: input.email,
        name: input.name,
        passwordHash: await hash(input.password, ARGON_OPTIONS),
        isActive: input.isActive,
        roles: { create: roleIds.map((roleId) => ({ roleId })) },
        companies: { create: input.companyIds.map((companyId) => ({ companyId })) },
      },
      include: userInclude,
    });

    await this.audit.record({
      userId: actor.id,
      action: "user.create",
      entityType: "User",
      entityId: user.id,
      metadata: { email: user.email, roles: input.roles, companies: input.companyIds.length },
      client,
    });

    return this.toDto(user);
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateUserInput,
    actor: AuthenticatedUser,
    client: ClientContext,
  ): Promise<UserDto> {
    const existing = await this.prisma.user.findFirst({
      where: { id, organizationId },
      include: { roles: { include: { role: true } } },
    });

    if (!existing) {
      throw new ZycountError(ERROR_CODES.NOT_FOUND, "That user does not exist in this organisation.");
    }

    // Nobody may lock themselves out of their own administrative access.
    if (id === actor.id && input.isActive === false) {
      throw new ZycountError(
        ERROR_CODES.CONFLICT,
        "You cannot deactivate your own account.",
        { fields: { isActive: "Ask another administrator to do this." } },
      );
    }

    if (id === actor.id && input.roles && !input.roles.some((role) => role === "SuperAdmin" || role === "Admin")) {
      const wasAdmin = existing.roles.some(
        (userRole) => userRole.role.name === "SuperAdmin" || userRole.role.name === "Admin",
      );
      if (wasAdmin) {
        throw new ZycountError(
          ERROR_CODES.CONFLICT,
          "You cannot remove your own administrator role.",
          { fields: { roles: "Ask another administrator to do this." } },
        );
      }
    }

    if (input.companyIds) await this.assertCompaniesInScope(actor, input.companyIds);

    const user = await this.prisma.$transaction(async (tx) => {
      if (input.roles) {
        const roleIds = await this.resolveRoleIds(input.roles);
        await tx.userRole.deleteMany({ where: { userId: id } });
        await tx.userRole.createMany({ data: roleIds.map((roleId) => ({ userId: id, roleId })) });
      }

      if (input.companyIds) {
        await tx.userCompany.deleteMany({ where: { userId: id } });
        await tx.userCompany.createMany({
          data: input.companyIds.map((companyId) => ({ userId: id, companyId })),
        });
      }

      return tx.user.update({
        where: { id },
        data: {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
          ...(input.password ? { passwordHash: await hash(input.password, ARGON_OPTIONS) } : {}),
        },
        include: userInclude,
      });
    });

    // A password reset or a deactivation must end the user's live sessions,
    // or the change would not take effect until their token expired.
    if (input.password || input.isActive === false) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.audit.record({
      userId: actor.id,
      action: "user.edit",
      entityType: "User",
      entityId: id,
      metadata: {
        email: existing.email,
        fields: Object.keys(input).filter((key) => key !== "password"),
        passwordReset: Boolean(input.password),
      },
      client,
    });

    return this.toDto(user);
  }

  /** Users are deactivated rather than deleted — the audit trail references them. */
  async deactivate(
    organizationId: string,
    id: string,
    actor: AuthenticatedUser,
    client: ClientContext,
  ): Promise<UserDto> {
    if (id === actor.id) {
      throw new ZycountError(ERROR_CODES.CONFLICT, "You cannot deactivate your own account.");
    }

    return this.update(organizationId, id, { isActive: false }, actor, client);
  }

  async listRoles(): Promise<RoleDto[]> {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: "asc" },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissions.map((link) => link.permission.code).sort(),
      userCount: role._count.users,
    }));
  }

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] });
  }

  private async resolveRoleIds(names: string[]): Promise<string[]> {
    const roles = await this.prisma.role.findMany({ where: { name: { in: names } } });

    if (roles.length !== names.length) {
      const found = new Set(roles.map((role) => role.name));
      const missing = names.filter((name) => !found.has(name));
      throw new ZycountError(
        ERROR_CODES.VALIDATION_FAILED,
        `Unknown role${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`,
        { fields: { roles: "Choose roles from the list." } },
      );
    }

    return roles.map((role) => role.id);
  }

  /** An administrator can only grant access to companies they can reach. */
  private async assertCompaniesInScope(actor: AuthenticatedUser, companyIds: string[]): Promise<void> {
    const outOfScope = companyIds.filter((companyId) => !actor.companies.includes(companyId));

    if (outOfScope.length > 0) {
      throw new ZycountError(
        ERROR_CODES.COMPANY_ACCESS_DENIED,
        "You can only grant access to companies you have access to yourself.",
        { fields: { companyIds: "One or more of those companies is out of your reach." } },
      );
    }
  }
}
