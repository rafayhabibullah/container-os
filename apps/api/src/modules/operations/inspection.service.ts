import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainException, ErrorCodes } from '@sitelager/domain-types';

interface ChecklistItem { code: string; label: string; result: 'pass' | 'fail' | 'na'; note?: string; }

interface CreateInspectionInput {
  unitId: string;
  siteId: string;
  kind: string;
  checklist: ChecklistItem[];
  photoIds?: string[];
  notes?: string;
  contractId?: string;
  depositDeduction?: number;
}

@Injectable()
export class InspectionService {
  constructor(private prisma: PrismaClient) {}

  async createInspectionRun(input: CreateInspectionInput) {
    const { unitId, siteId, kind, checklist, photoIds = [], notes, contractId, depositDeduction } = input;

    const template = await this.prisma.inspectionTemplate.findFirst({ where: { siteId, kind } });
    const overallResult = checklist.every((item) => item.result !== 'fail') ? 'pass' : 'fail';

    const run = await this.prisma.inspectionRun.create({
      data: {
        unitId,
        templateId: template?.id,
        contractId,
        kind,
        result: overallResult,
        checklist: checklist as any,
        notes,
        depositDeduction,
        photoIds,
        completedAt: new Date(),
      },
    });

    // Fix 5: move_out inspection affects unit status
    if (kind === 'move_out') {
      const newStatus = overallResult === 'pass' ? 'available' : 'maintenance';
      await this.prisma.unit.update({ where: { id: unitId }, data: { status: newStatus as any } });
    }

    return { inspectionId: run.id, result: overallResult };
  }

  async assertMoveInInspectionComplete(unitId: string): Promise<void> {
    const completed = await this.prisma.inspectionRun.findFirst({ where: { unitId, kind: 'move_in', completedAt: { not: null } } });
    if (!completed) throw new DomainException(ErrorCodes.INSPECTION_REQUIRED, `Move-in inspection must be completed for unit ${unitId}`);
  }
}
