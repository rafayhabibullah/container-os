import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { DomainException, ErrorCodes } from '@sitelager/domain-types';

@Injectable()
export class PricingService {
  constructor(private prisma: PrismaClient, private audit: AuditService) {}

  async createPriceBook(siteId: string, name: string, effectiveFrom: Date, actorId: string) {
    const book = await this.prisma.priceBook.create({ data: { siteId, name, effectiveFrom } });
    await this.audit.record({ action: 'price_book.created', subjectType: 'PriceBook', subjectId: book.id, siteId, actorId });
    return book;
  }

  async publishPriceBook(priceBookId: string, actorId: string) {
    const book = await this.prisma.priceBook.findUniqueOrThrow({ where: { id: priceBookId } });
    const hasRules = await this.prisma.rateRule.count({ where: { priceBookId } });
    if (!hasRules) throw new DomainException(ErrorCodes.UNIT_NOT_AVAILABLE, 'Price book has no rate rules');
    const updated = await this.prisma.priceBook.update({ where: { id: priceBookId }, data: { status: 'published' } });
    await this.audit.record({ action: 'price_book.published', subjectType: 'PriceBook', subjectId: priceBookId, siteId: book.siteId, actorId });
    return updated;
  }

  async addRateRule(priceBookId: string, unitTypeId: string, amountMinor: number, billingCycle: string) {
    return this.prisma.rateRule.create({ data: { priceBookId, unitTypeId, amountMinor, billingCycle: billingCycle as any } });
  }
}
