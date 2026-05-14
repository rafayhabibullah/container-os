import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BillingService } from './billing.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const mockPrisma = {
  invoice: {
    findMany: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  creditNote: { create: vi.fn() },
  payment: { create: vi.fn() },
  paymentAttempt: { create: vi.fn() },
};

const service = new BillingService(mockPrisma as any);

describe('BillingService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('listInvoicesForOrg returns invoices filtered by orgId via siteId join', async () => {
    mockPrisma.invoice.findMany.mockResolvedValue([
      { id: 'inv_01', siteId: 's1', status: 'pending', totalMinor: 17731, dueDate: new Date(), agreement: { tenantId: 'cust_01', unit: { unitCode: 'A01' } } },
    ]);
    const result = await service.listInvoicesForOrg('org_01', {});
    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ agreement: { site: { organisationId: 'org_01' } } }) }),
    );
    expect(result).toHaveLength(1);
  });

  it('listInvoicesForOrg applies siteId filter when provided', async () => {
    mockPrisma.invoice.findMany.mockResolvedValue([]);
    await service.listInvoicesForOrg('org_01', { siteId: 's1' });
    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ siteId: 's1' }) }),
    );
  });

  it('voidInvoice sets status to void and creates credit note', async () => {
    mockPrisma.invoice.findUniqueOrThrow.mockResolvedValue({ id: 'inv_01', status: 'pending', totalMinor: 17731, siteId: 's1' });
    mockPrisma.invoice.update.mockResolvedValue({ id: 'inv_01', status: 'void' });
    mockPrisma.creditNote.create.mockResolvedValue({ id: 'cn_01' });
    const result = await service.voidInvoice('inv_01', 'Manual void by operator');
    expect(mockPrisma.invoice.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'void' } }));
    expect(mockPrisma.creditNote.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ invoiceId: 'inv_01', amountMinor: 17731 }) }),
    );
    expect(result).toHaveProperty('creditNoteId');
  });

  it('voidInvoice throws ForbiddenException when invoice already paid', async () => {
    mockPrisma.invoice.findUniqueOrThrow.mockResolvedValue({ id: 'inv_01', status: 'paid', totalMinor: 17731 });
    await expect(service.voidInvoice('inv_01', 'test')).rejects.toThrow(ForbiddenException);
  });

  it('createMolliePayment records Payment row and returns checkoutUrl', async () => {
    mockPrisma.invoice.findUniqueOrThrow.mockResolvedValue({
      id: 'inv_01', status: 'pending', totalMinor: 17731, currency: 'EUR', siteId: 's1',
      agreement: { tenantId: 'cust_01' },
    });
    mockPrisma.payment.create.mockResolvedValue({ id: 'pay_01' });
    const mockMollie = { createPaymentLink: vi.fn().mockResolvedValue({ checkoutUrl: 'https://mollie.com/checkout/tr_01', molliePaymentId: 'tr_01' }) };
    const result = await service.createMolliePayment('inv_01', mockMollie as any, 'https://app/invoices/inv_01');
    expect(mockPrisma.payment.create).toHaveBeenCalled();
    expect(result).toHaveProperty('checkoutUrl', 'https://mollie.com/checkout/tr_01');
  });
});
