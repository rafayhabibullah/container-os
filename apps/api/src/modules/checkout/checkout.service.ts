import { Injectable, Optional } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainException, ErrorCodes } from '@sitelager/domain-types';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

interface ConfirmCheckoutInput {
  name: string;
  email: string;
  phone: string;
  marketingConsent: boolean;
}

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaClient,
    private notifications: NotificationsService,
    private audit: AuditService,
    @Optional() private subscriptions?: SubscriptionsService,
  ) {}

  async confirmCheckout(sessionId: string, input: ConfirmCheckoutInput) {
    const session = await this.prisma.checkoutSession.findUniqueOrThrow({ where: { id: sessionId } });
    if (session.expiresAt < new Date()) {
      throw new DomainException(ErrorCodes.RESERVATION_EXPIRED, 'Checkout session has expired');
    }

    const meta = session.metadata as { unitId: string; startDate: string; bookingMode?: string; listingId?: string; pricingSnapshot?: { rentMinor?: number | null; depositMinor?: number | null; currency?: string } };
    const hold = await this.prisma.reservationHold.findFirst({
      where: { unitId: meta.unitId, expiresAt: { gte: new Date() } },
    });
    if (!hold) {
      throw new DomainException(ErrorCodes.RESERVATION_EXPIRED, 'Unit hold has expired — please restart checkout');
    }

    const existingContact = await this.prisma.contact.findFirst({
      where: { email: input.email, role: 'primary' },
      select: { customerId: true },
    });

    let customer: { id: string };
    if (existingContact) {
      customer = { id: existingContact.customerId };
    } else {
      customer = await this.prisma.customer.create({
        data: {
          personOrOrgData: { name: input.name, email: input.email, phone: input.phone },
          marketingConsent: input.marketingConsent,
        },
      });
      await this.prisma.contact.create({
        data: { customerId: customer.id, role: 'primary', email: input.email, phone: input.phone || undefined },
      });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const reservation = await this.prisma.reservation.create({
      data: {
        siteId: session.siteId,
        unitId: meta.unitId,
        unitTypeId: session.unitTypeId,
        customerId: customer.id,
        startDate: new Date(meta.startDate),
        expiresAt,
        status: meta.bookingMode === 'approval_required' ? 'pending' : 'pending_signature',
        source: 'marketplace',
      },
    });

    await this.prisma.reservationHold.delete({ where: { id: hold.id } });
    await this.prisma.checkoutSession.update({ where: { id: sessionId }, data: { state: 'completed' } });

    await this.audit.record({
      action: 'checkout.confirmed',
      subjectType: 'Reservation',
      subjectId: reservation.id,
      siteId: session.siteId,
    });

    await this.notifications.sendNotification({
      recipientId: customer.id,
      locale: 'de',
      eventType: 'reservation.confirmed',
      channel: 'email',
      vars: {
        name: input.name,
        email: input.email,
        reservationId: reservation.id,
        startDate: meta.startDate,
      },
    });

    let agreementResult: { agreementId: string; invoiceId: string | null } | null = null;
    if (meta.bookingMode && meta.bookingMode !== 'approval_required') {
      const startDate = new Date(meta.startDate);
      const periodEnd = new Date(startDate);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      const rentMinor = meta.pricingSnapshot?.rentMinor ?? 0;
      const depositMinor = meta.pricingSnapshot?.depositMinor ?? 0;
      const totalMinor = rentMinor + depositMinor;
      const netMinor = totalMinor > 0 ? Math.round(totalMinor / 1.19) : 0;
      const vatMinor = totalMinor - netMinor;

      const agreement = await this.prisma.agreement.create({
        data: {
          reservationId: reservation.id,
          tenantId: customer.id,
          unitId: meta.unitId,
          siteId: session.siteId,
          status: 'pending_signature',
          effectiveFrom: startDate,
          terminationRules: { noticePeriodDays: 30, minimumTermMonths: 1 },
          pricingSnapshot: {
            rentMinor,
            depositMinor,
            currency: meta.pricingSnapshot?.currency ?? 'EUR',
            source: 'marketplace_checkout',
          },
          signatories: { create: [{ personId: customer.id, status: 'pending' }] },
        },
      });

      let invoice: { id: string } | null = null;
      if (totalMinor > 0) {
        invoice = await this.prisma.invoice.create({
          data: {
            agreementId: agreement.id,
            siteId: session.siteId,
            invoiceDate: new Date(),
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            currency: meta.pricingSnapshot?.currency ?? 'EUR',
            netMinor,
            vatMinor,
            totalMinor,
            periodStart: startDate,
            periodEnd,
            lines: {
              create: [
                ...(rentMinor ? [{ kind: 'rent', description: 'Miete erster Monat', amountMinor: rentMinor, taxCode: 'S', vatRate: 19 }] : []),
                ...(depositMinor ? [{ kind: 'deposit', description: 'Kaution', amountMinor: depositMinor, taxCode: 'O', vatRate: 0 }] : []),
              ],
            },
          },
        });
      }
      agreementResult = { agreementId: agreement.id, invoiceId: invoice?.id ?? null };
    }

    const site = this.subscriptions && (this.prisma as any).site?.findUnique
      ? await (this.prisma as any).site.findUnique({ where: { id: session.siteId }, select: { organisationId: true } })
      : null;
    const pricing = (session.metadata as any)?.pricingSnapshot ?? {};
    if (site?.organisationId && this.subscriptions) {
      await this.subscriptions.recordMarketplaceCommission({
        organisationId: site.organisationId,
        reservationId: reservation.id,
        source: 'marketplace',
        baseMinor: (pricing.rentMinor ?? 0) + (pricing.depositMinor ?? 0),
      });
    }

    return {
      reservationId: reservation.id,
      customerId: customer.id,
      status: reservation.status,
      expiresAt: reservation.expiresAt,
      listingId: meta.listingId ?? null,
      nextStep: meta.bookingMode === 'approval_required' ? 'operator_approval' : 'signature_and_payment',
      pricingSnapshot: meta.pricingSnapshot ?? null,
      agreementId: agreementResult?.agreementId ?? null,
      invoiceId: agreementResult?.invoiceId ?? null,
    };
  }
}
