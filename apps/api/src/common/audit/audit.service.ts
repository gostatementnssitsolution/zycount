import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@zycount/db";
import { PrismaService } from "../prisma/prisma.service";
import type { ClientContext } from "../guards/types";

export interface AuditEvent {
  userId?: string | null;
  companyId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  client?: ClientContext | null;
}

/**
 * Append-only audit trail. Every privileged action writes one entry
 * (docs/spec/06 — Enforcement), and a posting action writes it inside the same
 * transaction as the posting so the trail can never disagree with the ledger.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(event: AuditEvent, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;

    try {
      await client.auditLog.create({
        data: {
          userId: event.userId ?? null,
          companyId: event.companyId ?? null,
          action: event.action,
          entityType: event.entityType,
          entityId: event.entityId ?? null,
          metadata: event.metadata ?? undefined,
          ipAddress: event.client?.ipAddress ?? null,
          userAgent: event.client?.userAgent ?? null,
        },
      });
    } catch (error) {
      // Outside a transaction an audit failure must not swallow the action the
      // user already completed — but it is loud, because a gap in the trail is
      // itself a finding.
      if (tx) throw error;
      this.logger.error(`Failed to write audit entry for ${event.action}`, error as Error);
    }
  }
}
