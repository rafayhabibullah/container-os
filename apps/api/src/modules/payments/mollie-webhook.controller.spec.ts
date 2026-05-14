import { describe, it, expect, vi } from 'vitest';
import { MollieWebhookController } from './mollie-webhook.controller';

const mockMollieAdapter = {
  getPaymentStatus: vi.fn().mockResolvedValue('paid'),
  mapMollieStatus: vi.fn().mockReturnValue('succeeded'),
};
const mockPrisma = {
  paymentAttempt: { findFirst: vi.fn(), update: vi.fn() },
  payment: { update: vi.fn(), findUniqueOrThrow: vi.fn() },
  invoice: { findUniqueOrThrow: vi.fn() },
  ledgerEntry: { create: vi.fn() },
};
const mockDelinquency = { markPaid: vi.fn() };

const controller = new MollieWebhookController(mockMollieAdapter as any, mockPrisma as any, mockDelinquency as any);

describe('MollieWebhookController', () => {
  it('handleWebhook updates payment status to succeeded when Mollie reports paid', async () => {
    mockPrisma.paymentAttempt.findFirst.mockResolvedValue({ id: 'pa_01', paymentId: 'pay_01', providerRef: 'tr_01' });
    mockPrisma.payment.findUniqueOrThrow.mockResolvedValue({ id: 'pay_01', invoiceId: 'inv_01', amountMinor: 17731 });
    mockPrisma.invoice.findUniqueOrThrow.mockResolvedValue({ id: 'inv_01', siteId: 's1', currency: 'EUR' });
    mockPrisma.payment.update.mockResolvedValue({});
    mockPrisma.paymentAttempt.update.mockResolvedValue({});
    mockPrisma.ledgerEntry.create.mockResolvedValue({});

    await controller.handleMollieWebhook({ id: 'tr_01' });

    expect(mockMollieAdapter.getPaymentStatus).toHaveBeenCalledWith('tr_01');
    expect(mockPrisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'succeeded' } }),
    );
    expect(mockDelinquency.markPaid).toHaveBeenCalledWith('inv_01');
  });

  it('handleWebhook returns { received: true } even when providerRef not found (idempotent)', async () => {
    mockPrisma.paymentAttempt.findFirst.mockResolvedValue(null);
    const result = await controller.handleMollieWebhook({ id: 'tr_unknown' });
    expect(result).toEqual({ received: true });
  });
});
