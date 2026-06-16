import { Injectable, Optional } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { InvoiceRunService } from '../billing/invoice-run.service';
import { DelinquencyService } from '../billing/delinquency.service';
import { ReportingService } from '../reporting/reporting.service';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaClient,
    @Optional() private readonly invoiceRuns?: InvoiceRunService,
    @Optional() private readonly delinquency?: DelinquencyService,
    @Optional() private readonly reporting?: ReportingService,
  ) {}

  enqueue(kind: string, payload: object, options?: { runAt?: Date; maxAttempts?: number }) {
    return this.prisma.backgroundJob.create({ data: { kind, payload, runAt: options?.runAt, maxAttempts: options?.maxAttempts } });
  }

  async claimNext(kinds?: string[]) {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.backgroundJob.findFirst({
        where: { status: 'queued', runAt: { lte: new Date() }, ...(kinds?.length ? { kind: { in: kinds } } : {}) },
        orderBy: [{ runAt: 'asc' }, { createdAt: 'asc' }],
      });
      if (!job) return null;
      return tx.backgroundJob.update({ where: { id: job.id }, data: { status: 'running', lockedAt: new Date(), attempts: { increment: 1 } } });
    });
  }

  complete(id: string) {
    return this.prisma.backgroundJob.update({ where: { id }, data: { status: 'completed', completedAt: new Date(), lockedAt: null, lastError: null } });
  }

  async fail(id: string, error: unknown, retryDelayMs = 60_000) {
    const job = await this.prisma.backgroundJob.findUniqueOrThrow({ where: { id } });
    const retry = job.attempts < job.maxAttempts;
    return this.prisma.backgroundJob.update({
      where: { id },
      data: { status: retry ? 'queued' : 'failed', runAt: retry ? new Date(Date.now() + retryDelayMs) : job.runAt, lockedAt: null, lastError: error instanceof Error ? error.message : String(error) },
    });
  }

  retry(id: string) {
    return this.prisma.backgroundJob.update({ where: { id }, data: { status: 'queued', runAt: new Date(), lockedAt: null, completedAt: null, lastError: null } });
  }

  listFailed() {
    return this.prisma.backgroundJob.findMany({ where: { status: 'failed' }, orderBy: { updatedAt: 'desc' }, take: 100 });
  }

  async processNext(kinds?: string[]) {
    const job = await this.claimNext(kinds);
    if (!job) return { processed: false };
    try {
      const payload = job.payload as Record<string, any>;
      let result: unknown = { ok: true };
      switch (job.kind) {
        case 'invoice.run':
          if (!this.invoiceRuns) throw new Error('InvoiceRunService is not configured');
          result = await this.invoiceRuns.runForDate(payload.runDate ? new Date(payload.runDate) : new Date(), payload.organisationId);
          break;
        case 'delinquency.check': {
          if (!this.delinquency) throw new Error('DelinquencyService is not configured');
          const siteIds = payload.siteId
            ? [payload.siteId]
            : (await this.prisma.site.findMany({ where: { organisationId: payload.organisationId }, select: { id: true } })).map((site) => site.id);
          for (const siteId of siteIds) await this.delinquency.checkOverdueInvoices(siteId);
          result = { checkedSites: siteIds.length };
          break;
        }
        case 'report.executive.snapshot':
          if (!this.reporting) throw new Error('ReportingService is not configured');
          result = await this.reporting.getExecutiveReport(payload.organisationId, payload.from, payload.to, payload.siteId);
          await this.prisma.reportRun.create({
            data: { kind: job.kind, params: payload, status: 'completed', result: result as any },
          });
          break;
        default:
          throw new Error(`Unsupported job kind: ${job.kind}`);
      }
      await this.complete(job.id);
      return { processed: true, jobId: job.id, kind: job.kind, result };
    } catch (error) {
      await this.fail(job.id, error);
      return { processed: true, jobId: job.id, kind: job.kind, failed: true, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
