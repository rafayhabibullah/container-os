export type PaymentStatus = 'pending' | 'pending_settlement' | 'succeeded' | 'failed';

export interface ChargeInvoiceParams {
  invoiceId: string;
  amountMinor: number;
  currency: string;
  customerId: string;
  paymentMethodId: string;
}

export interface ChargeInvoiceResult {
  providerRef: string;
  status: PaymentStatus;
}

/**
 * Common interface implemented by all payment provider adapters
 * (StripeAdapter, MollieAdapter). Selected at runtime via the
 * PAYMENT_PROVIDER env var (see payments.module.ts).
 */
export interface PaymentAdapter {
  chargeInvoice(params: ChargeInvoiceParams): Promise<ChargeInvoiceResult>;
}

export const PAYMENT_ADAPTER = 'PAYMENT_ADAPTER';
