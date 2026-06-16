import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

interface Issue {
  code: string;
  severity: 'warning' | 'error';
  message: string;
  refType?: string;
  refId?: string;
}

@Injectable()
export class AccountingValidationService {
  constructor(private readonly prisma: PrismaClient) {}

  async validateOrganisation(organisationId: string, from?: Date, to?: Date) {
    const sites = await this.prisma.site.findMany({ where: { organisationId }, select: { id: true } });
    const siteIds = sites.map((site) => site.id);
    const invoices = await this.prisma.invoice.findMany({
      where: {
        siteId: { in: siteIds },
        deletedAt: null,
        ...(from || to ? { invoiceDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: { lines: true },
    });
    const mappings = await this.prisma.accountingMapping.findMany({ where: { siteId: { in: siteIds } } });
    const mappingSiteIds = new Set(mappings.map((mapping) => mapping.siteId));
    const issues: Issue[] = [];

    for (const invoice of invoices) {
      if (!invoice.invoiceNumber) issues.push({ code: 'MISSING_INVOICE_NUMBER', severity: 'error', message: 'Invoice has no invoice number', refType: 'Invoice', refId: invoice.id });
      if (!invoice.pdfStorageKey) issues.push({ code: 'MISSING_INVOICE_PDF', severity: 'warning', message: 'Invoice PDF has not been generated', refType: 'Invoice', refId: invoice.id });
      if (!invoice.einvoiceStorageKey && !invoice.einvoicePayload) issues.push({ code: 'MISSING_EINVOICE', severity: 'warning', message: 'Invoice has no ZUGFeRD/XRechnung payload', refType: 'Invoice', refId: invoice.id });
      if (!mappingSiteIds.has(invoice.siteId)) issues.push({ code: 'MISSING_DATEV_MAPPING', severity: 'error', message: 'Site has no DATEV accounting mapping', refType: 'Site', refId: invoice.siteId });
      for (const line of invoice.lines) {
        if (line.vatRate === null || line.vatRate === undefined) issues.push({ code: 'MISSING_VAT_RATE', severity: 'error', message: 'Invoice line has no VAT rate', refType: 'InvoiceLine', refId: line.id });
        if (!line.taxCode) issues.push({ code: 'MISSING_TAX_CODE', severity: 'warning', message: 'Invoice line has no tax code', refType: 'InvoiceLine', refId: line.id });
      }
    }

    const status = issues.some((issue) => issue.severity === 'error') ? 'failed' : issues.length ? 'warning' : 'passed';
    return (this.prisma as any).accountingValidationRun.create({
      data: { organisationId, kind: 'german_launch_readiness', status, issues },
    });
  }
}
