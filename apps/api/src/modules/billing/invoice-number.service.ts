import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class InvoiceNumberService {
  constructor(private readonly prisma: PrismaClient) {}

  async next(organisationId: string, date = new Date()) {
    const year = date.getFullYear();
    return this.prisma.$transaction(async (tx) => {
      const sequence = await tx.invoiceSequence.upsert({
        where: { organisationId_year: { organisationId, year } },
        create: { organisationId, year, nextNumber: 2 },
        update: { nextNumber: { increment: 1 } },
      });
      const number = sequence.nextNumber - 1;
      return `${sequence.prefix}-${year}-${String(number).padStart(6, '0')}`;
    });
  }
}
