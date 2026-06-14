import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuditService } from './audit.service';

const REDACTED = '[redacted]';

@Injectable()
export class GdprService {
  constructor(
    private prisma: PrismaClient,
    private auditService: AuditService,
  ) {}

  /**
   * Anonymises a customer and related personal data, unless an active
   * LegalHold blocks it (e.g. ongoing dispute, audit, or legal retention
   * requirement).
   */
  async anonymizeCustomer(customerId: string): Promise<void> {
    const held = await this.auditService.hasLegalHold('Customer', customerId);
    if (held) {
      throw new ForbiddenException('LEGAL_HOLD_ACTIVE');
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: customerId },
        data: {
          deletedAt: now,
          marketingConsent: false,
          personOrOrgData: { redacted: true },
        },
      }),
      this.prisma.contact.updateMany({
        where: { customerId },
        data: {
          deletedAt: now,
          email: REDACTED,
          phone: null,
        },
      }),
      this.prisma.mandate.updateMany({
        where: { customerId },
        data: {
          deletedAt: now,
          ibanLast4: null,
          consentSource: null,
          stripeSetupId: null,
        },
      }),
      this.prisma.agreement.updateMany({
        where: { tenantId: customerId },
        data: {
          deletedAt: now,
        },
      }),
    ]);

    await this.auditService.record({
      action: 'customer.anonymized',
      subjectType: 'Customer',
      subjectId: customerId,
    });
  }
}
