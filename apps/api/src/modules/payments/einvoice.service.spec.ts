import { describe, it, expect } from 'vitest';
import { EInvoiceService } from './einvoice.service';

const service = new EInvoiceService();
const invoiceData = {
  invoiceNumber: 'INV-2026-001', invoiceDate: new Date('2026-06-01'), dueDate: new Date('2026-06-15'),
  seller: { name: 'SiteLager GmbH', address: 'Musterstraße 1', taxId: 'DE123456789' },
  buyer: { name: 'Acme GmbH', address: 'Beispielweg 2', taxId: 'DE987654321' },
  lines: [{ description: 'Containermiete Juni 2026', amountMinor: 14900, vatRate: 0.19, taxCode: 'DE_STD' }],
  currency: 'EUR',
};

describe('EInvoiceService', () => {
  it('generates XML with correct invoice number and ZUGFeRD profile', () => {
    const xml = service.generateZugferdXml(invoiceData);
    expect(xml).toContain('INV-2026-001');
    expect(xml).toContain('urn:factur-x.eu:1p0:minimum');
  });
  it('includes seller and buyer tax IDs', () => {
    const xml = service.generateZugferdXml(invoiceData);
    expect(xml).toContain('DE123456789');
    expect(xml).toContain('DE987654321');
  });
  it('calculates VAT amount correctly', () => {
    const xml = service.generateZugferdXml(invoiceData);
    expect(xml).toContain('28.31'); // 14900 * 0.19 / 100
  });
});
