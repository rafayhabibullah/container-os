import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentsService } from './payments.service';
import { Events } from '../../events/domain-events';

const mockPaymentAdapter = {
  chargeInvoice: vi.fn(),
};
const mockStripe = {
  verifyWebhookSignature: vi.fn(),
};
const mockPrisma = {
  invoice: { findUniqueOrThrow: vi.fn() },
  mandate: { findFirst: vi.fn() },
  payment: { create: vi.fn() },
  paymentAttempt: { findFirst: vi.fn(), create: vi.fn() },
};
const mockLedger = { postEntry: vi.fn() };
const mockDelinquency = { markPaid: vi.fn() };
const mockEventBus = { emit: vi.fn() };

const service = new PaymentsService(
  mockPrisma as any,
  mockPaymentAdapter as any,
  mockStripe as any,
  mockLedger as any,
  mockDelinquency as any,
  mockEventBus as any,
);

describe('PaymentsService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('chargeInvoice uses the injected PAYMENT_ADAPTER and marks invoice paid on success', async () => {
    mockPrisma.invoice.findUniqueOrThrow.mockResolvedValue({ id: 'inv_01', totalMinor: 17731, currency: 'EUR', siteId: 's1', agreement: { tenantId: 'tenant_01' } });
    mockPrisma.mandate.findFirst.mockResolvedValue({ scheme: 'sepa_core', stripeSetupId: 'pm_01' });
    mockPrisma.payment.create.mockResolvedValue({ id: 'pay_01' });
    mockPrisma.paymentAttempt.findFirst.mockResolvedValue(null);
    mockPaymentAdapter.chargeInvoice.mockResolvedValue({ providerRef: 'tr_01', status: 'succeeded' });

    const result = await service.chargeInvoice('inv_01');

    expect(mockPaymentAdapter.chargeInvoice).toHaveBeenCalledWith(expect.objectContaining({ invoiceId: 'inv_01', amountMinor: 17731 }));
    expect(mockPrisma.paymentAttempt.create).toHaveBeenCalled();
    expect(mockDelinquency.markPaid).toHaveBeenCalledWith('inv_01');
    expect(mockEventBus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: Events.PAYMENT_SUCCEEDED }));
    expect(result).toEqual({ paymentId: 'pay_01', status: 'succeeded' });
  });

  it('chargeInvoice throws when tenant has no active payment method', async () => {
    mockPrisma.invoice.findUniqueOrThrow.mockResolvedValue({ id: 'inv_02', totalMinor: 5000, currency: 'EUR', siteId: 's1', agreement: { tenantId: 'tenant_02' } });
    mockPrisma.mandate.findFirst.mockResolvedValue(null);

    await expect(service.chargeInvoice('inv_02')).rejects.toThrow('No active payment method for tenant');
  });

  it('chargeInvoice emits PAYMENT_FAILED and rethrows when adapter throws', async () => {
    mockPrisma.invoice.findUniqueOrThrow.mockResolvedValue({ id: 'inv_03', totalMinor: 1000, currency: 'EUR', siteId: 's1', agreement: { tenantId: 'tenant_03' } });
    mockPrisma.mandate.findFirst.mockResolvedValue({ scheme: 'sepa_core', stripeSetupId: 'pm_03' });
    mockPrisma.payment.create.mockResolvedValue({ id: 'pay_03' });
    mockPaymentAdapter.chargeInvoice.mockRejectedValue(new Error('provider down'));

    await expect(service.chargeInvoice('inv_03')).rejects.toThrow('provider down');
    expect(mockEventBus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: Events.PAYMENT_FAILED }));
  });

  it('handleStripeWebhook marks invoice paid on payment_intent.succeeded', async () => {
    mockStripe.verifyWebhookSignature.mockReturnValue({ type: 'payment_intent.succeeded', data: { object: { metadata: { invoiceId: 'inv_01' } } } });

    const result = await service.handleStripeWebhook(Buffer.from(''), 'sig');

    expect(mockDelinquency.markPaid).toHaveBeenCalledWith('inv_01');
    expect(result).toEqual({ received: true });
  });
});
