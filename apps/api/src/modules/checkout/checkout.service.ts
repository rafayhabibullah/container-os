import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainException, ErrorCodes } from '@sitelager/domain-types';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';

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
  ) {}

  async confirmCheckout(sessionId: string, input: ConfirmCheckoutInput) {
    const session = await this.prisma.checkoutSession.findUniqueOrThrow({ where: { id: sessionId } });
    if (session.expiresAt < new Date()) {
      throw new DomainException(ErrorCodes.RESERVATION_EXPIRED, 'Checkout session has expired');
    }

    const meta = session.metadata as { unitId: string; startDate: string };
    const hold = await this.prisma.reservationHold.findFirst({
      where: { unitId: meta.unitId, expiresAt: { gte: new Date() } },
    });
    if (!hold) {
      throw new DomainException(ErrorCodes.RESERVATION_EXPIRED, 'Unit hold has expired — please restart checkout');
    }

    const customer = await this.prisma.customer.create({
      data: {
        personOrOrgData: { name: input.name, email: input.email, phone: input.phone },
        marketingConsent: input.marketingConsent,
      },
    });
    await this.prisma.contact.create({
      data: { customerId: customer.id, email: input.email, phone: input.phone || undefined },
    });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const reservation = await this.prisma.reservation.create({
      data: {
        siteId: session.siteId,
        unitId: meta.unitId,
        unitTypeId: session.unitTypeId,
        customerId: customer.id,
        startDate: new Date(meta.startDate),
        expiresAt,
        status: 'pending_signature',
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

    return { reservationId: reservation.id, customerId: customer.id, status: reservation.status, expiresAt: reservation.expiresAt };
  }
}
