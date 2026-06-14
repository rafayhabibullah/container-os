import { describe, it, expect, vi } from 'vitest';
import { MandateOrgController } from './mandate-org.controller';

const mockMandate = {
  createMandate: vi.fn().mockResolvedValue({ id: 'man_01', scheme: 'sepa_core', status: 'pending' }),
  listMandates: vi.fn().mockResolvedValue([{ id: 'man_01' }]),
};

const controller = new MandateOrgController(mockMandate as any);

describe('MandateOrgController', () => {
  it('createMandate delegates to MandateService', async () => {
    const result = await controller.createMandate('org_01', 'cust_01', {
      scheme: 'sepa_core',
      ibanLast4: '4321',
    });
    expect(mockMandate.createMandate).toHaveBeenCalledWith('cust_01', 'sepa_core', '4321', 'operator', undefined, undefined, undefined);
    expect(result).toHaveProperty('id');
  });

  it('listMandates returns all mandates for customer', async () => {
    const result = await controller.listMandates('org_01', 'cust_01');
    expect(mockMandate.listMandates).toHaveBeenCalledWith('cust_01');
    expect(result).toHaveLength(1);
  });
});
