import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const CHECKOUT_TTL_MINUTES = 15;

@Injectable()
export class StorefrontService {
  constructor(private prisma: PrismaClient) {}

  async createCheckoutSession(siteId: string, unitTypeId: string, startDate: Date) {
    await this.prisma.reservationHold.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    const heldIds = (await this.prisma.reservationHold.findMany({ where: { expiresAt: { gte: new Date() } }, select: { unitId: true } })).map((h) => h.unitId);

    const unit = await this.prisma.unit.findFirst({
      where: { siteId, unitTypeId, status: 'available', deletedAt: null, ...(heldIds.length > 0 ? { id: { notIn: heldIds } } : {}) },
    });
    if (!unit) return { availabilityState: 'sold_out' as const };

    const expiresAt = new Date(Date.now() + CHECKOUT_TTL_MINUTES * 60 * 1000);
    const [hold, session] = await Promise.all([
      this.prisma.reservationHold.create({ data: { unitId: unit.id, expiresAt } }),
      this.prisma.checkoutSession.create({ data: { siteId, unitTypeId, expiresAt, metadata: { startDate: startDate.toISOString(), unitId: unit.id } } }),
    ]);

    return { checkoutSessionId: session.id, expiresAt: session.expiresAt, availabilityState: 'available' as const, lockToken: hold.lockToken };
  }

  async createQuoteRequest(siteId: string, contact: object, requirements?: object) {
    return this.prisma.quoteRequest.create({ data: { siteId, contact, requirements } });
  }
}
