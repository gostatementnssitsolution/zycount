import { Injectable } from "@nestjs/common";
import type { Prisma } from "@zycount/db";
import { parseSort, type AuditLogDto, type Paginated } from "@zycount/shared";
import { PrismaService } from "../../common/prisma/prisma.service";
import { paginate, skipTake } from "../../common/util/pagination";

const SORTABLE = ["createdAt", "action", "entityType"] as const;

/**
 * Read side of the audit trail. The log is append-only — there is deliberately
 * no update or delete path (docs/spec/06 — Enforcement).
 */
@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    companyId: string | null,
    query: {
      page: number;
      pageSize: number;
      action?: string;
      entityType?: string;
      entityId?: string;
      userId?: string;
      dateFrom?: string;
      dateTo?: string;
      q?: string;
      sort?: string;
    },
  ): Promise<Paginated<AuditLogDto>> {
    const where: Prisma.AuditLogWhereInput = {};

    // Organisation-level actions (user and role changes) carry no company, so
    // they are included alongside the selected company's own trail.
    if (companyId) where.OR = [{ companyId }, { companyId: null }];
    if (query.action) where.action = { startsWith: query.action };
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.userId) where.userId = query.userId;

    if (query.dateFrom || query.dateTo) {
      where.createdAt = {
        ...(query.dateFrom ? { gte: new Date(`${query.dateFrom}T00:00:00.000Z`) } : {}),
        ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59.999Z`) } : {}),
      };
    }

    if (query.q) {
      where.AND = [
        {
          OR: [
            { action: { contains: query.q, mode: "insensitive" } },
            { entityType: { contains: query.q, mode: "insensitive" } },
            { user: { name: { contains: query.q, mode: "insensitive" } } },
            { user: { email: { contains: query.q, mode: "insensitive" } } },
          ],
        },
      ];
    }

    const sort = parseSort(query.sort, SORTABLE, { field: "createdAt", direction: "desc" });
    const { skip, take } = skipTake(query.page, query.pageSize);

    const [entries, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { [sort.field]: sort.direction },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const data: AuditLogDto[] = entries.map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      userName: entry.user?.name ?? null,
      userEmail: entry.user?.email ?? null,
      companyId: entry.companyId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: (entry.metadata as Record<string, unknown> | null) ?? null,
      ipAddress: entry.ipAddress,
      createdAt: entry.createdAt.toISOString(),
    }));

    return paginate(data, total, query.page, query.pageSize);
  }

  /** Full history for one record — the Audit tab on a detail page. */
  async forEntity(entityType: string, entityId: string): Promise<AuditLogDto[]> {
    const entries = await this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return entries.map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      userName: entry.user?.name ?? null,
      userEmail: entry.user?.email ?? null,
      companyId: entry.companyId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: (entry.metadata as Record<string, unknown> | null) ?? null,
      ipAddress: entry.ipAddress,
      createdAt: entry.createdAt.toISOString(),
    }));
  }

  /** Distinct action codes, for the filter dropdown. */
  async actions(): Promise<string[]> {
    const rows = await this.prisma.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    });
    return rows.map((row) => row.action);
  }
}
