import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { DocumentsService } from '../documents/documents.service';

@Injectable()
export class InvoiceDocumentService {
  constructor(private readonly prisma: PrismaClient, private readonly documents: DocumentsService) {}

  async generate(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { lines: true } });
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const pdf = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      pdf.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdf.on('end', () => resolve(Buffer.concat(chunks)));
      pdf.on('error', reject);
      pdf.fontSize(18).text(`Rechnung ${invoice.invoiceNumber ?? invoice.id}`);
      pdf.moveDown().fontSize(10);
      pdf.text(`Rechnungsdatum: ${invoice.invoiceDate.toLocaleDateString('de-DE')}`);
      pdf.text(`Faellig am: ${invoice.dueDate.toLocaleDateString('de-DE')}`);
      pdf.moveDown();
      for (const line of invoice.lines) pdf.text(`${line.description}: ${(line.amountMinor / 100).toFixed(2)} ${invoice.currency}`);
      pdf.moveDown().fontSize(12).text(`Gesamt: ${(invoice.totalMinor / 100).toFixed(2)} ${invoice.currency}`, { align: 'right' });
      pdf.end();
    });
    const document = await this.documents.storeGeneratedDocument({
      subjectType: 'Invoice',
      subjectId: invoice.id,
      kind: 'invoice_pdf',
      buffer,
      locale: invoice.locale,
      fileName: `${invoice.invoiceNumber ?? invoice.id}.pdf`,
    });
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: { pdfStorageKey: document.storageKey, einvoicePayload: { standard: 'EN16931', invoiceNumber: invoice.invoiceNumber, netMinor: invoice.netMinor, vatMinor: invoice.vatMinor, totalMinor: invoice.totalMinor, currency: invoice.currency } },
    });
    return document;
  }
}
