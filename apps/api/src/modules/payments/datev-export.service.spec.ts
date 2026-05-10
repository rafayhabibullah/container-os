import { describe, it, expect, vi } from 'vitest';
import { DatevExportService } from './datev-export.service';

const mockPrisma = { ledgerEntry: { findMany: vi.fn() } };
const mockStorage = { upload: vi.fn().mockResolvedValue({ storageKey: 'exports/exp.csv', hash: 'abc' }), getSignedUrl: vi.fn().mockResolvedValue('https://minio/signed') };
const service = new DatevExportService(mockPrisma as any, mockStorage as any);

describe('DatevExportService', () => {
  it('generates CSV with DATEV header and German decimal format', () => {
    const csv = service.generateCsv([{ id: 'le_01', type: 'invoice_payment', refType: 'Invoice', refId: 'inv_01', debitAccount: '1200', creditAccount: '8400', amountMinor: 17731, createdAt: new Date('2026-06-01'), siteId: 's1' }]);
    expect(csv).toContain('"Umsatz (ohne Soll/Haben-Kz)"');
    expect(csv).toContain('177,31');
    expect(csv).toContain('1200');
  });
});
