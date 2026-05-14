import { describe, it, expect, vi } from 'vitest';
import { DatevOrgController } from './datev-org.controller';

const mockDatevExport = {
  runExport: vi.fn().mockResolvedValue({ exportJobId: 'job_01', downloadUrl: 'https://minio/signed' }),
};
const mockPrisma = {
  exportJob: {
    create: vi.fn().mockResolvedValue({ id: 'job_01', status: 'queued' }),
    update: vi.fn().mockResolvedValue({ id: 'job_01', status: 'done', downloadUrl: 'https://minio/signed' }),
    findUniqueOrThrow: vi.fn().mockResolvedValue({ id: 'job_01', status: 'done', downloadUrl: 'https://minio/signed' }),
  },
};

const controller = new DatevOrgController(mockDatevExport as any, mockPrisma as any);

describe('DatevOrgController', () => {
  it('exportDatev creates export job and triggers DatevExportService', async () => {
    const result = await controller.exportDatev('org_01', { siteIds: ['s1'], from: '2026-01-01', to: '2026-01-31' });
    expect(mockDatevExport.runExport).toHaveBeenCalledWith(
      ['s1'],
      expect.any(Date),
      expect.any(Date),
    );
    expect(result).toHaveProperty('jobId');
    expect(result).toHaveProperty('downloadUrl');
  });

  it('getExportJob returns job status and downloadUrl', async () => {
    const result = await controller.getExportJob('org_01', 'job_01');
    expect(mockPrisma.exportJob.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: 'job_01' } });
    expect(result).toHaveProperty('status', 'done');
    expect(result).toHaveProperty('downloadUrl');
  });
});
