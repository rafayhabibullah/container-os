import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiKeyService } from './api-key.service';

const mockPrisma = {
  apiClient: { findMany: vi.fn(), create: vi.fn() },
  apiKey: { create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
};

describe('ApiKeyService', () => {
  let service: ApiKeyService;

  beforeEach(() => {
    service = new ApiKeyService(mockPrisma as any);
    vi.clearAllMocks();
  });

  describe('listClients', () => {
    it('returns API clients for the organisation', async () => {
      mockPrisma.apiClient.findMany.mockResolvedValue([{ id: 'c1', name: 'Mobile App' }]);
      const result = await service.listClients('org1');
      expect(result).toEqual([{ id: 'c1', name: 'Mobile App' }]);
      expect(mockPrisma.apiClient.findMany).toHaveBeenCalledWith({
        where: { organisationId: 'org1' },
        include: { keys: { where: { revoked: false } } },
      });
    });
  });

  describe('createClient', () => {
    it('creates a client and returns the raw key on first creation', async () => {
      const client = { id: 'c1', organisationId: 'org1', name: 'Mobile App', scopes: [] };
      mockPrisma.apiClient.create.mockResolvedValue(client);
      mockPrisma.apiKey.create.mockResolvedValue({ id: 'k1' });
      const result = await service.createClient('org1', { name: 'Mobile App', scopes: [] });
      expect(result.client).toEqual(client);
      expect(result.rawKey).toBeDefined();
      expect(typeof result.rawKey).toBe('string');
    });
  });

  describe('revokeKey', () => {
    it('marks the key as revoked', async () => {
      mockPrisma.apiKey.update.mockResolvedValue({});
      await service.revokeKey('k1');
      expect(mockPrisma.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'k1' },
        data: { revoked: true },
      });
    });
  });
});
