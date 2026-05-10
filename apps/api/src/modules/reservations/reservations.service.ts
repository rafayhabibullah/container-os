import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainException, ErrorCodes } from '@container-os/domain-types';
import { AuditService } from '../audit/audit.service';
import { EventBusService } from '../../events/event-bus.service';
import { Events } from '../../events/domain-events';

interface CreateReservationInput { siteId: string; unitId: string; unitTypeId: string; customerId: string; startDate: Date; lockToken: string; }

@Injectable()
export class ReservationsService {
  constructor(private prisma: PrismaClient, private audit: AuditService, private eventBus: EventBusService) {}

  async createReservation(input: CreateReservationInput) {
    const hold = await this.prisma.reservationHold.findFirst({ where: { unitId: input.unitId, lockToken: input.lockToken, expiresAt: { gte: new Date() } } });
    if (!hold) throw new DomainException(ErrorCodes.RESERVATION_EXPIRED, 'Reservation hold expired or invalid lock token');

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const reservation = await this.prisma.reservation.create({ data: { siteId: input.siteId, unitId: input.unitId, unitTypeId: input.unitTypeId, customerId: input.customerId, startDate: input.startDate, expiresAt, status: 'pending_signature' } });
    await this.prisma.reservationHold.delete({ where: { id: hold.id } });
    await this.audit.record({ action: 'reservation.created', subjectType: 'Reservation', subjectId: reservation.id, siteId: input.siteId });
    this.eventBus.emit({ type: Events.RESERVATION_CONFIRMED, payload: { reservationId: reservation.id, customerId: input.customerId }, meta: { workspaceId: '', siteId: input.siteId, occurredAt: new Date() } });
    return { reservationId: reservation.id, status: reservation.status, expiresAt: reservation.expiresAt };
  }

  async confirmReservation(reservationId: string, _customerId: string) {
    const existing = await this.prisma.reservation.findUnique({ where: { id: reservationId } });
    if (existing?.status === 'confirmed') return existing;
    return this.prisma.reservation.update({ where: { id: reservationId }, data: { status: 'confirmed' } });
  }

  async cancelReservation(reservationId: string, actorId: string) {
    const res = await this.prisma.reservation.update({ where: { id: reservationId }, data: { status: 'cancelled' } });
    await this.audit.record({ action: 'reservation.cancelled', subjectType: 'Reservation', subjectId: reservationId, actorId, siteId: res.siteId });
    return res;
  }
}
