import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class TenantPortalService {
  constructor(private prisma: PrismaClient) {}

  async listMyAgreements(tenantId: string) {
    return this.prisma.agreement.findMany({
      where: { tenantId, status: { in: ['active', 'signed', 'pending_signature'] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyAgreement(tenantId: string, agreementId: string) {
    return this.prisma.agreement.findFirstOrThrow({
      where: { id: agreementId, tenantId },
      include: { signatories: true, amendments: true },
    });
  }

  async listMyInvoices(tenantId: string) {
    const agreements = await this.prisma.agreement.findMany({
      where: { tenantId },
      select: { id: true },
    });
    const agreementIds = agreements.map((a) => a.id);
    return this.prisma.invoice.findMany({
      where: { agreementId: { in: agreementIds } },
      orderBy: { dueDate: 'desc' },
    });
  }

  async listMyMandates(tenantId: string) {
    return this.prisma.mandate.findMany({
      where: { customerId: tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        scheme: true,
        status: true,
        ibanLast4: true,
        signedAt: true,
      },
    });
  }

  async createMoveOutRequest(tenantId: string, agreementId: string, requestedDate: string) {
    await this.prisma.agreement.findFirstOrThrow({
      where: { id: agreementId, tenantId },
      select: { id: true },
    });
    return this.prisma.terminationRequest.create({
      data: {
        agreementId,
        requestedDate: new Date(requestedDate),
        status: 'pending',
      },
    });
  }
}
