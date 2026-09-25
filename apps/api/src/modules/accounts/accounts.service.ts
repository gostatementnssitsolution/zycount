import { Injectable } from "@nestjs/common";
import type { Account, Prisma } from "@zycount/db";
import {
  ERROR_CODES,
  ZycountError,
  type AccountDto,
  type AccountTreeNode,
  type CreateAccountInput,
  type UpdateAccountInput,
} from "@zycount/shared";
import { AuditService } from "../../common/audit/audit.service";
import type { AuthenticatedUser, ClientContext } from "../../common/guards/types";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toDto(account: Account): AccountDto {
    return {
      id: account.id,
      companyId: account.companyId,
      code: account.code,
      name: account.name,
      type: account.type,
      subType: account.subType,
      parentId: account.parentId,
      description: account.description,
      isPostable: account.isPostable,
      isActive: account.isActive,
      isSystem: account.isSystem,
    };
  }

  async list(
    companyId: string,
    query: { type?: string; q?: string; postableOnly?: boolean; includeInactive?: boolean },
  ): Promise<AccountDto[]> {
    const where: Prisma.AccountWhereInput = { companyId };

    if (query.type) where.type = query.type as Account["type"];
    if (query.postableOnly) where.isPostable = true;
    if (!query.includeInactive) where.isActive = true;
    if (query.q) {
      where.OR = [
        { code: { contains: query.q, mode: "insensitive" } },
        { name: { contains: query.q, mode: "insensitive" } },
      ];
    }

    const accounts = await this.prisma.account.findMany({ where, orderBy: { code: "asc" } });
    return accounts.map((account) => this.toDto(account));
  }

  /**
   * The chart as a tree. Ordering is by code within each level, so the result
   * reads exactly like a printed chart of accounts.
   */
  async tree(companyId: string, includeInactive = false): Promise<AccountTreeNode[]> {
    const accounts = await this.prisma.account.findMany({
      where: { companyId, ...(includeInactive ? {} : { isActive: true }) },
      orderBy: { code: "asc" },
    });

    const nodes = new Map<string, AccountTreeNode>();
    for (const account of accounts) {
      nodes.set(account.id, { ...this.toDto(account), depth: 0, children: [] });
    }

    const roots: AccountTreeNode[] = [];
    for (const node of nodes.values()) {
      const parent = node.parentId ? nodes.get(node.parentId) : undefined;
      if (parent) parent.children.push(node);
      else roots.push(node);
    }

    const assignDepth = (list: AccountTreeNode[], depth: number): void => {
      for (const node of list) {
        node.depth = depth;
        assignDepth(node.children, depth + 1);
      }
    };
    assignDepth(roots, 0);

    return roots;
  }

  async findOne(companyId: string, id: string): Promise<AccountDto> {
    const account = await this.prisma.account.findFirst({ where: { id, companyId } });
    if (!account) {
      throw new ZycountError(ERROR_CODES.NOT_FOUND, "That account does not exist in this company.");
    }
    return this.toDto(account);
  }

  async create(
    companyId: string,
    input: CreateAccountInput,
    user: AuthenticatedUser,
    client: ClientContext,
  ): Promise<AccountDto> {
    if (input.parentId) await this.assertValidParent(companyId, input.parentId, input.type);

    const account = await this.prisma.$transaction(async (tx) => {
      const created = await tx.account.create({
        data: {
          companyId,
          code: input.code,
          name: input.name,
          type: input.type,
          subType: input.subType ?? null,
          parentId: input.parentId ?? null,
          description: input.description || null,
          isPostable: input.isPostable,
          isActive: input.isActive,
        },
      });

      // A parent must stop accepting postings the moment it gains a child —
      // otherwise the same amount could land on both a leaf and its parent.
      if (input.parentId) {
        await tx.account.update({ where: { id: input.parentId }, data: { isPostable: false } });
      }

      return created;
    });

    await this.audit.record({
      userId: user.id,
      companyId,
      action: "account.create",
      entityType: "Account",
      entityId: account.id,
      metadata: { code: account.code, name: account.name, type: account.type },
      client,
    });

    return this.toDto(account);
  }

  async update(
    companyId: string,
    id: string,
    input: UpdateAccountInput,
    user: AuthenticatedUser,
    client: ClientContext,
  ): Promise<AccountDto> {
    const existing = await this.prisma.account.findFirst({ where: { id, companyId } });
    if (!existing) {
      throw new ZycountError(ERROR_CODES.NOT_FOUND, "That account does not exist in this company.");
    }

    const nextType = input.type ?? existing.type;

    if (input.parentId !== undefined && input.parentId !== null) {
      if (input.parentId === id) {
        throw new ZycountError(ERROR_CODES.ACCOUNT_CYCLE, "An account cannot be its own parent.");
      }
      await this.assertValidParent(companyId, input.parentId, nextType);
      await this.assertNoCycle(companyId, id, input.parentId);
    }

    // Changing the type of an account that already carries postings would
    // silently restate past reports — the type is fixed once it is in use.
    if (input.type && input.type !== existing.type) {
      const postedLines = await this.prisma.journalLine.count({
        where: { accountId: id, journalEntry: { status: { in: ["POSTED", "REVERSED"] } } },
      });
      if (postedLines > 0) {
        throw new ZycountError(
          ERROR_CODES.ACCOUNT_IN_USE,
          "This account already carries postings, so its type cannot be changed. Create a new account instead.",
          { fields: { type: "Locked because the account is in use." } },
        );
      }
    }

    if (input.isPostable === true) {
      const childCount = await this.prisma.account.count({ where: { parentId: id } });
      if (childCount > 0) {
        throw new ZycountError(
          ERROR_CODES.ACCOUNT_HAS_CHILDREN,
          "A heading with accounts underneath it cannot take postings directly.",
          { fields: { isPostable: "Only accounts without children can be postable." } },
        );
      }
    }

    const account = await this.prisma.account.update({
      where: { id },
      data: {
        ...(input.code === undefined ? {} : { code: input.code }),
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.type === undefined ? {} : { type: input.type }),
        ...(input.subType === undefined ? {} : { subType: input.subType ?? null }),
        ...(input.parentId === undefined ? {} : { parentId: input.parentId ?? null }),
        ...(input.description === undefined ? {} : { description: input.description || null }),
        ...(input.isPostable === undefined ? {} : { isPostable: input.isPostable }),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
      },
    });

    await this.audit.record({
      userId: user.id,
      companyId,
      action: "account.edit",
      entityType: "Account",
      entityId: id,
      metadata: {
        before: { code: existing.code, name: existing.name, isActive: existing.isActive },
        after: { code: account.code, name: account.name, isActive: account.isActive },
      },
      client,
    });

    return this.toDto(account);
  }

  /**
   * Master data is archived, never deleted, once it is referenced
   * (docs/spec/02 — Design rules). An unused account can be removed outright.
   */
  async remove(
    companyId: string,
    id: string,
    user: AuthenticatedUser,
    client: ClientContext,
  ): Promise<{ deleted: boolean; archived: boolean }> {
    const account = await this.prisma.account.findFirst({ where: { id, companyId } });
    if (!account) {
      throw new ZycountError(ERROR_CODES.NOT_FOUND, "That account does not exist in this company.");
    }

    if (account.isSystem) {
      throw new ZycountError(
        ERROR_CODES.ACCOUNT_IN_USE,
        "This is a system account used by the posting rules. You can rename it, but it cannot be removed.",
      );
    }

    const childCount = await this.prisma.account.count({ where: { parentId: id } });
    if (childCount > 0) {
      throw new ZycountError(
        ERROR_CODES.ACCOUNT_HAS_CHILDREN,
        `Move or remove the ${childCount} account${childCount === 1 ? "" : "s"} underneath this heading first.`,
      );
    }

    const lineCount = await this.prisma.journalLine.count({ where: { accountId: id } });

    if (lineCount > 0) {
      await this.prisma.account.update({ where: { id }, data: { isActive: false } });
      await this.audit.record({
        userId: user.id,
        companyId,
        action: "account.archive",
        entityType: "Account",
        entityId: id,
        metadata: { code: account.code, reason: "referenced_by_journal_lines", lineCount },
        client,
      });
      return { deleted: false, archived: true };
    }

    await this.prisma.account.delete({ where: { id } });
    await this.audit.record({
      userId: user.id,
      companyId,
      action: "account.delete",
      entityType: "Account",
      entityId: id,
      metadata: { code: account.code, name: account.name },
      client,
    });

    return { deleted: true, archived: false };
  }

  private async assertValidParent(companyId: string, parentId: string, type: string): Promise<void> {
    const parent = await this.prisma.account.findFirst({ where: { id: parentId, companyId } });

    if (!parent) {
      throw new ZycountError(ERROR_CODES.NOT_FOUND, "That parent account does not exist in this company.", {
        fields: { parentId: "Choose a parent from this company's chart." },
      });
    }

    // A child of a different type would break every statement that rolls the
    // tree up by type.
    if (parent.type !== type) {
      throw new ZycountError(
        ERROR_CODES.ACCOUNT_TYPE_MISMATCH,
        `A ${type.toLowerCase().replace("_", " ")} account cannot sit under "${parent.code} ${parent.name}".`,
        { fields: { parentId: "The parent must have the same account type." } },
      );
    }
  }

  private async assertNoCycle(companyId: string, id: string, parentId: string): Promise<void> {
    let cursor: string | null = parentId;
    const seen = new Set<string>([id]);

    while (cursor) {
      if (seen.has(cursor)) {
        throw new ZycountError(
          ERROR_CODES.ACCOUNT_CYCLE,
          "That would put the account inside itself.",
          { fields: { parentId: "Choose a different parent." } },
        );
      }
      seen.add(cursor);

      const parent: { parentId: string | null } | null = await this.prisma.account.findFirst({
        where: { id: cursor, companyId },
        select: { parentId: true },
      });
      cursor = parent?.parentId ?? null;
    }
  }
}
