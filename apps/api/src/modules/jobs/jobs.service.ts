import { Injectable, Optional } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { InvoiceRunService } from '../billing/invoice-run.service';
import { DelinquencyService } from '../billing/delinquency.service';
import { ReportingService } from '../reporting/reporting.service';
import { EmailService } from '../notifications/email.service';
import { MollieAdapter } from '../payments/mollie.adapter';
import { RentalLifecycleService } from '../rental-lifecycle/rental-lifecycle.service';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaClient,
    @Optional() private readonly invoiceRuns?: InvoiceRunService,
    @Optional() private readonly delinquency?: DelinquencyService,
    @Optional() private readonly reporting?: ReportingService,
    @Optional() private readonly email?: EmailService,
    @Optional() private readonly mollie?: MollieAdapter,
    @Optional() private readonly lifecycle?: RentalLifecycleService,
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

  private async sendSavedSearchAlerts(payload: Record<string, any>) {
    if (!this.email) throw new Error('EmailService is not configured');
    const since = payload.since ? new Date(payload.since) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const savedSearches = await this.prisma.savedSearch.findMany({ where: { status: 'active' }, take: 500 });
    let sent = 0;
    for (const search of savedSearches) {
      const filters = search.filters as Record<string, any>;
      const listings = await this.prisma.listing.findMany({
        where: {
          status: 'published',
          createdAt: { gte: since },
          ...(search.city ? { site: { address: { path: ['city'], equals: search.city } } } : {}),
          ...(search.query ? {
            OR: [
              { title: { contains: search.query, mode: 'insensitive' } },
              { description: { contains: search.query, mode: 'insensitive' } },
            ],
          } : {}),
          ...(filters?.feature ? { unit: { unitType: { features: { has: filters.feature } } } } : {}),
        },
        include: { site: { select: { address: true } }, unit: { select: { unitType: true } } },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      if (listings.length === 0) continue;
      const links = listings.map((listing) => `<li><a href="${process.env.APP_URL ?? 'http://localhost:3001'}/storage/${listing.slug}">${listing.title}</a></li>`).join('');
      await this.email.send({
        to: search.email,
        subject: `Neue SiteLager Angebote${search.city ? ` in ${search.city}` : ''}`,
        html: `<p>Wir haben neue passende Lagerangebote gefunden.</p><ul>${links}</ul>`,
      });
      await this.prisma.outboundMessage.create({
        data: { eventType: 'marketplace.saved_search.match', channel: 'email', status: 'sent', recipientId: search.email, sentAt: new Date() },
      });
      sent += 1;
    }
    return { savedSearches: savedSearches.length, sent };
  }

  private async reconcileMolliePayments(payload: Record<string, any>) {
    if (!this.mollie) throw new Error('MollieAdapter is not configured');
    const staleBefore = new Date(Date.now() - (payload.staleMinutes ?? 10) * 60 * 1000);
    const attempts = await this.prisma.paymentAttempt.findMany({
      where: {
        provider: 'mollie',
        status: { in: ['pending', 'pending_settlement'] },
        OR: [{ lastCheckedAt: null }, { lastCheckedAt: { lt: staleBefore } }],
      },
      include: { payment: true },
      take: payload.limit ?? 50,
      orderBy: { createdAt: 'asc' },
    });
    let updated = 0;
    for (const attempt of attempts) {
      const mollieStatus = await this.mollie.getPaymentStatus(attempt.providerRef);
      const mappedStatus = this.mollie.mapMollieStatus(mollieStatus);
      await this.prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: mappedStatus, lastCheckedAt: new Date() } });
      if (mappedStatus !== attempt.status) {
        await this.prisma.payment.update({ where: { id: attempt.paymentId }, data: { status: mappedStatus } });
        if (mappedStatus === 'succeeded') {
          if (this.delinquency) await this.delinquency.markPaid(attempt.payment.invoiceId);
          const invoice = await this.prisma.invoice.findUnique({ where: { id: attempt.payment.invoiceId }, select: { agreementId: true } });
          if (invoice) {
            await this.prisma.backgroundJob.create({
              data: { kind: 'rental.activate-ready', payload: { agreementId: invoice.agreementId, actorId: 'payment-reconciliation' } },
            });
          }
        }
        updated += 1;
      }
    }
    return { checked: attempts.length, updated };
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
        case 'marketplace.saved-search-alerts':
          result = await this.sendSavedSearchAlerts(payload);
          break;
        case 'payment.reconcile-mollie':
          result = await this.reconcileMolliePayments(payload);
          break;
        case 'rental.activate-ready':
          if (!this.lifecycle) throw new Error('RentalLifecycleService is not configured');
          result = await this.lifecycle.activateIfReady(payload.agreementId, payload.actorId ?? 'system');
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
