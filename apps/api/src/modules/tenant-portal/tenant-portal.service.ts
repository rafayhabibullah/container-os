import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class TenantPortalService {
  constructor(private prisma: PrismaClient) {}

  // Agreement.tenantId is Customer.id, but the JWT sub is User.id.
  // One email can have multiple Contact records (e.g. separate checkout flows), so resolve all.
  private async resolveCustomerIds(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
    const contacts = await this.prisma.contact.findMany({
      where: { email: user.email },
      select: { customerId: true },
    });
    return [...new Set(contacts.map((c) => c.customerId))];
  }

  async listMyAgreements(userId: string) {
    const customerIds = await this.resolveCustomerIds(userId);
    return this.prisma.agreement.findMany({
      where: { tenantId: { in: customerIds }, status: { in: ['active', 'signed', 'pending_signature'] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyAgreement(userId: string, agreementId: string) {
    const customerIds = await this.resolveCustomerIds(userId);
    return this.prisma.agreement.findFirstOrThrow({
      where: { id: agreementId, tenantId: { in: customerIds } },
      include: { signatories: true, amendments: true },
    });
  }

  async listMyInvoices(userId: string) {
    const customerIds = await this.resolveCustomerIds(userId);
    const agreements = await this.prisma.agreement.findMany({
      where: { tenantId: { in: customerIds } },
      select: { id: true },
    });
    const agreementIds = agreements.map((a) => a.id);
    return this.prisma.invoice.findMany({
      where: { agreementId: { in: agreementIds } },
      orderBy: { dueDate: 'desc' },
    });
  }

  async listMyMandates(userId: string) {
    const customerIds = await this.resolveCustomerIds(userId);
    return this.prisma.mandate.findMany({
      where: { customerId: { in: customerIds } },
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

  async createMoveOutRequest(userId: string, agreementId: string, requestedDate: string) {
    const customerIds = await this.resolveCustomerIds(userId);
    await this.prisma.agreement.findFirstOrThrow({
      where: { id: agreementId, tenantId: { in: customerIds } },
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
