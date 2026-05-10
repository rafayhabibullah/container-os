import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccessControlService } from './access-control.service';

const mockPrisma = {
  accessCredential: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  agreement: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'agr_01', unitId: 'u1', siteId: 's1', tenantId: 'cust_01' }), findMany: vi.fn().mockResolvedValue([]) },
};
const mockAdapter = { issueCredential: vi.fn().mockResolvedValue({ externalRef: 'stub_agr_01', maskedValue: '****42' }), revokeCredential: vi.fn(), restoreCredential: vi.fn() };
const mockAudit = { record: vi.fn() };
const mockEventBus = { emit: vi.fn(), on: vi.fn() };
const service = new AccessControlService(mockPrisma as any, mockAdapter as any, mockAudit as any, mockEventBus as any);

describe('AccessControlService', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.agreement.findUniqueOrThrow.mockResolvedValue({ id: 'agr_01', unitId: 'u1', siteId: 's1', tenantId: 'cust_01' }); });

  it('issues credential on agreement activation', async () => {
    mockPrisma.accessCredential.create.mockResolvedValue({ id: 'cred_01', externalRef: 'stub_agr_01', maskedValue: '****42' });
    const result = await service.issueCredential('agr_01', 'pin');
    expect(mockAdapter.issueCredential).toHaveBeenCalledWith(expect.objectContaining({ agreementId: 'agr_01', credentialType: 'pin' }));
    expect(result).toHaveProperty('credentialId');
    expect(mockEventBus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'access.credential.issued' }));
  });

  it('revokes credential on lockout', async () => {
    mockPrisma.accessCredential.findUnique.mockResolvedValue({ id: 'cred_01', externalRef: 'stub_agr_01', status: 'active' });
    mockPrisma.accessCredential.update.mockResolvedValue({ id: 'cred_01', status: 'suspended' });
    await service.suspendCredential('agr_01');
    expect(mockAdapter.revokeCredential).toHaveBeenCalledWith('stub_agr_01');
    expect(mockPrisma.accessCredential.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'suspended' } }));
  });

  it('restores credential after payment', async () => {
    mockPrisma.accessCredential.findUnique.mockResolvedValue({ id: 'cred_01', externalRef: 'stub_agr_01', status: 'suspended' });
    mockPrisma.accessCredential.update.mockResolvedValue({ id: 'cred_01', status: 'active' });
    await service.restoreCredential('agr_01');
    expect(mockAdapter.restoreCredential).toHaveBeenCalledWith('stub_agr_01');
    expect(mockPrisma.accessCredential.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'active' } }));
  });
});
