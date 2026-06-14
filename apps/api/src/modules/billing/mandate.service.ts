import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class MandateService {
  constructor(private prisma: PrismaClient) {}

  async createMandate(customerId: string, scheme: string, ibanLast4?: string, consentSource?: string, stripeSetupId?: string) {
    return this.prisma.mandate.create({
      data: { customerId, scheme: scheme as any, reference: `MAN-${Date.now()}`, ibanLast4, consentSource, stripeSetupId, status: 'pending' },
    });
  }

  async activateMandate(mandateId: string) {
    return this.prisma.mandate.update({ where: { id: mandateId }, data: { status: 'active', signedAt: new Date() } });
  }

  async listMandates(customerId: string) {
    return this.prisma.mandate.findMany({ where: { customerId, deletedAt: null }, orderBy: { createdAt: 'desc' } });
  }
}
