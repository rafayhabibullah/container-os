import { describe, it, expect, vi } from 'vitest';
import { StripeAdapter } from './stripe.adapter';

const mockStripe = {
  paymentIntents: { create: vi.fn() },
  setupIntents: { create: vi.fn() },
  webhooks: { constructEvent: vi.fn() },
};
const adapter = new StripeAdapter();
(adapter as any).stripe = mockStripe; // inject mock after construction

describe('StripeAdapter', () => {
  it('creates setup intent for SEPA Core', async () => {
    mockStripe.setupIntents.create.mockResolvedValue({ id: 'seti_01', client_secret: 'seti_secret_01' });
    const result = await adapter.createSetupIntent('cust_01', 'sepa_debit');
    expect(mockStripe.setupIntents.create).toHaveBeenCalledWith(expect.objectContaining({ payment_method_types: ['sepa_debit'] }));
    expect(result).toHaveProperty('clientSecret');
  });

  it('creates payment intent for invoice charge', async () => {
    mockStripe.paymentIntents.create.mockResolvedValue({ id: 'pi_01', status: 'succeeded' });
    const result = await adapter.chargeInvoice({ invoiceId: 'inv_01', amountMinor: 17731, currency: 'EUR', customerId: 'cust_01', paymentMethodId: 'pm_01' });
    expect(result.providerRef).toBe('pi_01');
    expect(result.status).toBe('succeeded');
  });

  it('maps stripe statuses correctly', () => {
    expect(adapter.mapStatus('succeeded')).toBe('succeeded');
    expect(adapter.mapStatus('processing')).toBe('pending_settlement');
    expect(adapter.mapStatus('requires_payment_method')).toBe('failed');
  });
});
