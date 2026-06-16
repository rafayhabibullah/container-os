import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AgreementsService } from '../agreements/agreements.service';
import { AccessControlService } from '../access-control/access-control.service';
import { InspectionService } from '../operations/inspection.service';

@Injectable()
export class RentalLifecycleService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly agreements: AgreementsService,
    private readonly access: AccessControlService,
    private readonly inspections: InspectionService,
  ) {}

  async readiness(agreementId: string) {
    const agreement = await this.prisma.agreement.findUniqueOrThrow({ where: { id: agreementId } });
    const [signatories, mandate, moveInInspection, credential, documents] = await Promise.all([
      this.prisma.signatory.findMany({ where: { agreementId } }),
      this.prisma.mandate.findFirst({ where: { customerId: agreement.tenantId, status: 'active' } }),
      this.prisma.inspectionRun.findFirst({ where: { unitId: agreement.unitId, kind: 'move_in', completedAt: { not: null } } }),
      this.prisma.accessCredential.findUnique({ where: { agreementId } }),
      this.prisma.document.findMany({ where: { subjectType: 'Agreement', subjectId: agreementId } }),
    ]);
    const signaturesComplete = signatories.length > 0 && signatories.every((s) => s.status === 'signed');
    return {
      agreementId,
      status: agreement.status,
      prerequisites: { signaturesComplete, activeMandate: Boolean(mandate), moveInInspectionComplete: Boolean(moveInInspection) },
      access: credential,
      documents,
      canActivate: signaturesComplete && Boolean(mandate),
    };
  }

  async activateAndRelease(agreementId: string, actorId: string, requireMoveInInspection = true) {
    const agreement = await this.prisma.agreement.findUniqueOrThrow({ where: { id: agreementId } });
    if (requireMoveInInspection) await this.inspections.assertMoveInInspectionComplete(agreement.unitId);
    const activated = agreement.status === 'active' ? agreement : await this.agreements.activateAgreement(agreementId, actorId);
    let credential = await this.prisma.accessCredential.findUnique({ where: { agreementId } });
    if (!credential) {
      await this.access.issueCredential(agreementId, 'pin');
      credential = await this.prisma.accessCredential.findUnique({ where: { agreementId } });
    }
    const released = credential?.releasedToTenant ? credential : await this.access.releaseCredential(agreementId);
    await this.prisma.unit.update({ where: { id: agreement.unitId }, data: { status: 'occupied' } });
    return { agreement: activated, credential: released, lifecycleStatus: 'active_with_access' };
  }

  async agreementDocuments(agreementId: string) {
    const agreement = await this.prisma.agreement.findUniqueOrThrow({ where: { id: agreementId } });
    const [documents, signatories, mandate, terminationRequests, inspections] = await Promise.all([
      this.prisma.document.findMany({ where: { subjectType: 'Agreement', subjectId: agreementId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.signatory.findMany({ where: { agreementId } }),
      this.prisma.mandate.findFirst({ where: { customerId: agreement.tenantId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.terminationRequest.findMany({ where: { agreementId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.inspectionRun.findMany({ where: { contractId: agreementId }, orderBy: { createdAt: 'desc' } }),
    ]);
    return { agreementId, documents, signatories, mandate, terminationRequests, inspections };
  }
}
