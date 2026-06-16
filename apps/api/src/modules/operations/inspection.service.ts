import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DomainException, ErrorCodes } from '@sitelager/domain-types';
import { OperationsService } from './operations.service';
import { DocumentsService } from '../documents/documents.service';

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

interface CompleteInspectionInput {
  checklist: ChecklistItem[];
  notes?: string;
  photoIds?: string[];
  depositDeduction?: number;
}

@Injectable()
export class InspectionService {
  constructor(
    private prisma: PrismaClient,
    @Inject(forwardRef(() => OperationsService)) private operations: OperationsService,
    private documents: DocumentsService,
  ) {}

  private async createTasksForFailedItems(params: { runId: string; siteId: string; unitId?: string; checklist: ChecklistItem[] }) {
    const failed = params.checklist.filter((item) => item.result === 'fail');
    for (const item of failed) {
      await this.operations.createTask({
        siteId: params.siteId,
        unitId: params.unitId,
        title: `Inspection issue: ${item.label || item.code}`,
        priority: 'normal',
        subjectRef: `InspectionRun:${params.runId}:${item.code}`,
      });
    }
  }

  private buildInspectionReport(params: { runId: string; kind: string; result: string; checklist: ChecklistItem[]; completedAt: Date }): Buffer {
    const lines = [
      `Inspection Report`,
      `Run ID: ${params.runId}`,
      `Kind: ${params.kind}`,
      `Overall result: ${params.result}`,
      `Completed at: ${params.completedAt.toISOString()}`,
      ``,
      `Checklist:`,
      ...params.checklist.map((item) => `- [${item.result.toUpperCase()}] ${item.label || item.code}${item.note ? ` (${item.note})` : ''}`),
    ];
    return Buffer.from(lines.join('\n'), 'utf-8');
  }

  private async generateInspectionReport(params: { runId: string; kind: string; result: string; checklist: ChecklistItem[]; completedAt: Date }) {
    const buffer = this.buildInspectionReport(params);
    return this.documents.storeGeneratedDocument({
      subjectType: 'InspectionRun',
      subjectId: params.runId,
      kind: 'inspection_report',
      buffer,
      fileName: `inspection-report-${params.runId}.txt`,
    });
  }

  private async generateDepositDeductionNotice(params: { agreementId: string; runId: string; depositDeduction: number; notes?: string }) {
    return this.documents.storeGeneratedDocument({
      subjectType: 'Agreement',
      subjectId: params.agreementId,
      kind: 'deposit_deduction_notice',
      fileName: `deposit-deduction-${params.runId}.txt`,
      contentType: 'text/plain',
      buffer: Buffer.from([
        'Deposit Deduction Notice',
        `Agreement: ${params.agreementId}`,
        `Inspection: ${params.runId}`,
        `Deduction: EUR ${params.depositDeduction.toFixed(2)}`,
        params.notes ? `Notes: ${params.notes}` : null,
      ].filter(Boolean).join('\n'), 'utf-8'),
    });
  }

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

    if (kind === 'move_out') {
      const newStatus = overallResult === 'pass' ? 'available' : 'maintenance';
      await this.prisma.unit.update({ where: { id: unitId }, data: { status: newStatus as any } });
    }

    await this.createTasksForFailedItems({ runId: run.id, siteId, unitId, checklist });
    const report = await this.generateInspectionReport({ runId: run.id, kind, result: overallResult, checklist, completedAt: run.completedAt ?? new Date() });
    await this.prisma.inspectionRun.update({ where: { id: run.id }, data: { reportDocumentId: report.id } });
    if (kind === 'move_out' && contractId && depositDeduction && depositDeduction > 0) {
      await this.generateDepositDeductionNotice({ agreementId: contractId, runId: run.id, depositDeduction, notes });
    }

    return { inspectionId: run.id, result: overallResult };
  }

  async completeInspectionRun(id: string, input: CompleteInspectionInput) {
    const { checklist, notes, photoIds = [], depositDeduction } = input;

    const existing = await this.prisma.inspectionRun.findUniqueOrThrow({ where: { id } });
    if (existing.completedAt) {
      throw new BadRequestException(`Inspection ${id} is already completed`);
    }
    const overallResult = checklist.every((item) => item.result !== 'fail') ? 'pass' : 'fail';

    const run = await this.prisma.inspectionRun.update({
      where: { id },
      data: {
        checklist: checklist as any,
        notes,
        photoIds,
        depositDeduction,
        result: overallResult,
        completedAt: new Date(),
      },
    });

    if (existing.kind === 'move_out') {
      const newStatus = overallResult === 'pass' ? 'available' : 'maintenance';
      await this.prisma.unit.update({ where: { id: existing.unitId }, data: { status: newStatus as any } });
    }

    const unit = await this.prisma.unit.findUnique({ where: { id: existing.unitId } });
    await this.createTasksForFailedItems({ runId: run.id, siteId: unit?.siteId ?? '', unitId: existing.unitId, checklist });
    const report = await this.generateInspectionReport({ runId: run.id, kind: existing.kind, result: overallResult, checklist, completedAt: run.completedAt ?? new Date() });
    await this.prisma.inspectionRun.update({ where: { id: run.id }, data: { reportDocumentId: report.id } });
    if (existing.kind === 'move_out' && existing.contractId && depositDeduction && depositDeduction > 0) {
      await this.generateDepositDeductionNotice({ agreementId: existing.contractId, runId: run.id, depositDeduction, notes });
    }

    return { inspectionId: run.id, result: overallResult };
  }

  async assertMoveInInspectionComplete(unitId: string): Promise<void> {
    const completed = await this.prisma.inspectionRun.findFirst({ where: { unitId, kind: 'move_in', completedAt: { not: null } } });
    if (!completed) throw new DomainException(ErrorCodes.INSPECTION_REQUIRED, `Move-in inspection must be completed for unit ${unitId}`);
  }
}
