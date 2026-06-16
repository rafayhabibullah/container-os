import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionsService } from './subscriptions.service';

const prisma = {
  organisation: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  subscriptionInvoice: { count: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findMany: vi.fn(), findFirstOrThrow: vi.fn() },
  organisationSubscription: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
  commissionRecord: { create: vi.fn(), findMany: vi.fn() },
};
const mollie = {
  isConfigured: vi.fn(),
  createCustomer: vi.fn(),
  createPaymentLink: vi.fn(),
  getPayment: vi.fn(),
  createRecurringSubscription: vi.fn(),
  cancelRecurringSubscription: vi.fn(),
};
const service = new SubscriptionsService(prisma as any, mollie as any);

describe('SubscriptionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mollie.isConfigured.mockReturnValue(true);
  });

  it('activates Free without asking for payment', async () => {
    prisma.organisationSubscription.findFirst.mockResolvedValue(null);
    prisma.organisationSubscription.create.mockResolvedValue({ id: 'sub_free', plan: 'free', status: 'active' });
    const result = await service.createCheckout('org_1', 'free');
    expect(result.requiresPayment).toBe(false);
    expect(mollie.createPaymentLink).not.toHaveBeenCalled();
    expect(prisma.organisation.update).toHaveBeenCalledWith(expect.objectContaining({ data: { plan: 'free' } }));
  });

  it('creates a pending paid subscription and Mollie hosted checkout', async () => {
    prisma.organisation.findUniqueOrThrow.mockResolvedValue({ id: 'org_1', legalName: 'Alpha GmbH', billingEmail: 'owner@alpha.de', countryCode: 'DE' });
    prisma.organisationSubscription.findFirst.mockResolvedValue(null);
    prisma.organisationSubscription.create.mockResolvedValue({ id: 'sub_paid' });
    prisma.subscriptionInvoice.count.mockResolvedValue(0);
    prisma.subscriptionInvoice.create.mockResolvedValue({ id: 'sinv_1', invoiceNumber: 'SL-2026-000001', totalMinor: 4900 });
    mollie.createCustomer.mockResolvedValue({ customerId: 'cst_1' });
    mollie.createPaymentLink.mockResolvedValue({ molliePaymentId: 'tr_1', checkoutUrl: 'https://mollie.test/checkout' });

    const result = await service.createCheckout('org_1', 'starter', 'monthly');

    expect(result).toMatchObject({ requiresPayment: true, checkoutUrl: 'https://mollie.test/checkout', invoiceNumber: 'SL-2026-000001' });
    expect(prisma.subscriptionInvoice.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ organisationId: 'org_1', subscriptionId: 'sub_paid', totalMinor: 4900 }) }));
    expect(mollie.createPaymentLink).toHaveBeenCalledWith(expect.objectContaining({ amountMinor: 4900, sequenceType: 'first', customerId: 'cst_1' }));
    expect(mollie.createPaymentLink).toHaveBeenCalledWith(expect.objectContaining({ invoiceId: 'SL-2026-000001' }));
    expect(mollie.createPaymentLink).toHaveBeenCalledWith(expect.objectContaining({ webhookUrl: undefined }));
  });

  it('rejects paid checkout when Mollie is not configured', async () => {
    mollie.isConfigured.mockReturnValue(false);

    await expect(service.createCheckout('org_1', 'starter', 'monthly')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PAYMENT_PROVIDER_NOT_CONFIGURED' }),
    });
    expect(prisma.organisationSubscription.create).not.toHaveBeenCalled();
  });

  it('activates paid plan only after Mollie confirms the first payment', async () => {
    prisma.organisationSubscription.findUnique.mockResolvedValue({
      id: 'sub_paid', organisationId: 'org_1', plan: 'professional', billingInterval: 'monthly', providerCustomerId: 'cst_1', status: 'pending_payment',
    });
    mollie.getPayment.mockResolvedValue({ status: 'paid', metadata: { subscriptionId: 'sub_paid' } });
    mollie.createRecurringSubscription.mockResolvedValue({ subscriptionId: 'sub_mollie' });

    await service.handlePaymentWebhook('tr_1');

    expect(mollie.createRecurringSubscription).toHaveBeenCalled();
    expect(prisma.organisation.update).toHaveBeenCalledWith(expect.objectContaining({ data: { plan: 'professional' } }));
    expect(prisma.organisationSubscription.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'active', providerSubscriptionId: 'sub_mollie' }) }));
  });

  it('reconciles a returned local checkout without a Mollie webhook', async () => {
    prisma.organisationSubscription.findFirst
      .mockResolvedValueOnce({ id: 'sub_paid', providerPaymentId: 'tr_1' });
    prisma.organisationSubscription.findUnique
      .mockResolvedValueOnce({
        id: 'sub_paid', organisationId: 'org_1', plan: 'starter', billingInterval: 'monthly', providerCustomerId: 'cst_1', status: 'pending_payment',
      })
      .mockResolvedValueOnce({ id: 'sub_paid', status: 'active' });
    mollie.getPayment.mockResolvedValue({ status: 'paid' });
    mollie.createRecurringSubscription.mockResolvedValue({ subscriptionId: 'sub_mollie' });

    const result = await service.reconcileCheckout('org_1');

    expect(result).toMatchObject({ reconciled: true, paymentStatus: 'paid', subscription: { status: 'active' } });
    expect(prisma.organisation.update).toHaveBeenCalledWith(expect.objectContaining({ data: { plan: 'starter' } }));
  });

  it('does not report success for a failed returned checkout when Free is still active', async () => {
    prisma.organisationSubscription.findFirst.mockResolvedValueOnce({ id: 'sub_paid', providerPaymentId: 'tr_failed' });
    prisma.organisationSubscription.findUnique
      .mockResolvedValueOnce({
        id: 'sub_paid', organisationId: 'org_1', plan: 'starter', billingInterval: 'monthly', providerCustomerId: 'cst_1', status: 'pending_payment',
      })
      .mockResolvedValueOnce({ id: 'sub_paid', status: 'payment_failed' });
    mollie.getPayment.mockResolvedValue({ status: 'failed' });

    const result = await service.reconcileCheckout('org_1');

    expect(result).toMatchObject({ reconciled: true, paymentStatus: 'failed', subscription: { status: 'payment_failed' } });
    expect(prisma.organisation.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: { plan: 'starter' } }));
  });
});
