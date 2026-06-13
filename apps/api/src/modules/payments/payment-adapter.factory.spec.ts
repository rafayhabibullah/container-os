import { describe, it, expect, afterEach } from 'vitest';
import { paymentAdapterFactory } from './payments.module';
import { MollieAdapter } from './mollie.adapter';
import { StripeAdapter } from './stripe.adapter';

describe('paymentAdapterFactory', () => {
  const mollie = {} as MollieAdapter;
  const stripe = {} as StripeAdapter;
  const originalEnv = process.env.PAYMENT_PROVIDER;

  afterEach(() => {
    if (originalEnv === undefined) delete process.env.PAYMENT_PROVIDER;
    else process.env.PAYMENT_PROVIDER = originalEnv;
  });

  it('defaults to MollieAdapter when PAYMENT_PROVIDER is unset', () => {
    delete process.env.PAYMENT_PROVIDER;
    const adapter = paymentAdapterFactory.useFactory(mollie, stripe);
    expect(adapter).toBe(mollie);
  });

  it('returns StripeAdapter when PAYMENT_PROVIDER=stripe', () => {
    process.env.PAYMENT_PROVIDER = 'stripe';
    const adapter = paymentAdapterFactory.useFactory(mollie, stripe);
    expect(adapter).toBe(stripe);
  });

  it('returns MollieAdapter when PAYMENT_PROVIDER=mollie explicitly', () => {
    process.env.PAYMENT_PROVIDER = 'mollie';
    const adapter = paymentAdapterFactory.useFactory(mollie, stripe);
    expect(adapter).toBe(mollie);
  });
});
