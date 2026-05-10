import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AccessVendorAdapter, ACCESS_VENDOR_ADAPTER } from './adapters/access-vendor.adapter';
import { AuditService } from '../audit/audit.service';
import { EventBusService } from '../../events/event-bus.service';
import { Events } from '../../events/domain-events';

@Injectable()
export class AccessControlService implements OnModuleInit {
  constructor(
    private prisma: PrismaClient,
    @Inject(ACCESS_VENDOR_ADAPTER) private adapter: AccessVendorAdapter,
    private audit: AuditService,
    private eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.eventBus.on(Events.AGREEMENT_ACTIVATED, async (event: any) => { await this.issueCredential(event.payload.agreementId, 'pin'); });
    this.eventBus.on(Events.INVOICE_OVERDUE, async (event: any) => {
      const agreements = await this.prisma.agreement.findMany({ where: { tenantId: event.payload.tenantId, status: 'active' } });
      for (const agr of agreements) await this.suspendCredential(agr.id);
    });
    this.eventBus.on(Events.INVOICE_PAID, async (event: any) => {
      const agreements = await this.prisma.agreement.findMany({ where: { tenantId: event.payload.tenantId ?? '', status: 'active' } });
      for (const agr of agreements) await this.restoreCredential(agr.id);
    });
  }

  async issueCredential(agreementId: string, credentialType: 'pin' | 'card' | 'app') {
    const agreement = await this.prisma.agreement.findUniqueOrThrow({ where: { id: agreementId } });
    const result = await this.adapter.issueCredential({ agreementId, credentialType, siteId: agreement.siteId, unitId: agreement.unitId });
    const credential = await this.prisma.accessCredential.create({ data: { agreementId, credentialType, externalRef: result.externalRef, maskedValue: result.maskedValue, status: 'active' } });
    await this.audit.record({ action: 'access.credential.issued', subjectType: 'AccessCredential', subjectId: credential.id, siteId: agreement.siteId });
    this.eventBus.emit({ type: Events.ACCESS_CREDENTIAL_ISSUED, payload: { agreementId, credentialId: credential.id, maskedValue: result.maskedValue }, meta: { workspaceId: '', siteId: agreement.siteId, occurredAt: new Date() } });
    return { credentialId: credential.id, maskedValue: result.maskedValue };
  }

  async suspendCredential(agreementId: string) {
    const cred = await this.prisma.accessCredential.findUnique({ where: { agreementId } });
    if (!cred || cred.status === 'suspended') return;
    await this.adapter.revokeCredential(cred.externalRef!);
    await this.prisma.accessCredential.update({ where: { agreementId }, data: { status: 'suspended' } });
    this.eventBus.emit({ type: Events.ACCESS_LOCKOUT_ACTIVATED, payload: { agreementId }, meta: { workspaceId: '', occurredAt: new Date() } });
  }

  async restoreCredential(agreementId: string) {
    const cred = await this.prisma.accessCredential.findUnique({ where: { agreementId } });
    if (!cred || cred.status === 'active') return;
    await this.adapter.restoreCredential(cred.externalRef!);
    await this.prisma.accessCredential.update({ where: { agreementId }, data: { status: 'active' } });
    this.eventBus.emit({ type: Events.ACCESS_LOCKOUT_DEACTIVATED, payload: { agreementId }, meta: { workspaceId: '', occurredAt: new Date() } });
  }
}
