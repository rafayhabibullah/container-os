import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainException, ErrorCodes } from '@sitelager/domain-types';
import { AuditService } from '../audit/audit.service';
import { EventBusService } from '../../events/event-bus.service';
import { Events } from '../../events/domain-events';

interface DraftAgreementInput { reservationId: string; billingCycle: 'monthly' | 'fixed_term'; language: 'de' | 'en'; pricingSnapshot: object; terminationRules?: object; }

@Injectable()
export class AgreementsService {
  constructor(private prisma: PrismaClient, private audit: AuditService, private eventBus: EventBusService) {}

  async draftAgreement(input: DraftAgreementInput) {
    const reservation = await this.prisma.reservation.findUniqueOrThrow({ where: { id: input.reservationId } });
    const terminationRules = input.terminationRules ?? (input.billingCycle === 'monthly' ? { noticeDays: 30 } : { noticeDays: 30, minimumMonths: 3 });
    const agreement = await this.prisma.agreement.create({ data: { reservationId: input.reservationId, tenantId: reservation.customerId, unitId: reservation.unitId, siteId: reservation.siteId, billingCycle: input.billingCycle, language: input.language, pricingSnapshot: input.pricingSnapshot, terminationRules } });
    await this.audit.record({ action: 'agreement.drafted', subjectType: 'Agreement', subjectId: agreement.id, siteId: reservation.siteId });
    return { agreementId: agreement.id, status: agreement.status };
  }

  async activateAgreement(agreementId: string, actorId: string) {
    const agreement = await this.prisma.agreement.findUniqueOrThrow({ where: { id: agreementId } });
    const signatories = await this.prisma.signatory.findMany({ where: { agreementId } });
    if (!signatories.length || !signatories.every((s) => s.status === 'signed')) throw new DomainException(ErrorCodes.AGREEMENT_PREREQUISITE_MISSING, 'All signatories must sign before activation');
    const mandate = await this.prisma.mandate.findFirst({ where: { customerId: agreement.tenantId, status: 'active' } });
    if (!mandate) throw new DomainException(ErrorCodes.MANDATE_INCOMPLETE, 'Active payment mandate required');
    const activated = await this.prisma.agreement.update({ where: { id: agreementId }, data: { status: 'active', effectiveFrom: new Date() } });
    await this.audit.record({ action: 'agreement.activated', subjectType: 'Agreement', subjectId: agreementId, actorId, siteId: agreement.siteId });
    this.eventBus.emit({ type: Events.AGREEMENT_ACTIVATED, payload: { agreementId, tenantId: agreement.tenantId, unitId: agreement.unitId, siteId: agreement.siteId, billingCycle: agreement.billingCycle, pricingSnapshot: agreement.pricingSnapshot }, meta: { workspaceId: '', siteId: agreement.siteId, actorId, occurredAt: new Date() } });
    return activated;
  }

  async signAgreement(agreementId: string, personId: string) {
    await this.prisma.signatory.create({ data: { agreementId, personId, status: 'signed', signedAt: new Date() } });
    const signatories = await this.prisma.signatory.findMany({ where: { agreementId } });
    if (signatories.every((s) => s.status === 'signed')) await this.prisma.agreement.update({ where: { id: agreementId }, data: { status: 'signed' } });
    return { agreementId, signed: true };
  }

  async requestMoveOut(agreementId: string, requestedDate: Date) {
    return this.prisma.terminationRequest.create({ data: { agreementId, requestedDate, status: 'pending' } });
  }
}
