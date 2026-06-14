import { describe, it, expect, vi } from 'vitest';
import { MandateService } from './mandate.service';
import { validateMandateReference, generateMandateReference } from './sepa-validation';
import { DomainException } from '@sitelager/domain-types';

const mockPrisma = {
  mandate: {
    create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'man_01', ...data })),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  organisation: {
    findUnique: vi.fn().mockResolvedValue({ id: 'org_01', legalName: 'SiteLager GmbH', vatId: 'DE89370400440532013000' }),
  },
};

const mockDocuments = {
  storeGeneratedDocument: vi.fn().mockResolvedValue({ id: 'doc_01', storageKey: 'documents/organisation/org_01/x.xml' }),
};

const service = new MandateService(mockPrisma as any, mockDocuments as any);

describe('SEPA mandate reference validation', () => {
  it('accepts valid references', () => {
    expect(() => validateMandateReference('SL-ORG01-12345')).not.toThrow();
    expect(() => validateMandateReference('MANDATE/2024.001')).not.toThrow();
    expect(() => validateMandateReference('A')).not.toThrow();
    expect(() => validateMandateReference('a'.repeat(35))).not.toThrow();
  });

  it('rejects references that are too long', () => {
    expect(() => validateMandateReference('a'.repeat(36))).toThrow(DomainException);
  });

  it('rejects empty references', () => {
    expect(() => validateMandateReference('')).toThrow(DomainException);
  });

  it('rejects disallowed characters', () => {
    expect(() => validateMandateReference('MANDATE#001')).toThrow(DomainException);
    expect(() => validateMandateReference('MANDATE 001')).toThrow(DomainException);
  });

  it('rejects leading/trailing special characters', () => {
    expect(() => validateMandateReference('-MANDATE001')).toThrow(DomainException);
    expect(() => validateMandateReference('MANDATE001-')).toThrow(DomainException);
    expect(() => validateMandateReference('/MANDATE001')).toThrow(DomainException);
  });

  it('rejects consecutive special characters', () => {
    expect(() => validateMandateReference('MANDATE--001')).toThrow(DomainException);
    expect(() => validateMandateReference('MANDATE.../001')).toThrow(DomainException);
  });

  it('generateMandateReference produces a compliant reference', () => {
    const ref = generateMandateReference('org_01abc');
    expect(ref.length).toBeLessThanOrEqual(35);
    expect(() => validateMandateReference(ref)).not.toThrow();
    expect(ref.startsWith('SL-')).toBe(true);
  });
});

describe('MandateService.createMandate', () => {
  it('auto-generates a reference when not provided', async () => {
    const mandate = await service.createMandate('cust_01', 'sepa_core');
    expect(mandate.reference).toMatch(/^SL-/);
  });

  it('uses provided reference if valid', async () => {
    const mandate = await service.createMandate('cust_01', 'sepa_core', undefined, undefined, undefined, 'MANDATE/2024.001');
    expect(mandate.reference).toBe('MANDATE/2024.001');
  });

  it('throws for an invalid provided reference', async () => {
    await expect(
      service.createMandate('cust_01', 'sepa_core', undefined, undefined, undefined, 'BAD#REF'),
    ).rejects.toThrow(DomainException);
  });
});

describe('MandateService.generateDirectDebitXml', () => {
  it('produces well-formed pain.008.001.02 XML', async () => {
    mockPrisma.mandate.findMany.mockResolvedValue([
      {
        id: 'man_01',
        reference: 'SL-ORG01-001',
        scheme: 'sepa_core',
        creditorId: 'DE98ZZZ09999999999',
        ibanLast4: '1234',
        signedAt: new Date('2024-01-15'),
        customer: { personOrOrgData: { name: 'Max Mustermann' } },
      },
    ]);

    const xml = await service.generateDirectDebitXml(['man_01'], new Date('2024-03-01'), 'org_01');

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('urn:iso:std:iso:20022:tech:xsd:pain.008.001.02');
    expect(xml).toContain('<GrpHdr>');
    expect(xml).toContain('<NbOfTxs>1</NbOfTxs>');
    expect(xml).toContain('<PmtMtd>DD</PmtMtd>');
    expect(xml).toContain('<ReqdColltnDt>2024-03-01</ReqdColltnDt>');
    expect(xml).toContain('<MndtId>SL-ORG01-001</MndtId>');
    expect(xml).toContain('SeqTp>RCUR<');
    expect(xml).toContain('Max Mustermann');
    expect(xml).toContain('SiteLager GmbH');
  });

  it('uses FRST sequence type for unsigned mandates', async () => {
    mockPrisma.mandate.findMany.mockResolvedValue([
      {
        id: 'man_02',
        reference: 'SL-ORG01-002',
        scheme: 'sepa_b2b',
        creditorId: null,
        ibanLast4: '5678',
        signedAt: null,
        customer: { personOrOrgData: { name: 'Erika Musterfrau' } },
      },
    ]);

    const xml = await service.generateDirectDebitXml(['man_02'], new Date('2024-03-15'), 'org_01');
    expect(xml).toContain('SeqTp>FRST<');
    expect(xml).toContain('<Cd>B2B</Cd>');
  });
});

describe('MandateService.createDirectDebitBatch', () => {
  it('stores the generated XML as a document', async () => {
    mockPrisma.mandate.findMany.mockResolvedValue([
      {
        id: 'man_01',
        reference: 'SL-ORG01-001',
        scheme: 'sepa_core',
        creditorId: 'DE98ZZZ09999999999',
        ibanLast4: '1234',
        signedAt: new Date('2024-01-15'),
        customer: { personOrOrgData: { name: 'Max Mustermann' } },
      },
    ]);

    const doc = await service.createDirectDebitBatch('org_01', ['man_01'], new Date('2024-03-01'));
    expect(mockDocuments.storeGeneratedDocument).toHaveBeenCalledWith(
      expect.objectContaining({ subjectType: 'Organisation', subjectId: 'org_01', kind: 'sepa_direct_debit_batch', contentType: 'application/xml' }),
    );
    expect(doc).toHaveProperty('id');
  });
});
