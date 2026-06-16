import { ForbiddenException, Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
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

  private encryptSecret(secret?: string) {
    if (!secret) return null;
    const keyMaterial = process.env.ACCESS_CREDENTIAL_ENCRYPTION_KEY ?? process.env.JWT_SECRET ?? 'dev-only-access-key';
    const key = crypto.createHash('sha256').update(keyMaterial).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
  }

  private async assertAgreementInOrganisation(agreementId: string, organisationId?: string) {
    if (!organisationId) return;
    const sites = await this.prisma.site.findMany({ where: { organisationId }, select: { id: true } });
    const agreement = await this.prisma.agreement.findFirst({
      where: { id: agreementId, siteId: { in: sites.map((site) => site.id) } },
      select: { id: true },
    });
    if (!agreement) throw new ForbiddenException('Agreement does not belong to this organisation');
  }

  async issueCredential(agreementId: string, credentialType: 'pin' | 'card' | 'app', releasePolicy = 'after_activation', organisationId?: string) {
    await this.assertAgreementInOrganisation(agreementId, organisationId);
    const agreement = await this.prisma.agreement.findUniqueOrThrow({ where: { id: agreementId } });
    const result = await this.adapter.issueCredential({ agreementId, credentialType, siteId: agreement.siteId, unitId: agreement.unitId });
    const credential = await this.prisma.accessCredential.create({ data: { agreementId, credentialType, externalRef: result.externalRef, maskedValue: result.maskedValue, encryptedValue: this.encryptSecret(result.secretValue), keyVersion: 'v1', status: 'active', releasePolicy, validFrom: agreement.effectiveFrom ?? new Date() } as any });
    await this.audit.record({ action: 'access.credential.issued', subjectType: 'AccessCredential', subjectId: credential.id, siteId: agreement.siteId });
    this.eventBus.emit({ type: Events.ACCESS_CREDENTIAL_ISSUED, payload: { agreementId, credentialId: credential.id, maskedValue: result.maskedValue }, meta: { workspaceId: '', siteId: agreement.siteId, occurredAt: new Date() } });
    return { credentialId: credential.id, maskedValue: result.maskedValue };
  }

  async releaseCredential(agreementId: string, organisationId?: string) {
    await this.assertAgreementInOrganisation(agreementId, organisationId);
    await this.prisma.accessCredential.findUniqueOrThrow({ where: { agreementId } });
    return this.prisma.accessCredential.update({
      where: { agreementId },
      data: { releasedAt: new Date(), releasedToTenant: true },
    });
  }

  async listCredentials(organisationId: string) {
    const sites = await this.prisma.site.findMany({ where: { organisationId }, select: { id: true } });
    const siteIds = sites.map((site) => site.id);
    const agreements = await this.prisma.agreement.findMany({
      where: { siteId: { in: siteIds }, deletedAt: null },
      select: { id: true, siteId: true, unitId: true, tenantId: true, status: true },
    });
    const agreementMap = new Map(agreements.map((agreement) => [agreement.id, agreement]));
    const credentials = await this.prisma.accessCredential.findMany({
      where: { agreementId: { in: agreements.map((agreement) => agreement.id) } },
      orderBy: { updatedAt: 'desc' },
    });
    return credentials.map((credential) => ({
      ...credential,
      agreement: agreementMap.get(credential.agreementId) ?? null,
    }));
  }

  async suspendCredential(agreementId: string, organisationId?: string) {
    await this.assertAgreementInOrganisation(agreementId, organisationId);
    const cred = await this.prisma.accessCredential.findUnique({ where: { agreementId } });
    if (!cred || cred.status === 'suspended') return;
    await this.adapter.revokeCredential(cred.externalRef!);
    await this.prisma.accessCredential.update({ where: { agreementId }, data: { status: 'suspended' } });
    this.eventBus.emit({ type: Events.ACCESS_LOCKOUT_ACTIVATED, payload: { agreementId }, meta: { workspaceId: '', occurredAt: new Date() } });
  }

  async restoreCredential(agreementId: string, organisationId?: string) {
    await this.assertAgreementInOrganisation(agreementId, organisationId);
    const cred = await this.prisma.accessCredential.findUnique({ where: { agreementId } });
    if (!cred || cred.status === 'active') return;
    await this.adapter.restoreCredential(cred.externalRef!);
    await this.prisma.accessCredential.update({ where: { agreementId }, data: { status: 'active' } });
    this.eventBus.emit({ type: Events.ACCESS_LOCKOUT_DEACTIVATED, payload: { agreementId }, meta: { workspaceId: '', occurredAt: new Date() } });
  }
}
