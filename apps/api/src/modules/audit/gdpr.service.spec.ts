import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { GdprService } from './gdpr.service';
import { AuditService } from './audit.service';

describe('GdprService', () => {
  let mockPrisma: any;
  let auditService: AuditService;
  let service: GdprService;

  beforeEach(() => {
    mockPrisma = {
      legalHold: { findFirst: vi.fn().mockResolvedValue(null) },
      auditEvent: { create: vi.fn().mockResolvedValue({ id: 'evt_01' }) },
      customer: { update: vi.fn().mockResolvedValue({}) },
      contact: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      mandate: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      agreement: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      $transaction: vi.fn((ops: any[]) => Promise.all(ops)),
    };
    auditService = new AuditService(mockPrisma);
    service = new GdprService(mockPrisma, auditService);
  });

  it('blocks anonymization when an active legal hold exists', async () => {
    mockPrisma.legalHold.findFirst.mockResolvedValueOnce({ id: 'hold_01', active: true });

    await expect(service.anonymizeCustomer('cust_01')).rejects.toThrow(ForbiddenException);
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    expect(mockPrisma.customer.update).not.toHaveBeenCalled();
  });

  it('soft-deletes and scrubs PII when no legal hold is active', async () => {
    await service.anonymizeCustomer('cust_01');

    expect(mockPrisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'cust_01' },
      data: expect.objectContaining({
        deletedAt: expect.any(Date),
        marketingConsent: false,
        personOrOrgData: expect.objectContaining({ redacted: true }),
      }),
    });

    expect(mockPrisma.contact.updateMany).toHaveBeenCalledWith({
      where: { customerId: 'cust_01' },
      data: expect.objectContaining({
        deletedAt: expect.any(Date),
        email: '[redacted]',
        phone: null,
      }),
    });

    expect(mockPrisma.mandate.updateMany).toHaveBeenCalledWith({
      where: { customerId: 'cust_01' },
      data: expect.objectContaining({
        deletedAt: expect.any(Date),
        ibanLast4: null,
      }),
    });

    expect(mockPrisma.agreement.updateMany).toHaveBeenCalledWith({
      where: { tenantId: 'cust_01' },
      data: expect.objectContaining({ deletedAt: expect.any(Date) }),
    });

    expect(mockPrisma.auditEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'customer.anonymized',
        subjectType: 'Customer',
        subjectId: 'cust_01',
      }),
    });
  });
});
