import { describe, it, expect, vi } from 'vitest';
import { MollieAdapter } from './mollie.adapter';

const mockMollie = {
  payments: {
    create: vi.fn(),
    get: vi.fn(),
  },
};

const adapter = new MollieAdapter();
(adapter as any).client = mockMollie;

describe('MollieAdapter', () => {
  it('reports whether a real Mollie API key is configured', () => {
    const original = process.env.MOLLIE_API_KEY;
    delete process.env.MOLLIE_API_KEY;
    expect(adapter.isConfigured()).toBe(false);
    process.env.MOLLIE_API_KEY = 'test_example-key';
    expect(adapter.isConfigured()).toBe(true);
    if (original === undefined) delete process.env.MOLLIE_API_KEY;
    else process.env.MOLLIE_API_KEY = original;
  });

  it('createPaymentLink returns checkoutUrl from Mollie response', async () => {
    mockMollie.payments.create.mockResolvedValue({
      id: 'tr_mollie_01',
      _links: { checkout: { href: 'https://www.mollie.com/checkout/tr_mollie_01' } },
    });
    const result = await adapter.createPaymentLink({
      invoiceId: 'inv_01',
      amountMinor: 17731,
      currency: 'EUR',
      description: 'Invoice inv_01',
      redirectUrl: 'https://app.sitelager.io/invoices/inv_01',
    });
    expect(result.checkoutUrl).toBe('https://www.mollie.com/checkout/tr_mollie_01');
    expect(result.molliePaymentId).toBe('tr_mollie_01');
    expect(mockMollie.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: { value: '177.31', currency: 'EUR' } }),
    );
  });

  it('getPaymentStatus returns status from Mollie', async () => {
    mockMollie.payments.get.mockResolvedValue({ id: 'tr_mollie_01', status: 'paid' });
    const status = await adapter.getPaymentStatus('tr_mollie_01');
    expect(status).toBe('paid');
  });

  it('mapMollieStatus converts paid -> succeeded', () => {
    expect(adapter.mapMollieStatus('paid')).toBe('succeeded');
    expect(adapter.mapMollieStatus('pending')).toBe('pending');
    expect(adapter.mapMollieStatus('open')).toBe('pending');
    expect(adapter.mapMollieStatus('failed')).toBe('failed');
    expect(adapter.mapMollieStatus('canceled')).toBe('failed');
    expect(adapter.mapMollieStatus('expired')).toBe('failed');
  });
});
