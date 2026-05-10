import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainException, ErrorCodes } from '@container-os/domain-types';

interface QuoteInput { siteId: string; unitTypeId: string; startDate: Date; customerType: string; promoCode?: string; }

@Injectable()
export class QuoteService {
  constructor(private prisma: PrismaClient) {}

  async calculateQuote(input: QuoteInput) {
    const rule = await this.prisma.rateRule.findFirst({
      where: { unitTypeId: input.unitTypeId, priceBook: { siteId: input.siteId, status: 'published' } },
      include: { priceBook: true },
    });
    if (!rule) throw new DomainException(ErrorCodes.UNIT_NOT_AVAILABLE, `No published rate rule for ${input.unitTypeId} at ${input.siteId}`);

    const promo = input.promoCode
      ? await this.prisma.promotion.findFirst({ where: { siteId: input.siteId, code: input.promoCode, validFrom: { lte: input.startDate } } })
      : null;
    const fee = await this.prisma.feeSchedule.findFirst({ where: { siteId: input.siteId } });
    const tax = await this.prisma.taxProfile.findFirst({ where: { siteId: input.siteId } });

    const rentMinor = rule.amountMinor;
    const discountMinor = promo ? (promo.discountType === 'percentage' ? Math.round(rentMinor * (promo.value / 100)) : promo.value) : 0;
    const netRent = rentMinor - discountMinor;
    const vatRate = tax?.vatRate ?? 0.19;
    const vatMinor = input.customerType === 'business' ? 0 : Math.round(netRent * vatRate);
    const depositMinor = fee?.depositMinor ?? 0;

    return { rentMinor, discountMinor, depositMinor, vatMinor, vatRate, totalDueTodayMinor: netRent + vatMinor + depositMinor, currency: 'EUR', pricingSnapshot: { ruleId: rule.id, promoId: promo?.id ?? null, vatRate } };
  }
}
