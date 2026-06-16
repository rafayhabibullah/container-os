import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OperatorAgreementsService } from './operator-agreements.service';

const mockPrisma = {
  site: { findMany: vi.fn(), findFirst: vi.fn() },
  agreement: {
    findMany: vi.fn(),
    findFirstOrThrow: vi.fn(),
    update: vi.fn(),
  },
  customer: { findMany: vi.fn() },
  unit: { findMany: vi.fn(), findFirst: vi.fn() },
  unitType: { findMany: vi.fn(), findFirst: vi.fn() },
  signatory: { createMany: vi.fn() },
  terminationRequest: { create: vi.fn() },
};
const mockAudit = { record: vi.fn() };

const service = new OperatorAgreementsService(mockPrisma as any, mockAudit as any);

const siteIds = ['site_01'];
const agreement = {
  id: 'agr_01', siteId: 'site_01', tenantId: 'cust_01', unitId: 'unit_01',
  status: 'draft', billingCycle: 'monthly', pricingSnapshot: {},
  signatories: [], amendments: [],
};

describe('OperatorAgreementsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.site.findMany.mockResolvedValue([{ id: 'site_01' }]);
    mockPrisma.agreement.findFirstOrThrow.mockResolvedValue(agreement);
    mockPrisma.customer.findMany.mockResolvedValue([]);
    mockPrisma.unit.findMany.mockResolvedValue([]);
    mockPrisma.unitType.findMany.mockResolvedValue([]);
    mockPrisma.unit.findFirst.mockResolvedValue(null);
    mockPrisma.site.findFirst.mockResolvedValue(null);
  });

  it('lists agreements for org via site join', async () => {
    mockPrisma.agreement.findMany.mockResolvedValue([agreement]);
    const result = await service.listAgreements('org_01', {});
    expect(result).toHaveLength(1);
    expect(mockPrisma.agreement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ siteId: { in: siteIds } }) }),
    );
  });

  it('returns agreement detail with signatories and amendments', async () => {
    const result = await service.getAgreement('org_01', 'agr_01');
    expect(result).toHaveProperty('id', 'agr_01');
    expect(mockPrisma.agreement.findFirstOrThrow).toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.objectContaining({ signatories: true, amendments: true }) }),
    );
  });

  it('sends agreement for signature and creates signatory records', async () => {
    mockPrisma.agreement.update.mockResolvedValue({ ...agreement, status: 'pending_signature' });
    mockPrisma.signatory.createMany.mockResolvedValue({ count: 1 });
    const result = await service.sendForSignature('org_01', 'agr_01', ['person_01'], 'actor_01');
    expect(result.status).toBe('pending_signature');
    expect(mockPrisma.signatory.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ personId: 'person_01' })]) }),
    );
  });

  it('creates termination request', async () => {
    mockPrisma.terminationRequest.create.mockResolvedValue({ id: 'term_01', status: 'pending' });
    const result = await service.requestTermination('org_01', 'agr_01', new Date('2026-07-01'), 'operator note', 'actor_01');
    expect(result).toHaveProperty('id', 'term_01');
    expect(mockPrisma.terminationRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ agreementId: 'agr_01', status: 'pending' }) }),
    );
  });
});
