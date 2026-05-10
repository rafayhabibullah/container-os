import { describe, it, expect, vi } from 'vitest';
import { EvidencePackService } from './evidence-pack.service';

const mockPrisma = {
  document: { findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'doc_01', hash: 'abc123', storageKey: 'docs/doc_01.pdf' }) },
  signatureEnvelope: { findMany: vi.fn().mockResolvedValue([{ id: 'env_01', status: 'signed', events: [{ type: 'signed', at: '2026-05-10T12:00:00Z' }] }]) },
  evidencePack: { create: vi.fn().mockResolvedValue({ id: 'pack_01', hash: 'expectedhash' }) },
};
const service = new EvidencePackService(mockPrisma as any);

describe('EvidencePackService', () => {
  it('creates evidence pack with SHA-256 hash', async () => {
    const result = await service.createEvidencePack('doc_01');
    expect(mockPrisma.evidencePack.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ documentId: 'doc_01', hash: expect.stringMatching(/^[a-f0-9]{64}$/) }) })
    );
    expect(result).toHaveProperty('id');
  });
});
