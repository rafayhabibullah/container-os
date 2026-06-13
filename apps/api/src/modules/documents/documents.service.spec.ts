import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as crypto from 'crypto';
import { DocumentsService } from './documents.service';

const mockPrisma = {
  document: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  documentAccessLog: {
    create: vi.fn(),
  },
  signatureEnvelope: {
    create: vi.fn(),
    update: vi.fn(),
  },
};

const mockStorage = {
  getSignedUrl: vi.fn(),
};

const mockEvidencePack = {
  createEvidencePack: vi.fn(),
};

const mockAudit = {
  record: vi.fn(),
};

const mockDocumentScan = {
  scan: vi.fn(),
};

const service = new DocumentsService(mockPrisma as any, mockStorage as any, mockEvidencePack as any, mockAudit as any, mockDocumentScan as any);

describe('DocumentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initiateUpload computes a real sha256 hash from the file buffer', async () => {
    const buffer = Buffer.from('hello world');
    const expectedHash = crypto.createHash('sha256').update(buffer).digest('hex');
    mockDocumentScan.scan.mockResolvedValue('clean');
    mockPrisma.document.create.mockResolvedValue({ id: 'doc_01' });
    mockStorage.getSignedUrl.mockResolvedValue('https://signed-url');

    await service.initiateUpload('cust_01', 'contract', 'file.pdf', 'de', buffer);

    expect(mockPrisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ hash: expectedHash }) }),
    );
    expect(mockPrisma.document.create.mock.calls[0][0].data.hash).not.toBe('pending');
  });

  it('initiateUpload sets scanStatus based on DocumentScanService result', async () => {
    mockDocumentScan.scan.mockResolvedValue('clean');
    mockPrisma.document.create.mockResolvedValue({ id: 'doc_01' });
    mockStorage.getSignedUrl.mockResolvedValue('https://signed-url');

    await service.initiateUpload('cust_01', 'contract', 'file.pdf', 'de', Buffer.from('data'));

    expect(mockPrisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ scanStatus: 'clean' }) }),
    );
  });

  it('initiateUpload defaults version to 1 on create', async () => {
    mockDocumentScan.scan.mockResolvedValue('clean');
    mockPrisma.document.create.mockResolvedValue({ id: 'doc_01' });
    mockStorage.getSignedUrl.mockResolvedValue('https://signed-url');

    await service.initiateUpload('cust_01', 'contract', 'file.pdf', 'de', Buffer.from('data'));

    expect(mockPrisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ version: 1 }) }),
    );
  });

  it('logAccess creates a DocumentAccessLog entry with download action', async () => {
    mockPrisma.documentAccessLog.create.mockResolvedValue({ id: 'log_01' });

    await service.logAccess('doc_01', 'user_01', 'download');

    expect(mockPrisma.documentAccessLog.create).toHaveBeenCalledWith({
      data: { documentId: 'doc_01', actorId: 'user_01', action: 'download' },
    });
  });
});
