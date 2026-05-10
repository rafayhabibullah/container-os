import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

interface LedgerRow { id: string; debitAccount: string; creditAccount: string; amountMinor: number; createdAt: Date; refId: string; refType: string; type: string; siteId?: string | null; }

@Injectable()
export class DatevExportService {
  constructor(private prisma: PrismaClient, private storage: any) {}

  generateCsv(entries: LedgerRow[]): string {
    const DATEV_HEADER = '"Umsatz (ohne Soll/Haben-Kz)";"Soll/Haben-Kennzeichen";"WKZ Umsatz";"Kurs";"Basis-Umsatz";"WKZ Basis-Umsatz";"Konto";"Gegenkonto (ohne BU-Schlüssel)";"BU-Schlüssel";"Belegdatum";"Belegfeld 1";"Belegfeld 2";"Skonto";"Buchungstext"\n';
    const fmtDate = (d: Date) => `${String(d.getDate()).padStart(2, '0')}${String(d.getMonth() + 1).padStart(2, '0')}`;
    const fmtAmt = (minor: number) => (minor / 100).toFixed(2).replace('.', ',');
    const rows = entries.map((e) => [`"${fmtAmt(e.amountMinor)}"`, '"S"', '"EUR"', '""', '""', '""', `"${e.debitAccount}"`, `"${e.creditAccount}"`, '""', `"${fmtDate(e.createdAt)}"`, `"${e.refId}"`, '""', '""', `"${e.type}"`].join(';'));
    return DATEV_HEADER + rows.join('\n');
  }

  async runExport(siteIds: string[], from: Date, to: Date): Promise<{ exportJobId: string; downloadUrl: string }> {
    const entries = await this.prisma.ledgerEntry.findMany({ where: { siteId: { in: siteIds }, createdAt: { gte: from, lte: to } }, orderBy: { createdAt: 'asc' } });
    const csv = this.generateCsv(entries as any);
    const buffer = Buffer.from(csv, 'utf-8');
    const key = `exports/datev_${Date.now()}.csv`;
    const { storageKey } = await this.storage.upload(key, buffer, 'text/csv');
    const downloadUrl = await this.storage.getSignedUrl(storageKey, 3600);
    return { exportJobId: key, downloadUrl };
  }
}
