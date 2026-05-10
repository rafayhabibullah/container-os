import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuoteService } from './quote.service';

const mockPrisma = {
  rateRule: { findFirst: vi.fn() },
  promotion: { findFirst: vi.fn() },
  feeSchedule: { findFirst: vi.fn() },
  taxProfile: { findFirst: vi.fn() },
};
const service = new QuoteService(mockPrisma as any);

describe('QuoteService', () => {
  beforeEach(() => {
    mockPrisma.rateRule.findFirst.mockResolvedValue({ id: 'rr1', amountMinor: 14900, billingCycle: 'monthly', priceBook: { siteId: 's1', status: 'published' } });
    mockPrisma.promotion.findFirst.mockResolvedValue(null);
    mockPrisma.feeSchedule.findFirst.mockResolvedValue({ depositMinor: 14900, adminFeeMinor: 0 });
    mockPrisma.taxProfile.findFirst.mockResolvedValue({ vatRate: 0.19, taxCode: 'DE_STD' });
  });

  it('calculates base rent with VAT and deposit for private customer', async () => {
    const quote = await service.calculateQuote({ siteId: 's1', unitTypeId: 'ut1', startDate: new Date(), customerType: 'private' });
    expect(quote.rentMinor).toBe(14900);
    expect(quote.vatMinor).toBe(Math.round(14900 * 0.19));
    expect(quote.depositMinor).toBe(14900);
    expect(quote.totalDueTodayMinor).toBe(14900 + Math.round(14900 * 0.19) + 14900);
  });

  it('applies percentage discount when promoCode provided', async () => {
    mockPrisma.promotion.findFirst.mockResolvedValue({ id: 'p1', discountType: 'percentage', value: 15, stackingPolicy: 'none' });
    const quote = await service.calculateQuote({ siteId: 's1', unitTypeId: 'ut1', startDate: new Date(), customerType: 'private', promoCode: 'SPRING15' });
    expect(quote.discountMinor).toBe(Math.round(14900 * 0.15));
  });

  it('throws when no published rate rule found', async () => {
    mockPrisma.rateRule.findFirst.mockResolvedValue(null);
    await expect(service.calculateQuote({ siteId: 's1', unitTypeId: 'ut1', startDate: new Date(), customerType: 'private' })).rejects.toThrow();
  });
});
