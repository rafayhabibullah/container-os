import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

interface RecordAuditEventInput {
  actorId?: string;
  actorType?: string;
  action: string;
  subjectType: string;
  subjectId: string;
  changes?: Prisma.InputJsonValue;
  siteId?: string;
  requestId?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaClient) {}

  async record(input: RecordAuditEventInput): Promise<void> {
    await this.prisma.auditEvent.create({ data: input });
  }

  async hasLegalHold(subjectType: string, subjectId: string): Promise<boolean> {
    const hold = await this.prisma.legalHold.findFirst({
      where: { subjectRef: `${subjectType}:${subjectId}`, active: true },
    });
    return !!hold;
  }

  async getAuditTrail(
    subjectType: string,
    subjectId: string,
    siteId?: string,
  ) {
    return this.prisma.auditEvent.findMany({
      where: {
        subjectType,
        subjectId,
        ...(siteId ? { siteId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}
