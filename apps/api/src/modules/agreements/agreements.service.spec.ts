import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgreementsService } from './agreements.service';
import { DomainException } from '@sitelager/domain-types';

const mockPrisma = {
  agreement: { create: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  signatory: { findMany: vi.fn(), create: vi.fn() },
  mandate: { findFirst: vi.fn() },
  reservation: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'res_01', unitId: 'u1', customerId: 'cust_01', siteId: 's1' }) },
  terminationRequest: { create: vi.fn() },
  customer: { findUnique: vi.fn() },
  agreementTemplate: { findFirst: vi.fn() },
};
const mockAudit = { record: vi.fn() };
const mockEventBus = { emit: vi.fn() };
const mockDocuments = { storeGeneratedDocument: vi.fn() };
const mockEvidencePack = { createEvidencePack: vi.fn() };
const service = new AgreementsService(mockPrisma as any, mockAudit as any, mockEventBus as any, mockDocuments as any, mockEvidencePack as any);

const baseAgreement = {
  id: 'agr_01',
  status: 'signed',
  siteId: 's1',
  tenantId: 'cust_01',
  unitId: 'u1',
  billingCycle: 'monthly',
  language: 'de',
  pricingSnapshot: { amountMinor: 14900 },
  terminationRules: { noticeDays: 30 },
  effectiveFrom: null,
  createdAt: new Date('2026-01-01'),
};

describe('AgreementsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.reservation.findUniqueOrThrow.mockResolvedValue({ id: 'res_01', unitId: 'u1', customerId: 'cust_01', siteId: 's1' });
    mockPrisma.customer.findUnique.mockResolvedValue({ id: 'cust_01', personOrOrgData: { firstName: 'Max', lastName: 'Mustermann' } });
    mockPrisma.agreementTemplate.findFirst.mockResolvedValue(null);
    mockDocuments.storeGeneratedDocument.mockResolvedValue({ id: 'doc_01' });
    mockEvidencePack.createEvidencePack.mockResolvedValue({ id: 'pack_01' });
  });

  it('drafts agreement with pricing snapshot', async () => {
    mockPrisma.agreement.create.mockResolvedValue({ id: 'agr_01', status: 'draft' });
    const result = await service.draftAgreement({ reservationId: 'res_01', billingCycle: 'monthly', language: 'de', pricingSnapshot: { amountMinor: 14900 } });
    expect(result.agreementId).toBe('agr_01');
    expect(mockPrisma.agreement.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ pricingSnapshot: expect.any(Object) }) }));
  });

  it('blocks activation when signatory not signed', async () => {
    mockPrisma.agreement.findUniqueOrThrow.mockResolvedValue({ id: 'agr_01', status: 'pending_signature', siteId: 's1', tenantId: 'cust_01', unitId: 'u1' });
    mockPrisma.signatory.findMany.mockResolvedValue([{ status: 'pending' }]);
    mockPrisma.mandate.findFirst.mockResolvedValue({ status: 'active' });
    await expect(service.activateAgreement('agr_01', 'actor_01')).rejects.toBeInstanceOf(DomainException);
  });

  it('activates and emits event when all prerequisites met', async () => {
    mockPrisma.agreement.findUniqueOrThrow.mockResolvedValue(baseAgreement);
    mockPrisma.signatory.findMany.mockResolvedValue([{ status: 'signed' }]);
    mockPrisma.mandate.findFirst.mockResolvedValue({ status: 'active' });
    mockPrisma.agreement.update.mockResolvedValue({ id: 'agr_01', status: 'active' });
    const result = await service.activateAgreement('agr_01', 'actor_01');
    expect(result.status).toBe('active');
    expect(mockEventBus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'agreement.activated' }));
  });

  it('generates a non-empty PDF buffer for an agreement', async () => {
    mockPrisma.agreement.findUniqueOrThrow.mockResolvedValue(baseAgreement);
    const buffer = await service.generateAgreementPdf('agr_01');
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('activation stores generated PDF document and records evidence pack', async () => {
    mockPrisma.agreement.findUniqueOrThrow.mockResolvedValue(baseAgreement);
    mockPrisma.signatory.findMany.mockResolvedValue([{ status: 'signed' }]);
    mockPrisma.mandate.findFirst.mockResolvedValue({ status: 'active' });
    mockPrisma.agreement.update.mockResolvedValue({ id: 'agr_01', status: 'active' });

    await service.activateAgreement('agr_01', 'actor_01');

    expect(mockDocuments.storeGeneratedDocument).toHaveBeenCalledWith(
      expect.objectContaining({ subjectType: 'Agreement', subjectId: 'agr_01', kind: 'agreement_pdf', buffer: expect.any(Buffer) }),
    );
    expect(mockEvidencePack.createEvidencePack).toHaveBeenCalledWith('doc_01');
  });
});
