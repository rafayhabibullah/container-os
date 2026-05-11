import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainException, ErrorCodes } from '@sitelager/domain-types';

interface ChecklistItem { code: string; result: 'pass' | 'fail' | 'na'; note?: string; }

@Injectable()
export class InspectionService {
  constructor(private prisma: PrismaClient) {}

  async createInspectionRun(unitId: string, siteId: string, kind: string, checklist: ChecklistItem[], photoIds: string[] = []) {
    const template = await this.prisma.inspectionTemplate.findFirst({ where: { siteId, kind } });
    const overallResult = checklist.every((item) => item.result !== 'fail') ? 'pass' : 'fail';
    const run = await this.prisma.inspectionRun.create({ data: { unitId, templateId: template?.id, kind, result: overallResult, photoIds, completedAt: new Date() } });
    return { inspectionId: run.id, result: overallResult };
  }

  async assertMoveInInspectionComplete(unitId: string): Promise<void> {
    const completed = await this.prisma.inspectionRun.findFirst({ where: { unitId, kind: 'move_in', completedAt: { not: null } } });
    if (!completed) throw new DomainException(ErrorCodes.INSPECTION_REQUIRED, `Move-in inspection must be completed for unit ${unitId}`);
  }
}
