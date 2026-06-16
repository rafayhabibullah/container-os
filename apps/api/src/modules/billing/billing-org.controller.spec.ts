import { describe, it, expect, vi } from 'vitest';

// Minimal integration unit — verifies method wiring without HTTP layer
const mockBilling = {
  listInvoicesForOrg: vi.fn().mockResolvedValue([{ id: 'inv_01' }]),
  getInvoiceDetail: vi.fn().mockResolvedValue({ id: 'inv_01', lines: [] }),
  voidInvoice: vi.fn().mockResolvedValue({ invoiceId: 'inv_01', status: 'void', creditNoteId: 'cn_01' }),
  createMolliePayment: vi.fn().mockResolvedValue({ checkoutUrl: 'https://mollie.com/checkout/tr_01', paymentId: 'pay_01' }),
};
const mockInvoiceRun = { runForDate: vi.fn().mockResolvedValue({ created: 2, skipped: 0, errors: 0 }) };
const mockMollie = {};
const mockPrisma = {
  site: { findMany: vi.fn().mockResolvedValue([]) },
  payment: { findMany: vi.fn().mockResolvedValue([]) },
};

// Import after defining mocks (vitest hoisting not needed — direct instantiation)
import { BillingOrgController } from './billing-org.controller';

const controller = new BillingOrgController(mockBilling as any, mockInvoiceRun as any, mockMollie as any, mockPrisma as any);

describe('BillingOrgController', () => {
  it('listInvoices calls BillingService.listInvoicesForOrg', async () => {
    const result = await controller.listInvoices('org_01', undefined, undefined, undefined);
    expect(mockBilling.listInvoicesForOrg).toHaveBeenCalledWith('org_01', {});
    expect(result).toHaveLength(1);
  });

  it('getInvoice calls BillingService.getInvoiceDetail', async () => {
    await controller.getInvoice('org_01', 'inv_01');
    expect(mockBilling.getInvoiceDetail).toHaveBeenCalledWith('inv_01', 'org_01');
  });

  it('runInvoices triggers InvoiceRunService.runForDate', async () => {
    const result = await controller.runInvoices('org_01', { role: 'owner' } as any);
    expect(mockInvoiceRun.runForDate).toHaveBeenCalled();
    expect(result).toHaveProperty('created', 2);
  });

  it('runInvoices throws 403 when role is not owner', async () => {
    await expect(controller.runInvoices('org_01', { role: 'member' } as any)).rejects.toThrow();
  });

  it('voidInvoice calls BillingService.voidInvoice', async () => {
    const result = await controller.voidInvoice('org_01', 'inv_01', { reason: 'Test void' });
    expect(mockBilling.voidInvoice).toHaveBeenCalledWith('inv_01', 'Test void', 'org_01');
    expect(result).toHaveProperty('creditNoteId');
  });

  it('payInvoice calls BillingService.createMolliePayment', async () => {
    const result = await controller.payInvoice('org_01', 'inv_01');
    expect(mockBilling.createMolliePayment).toHaveBeenCalled();
    expect(result).toHaveProperty('checkoutUrl');
  });
});
