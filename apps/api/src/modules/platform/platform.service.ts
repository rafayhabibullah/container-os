import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaClient, private readonly jobs: JobsService) {}

  async dashboard() {
    const [organisations, sites, units, activeAgreements, failedJobs, subscriptions] = await Promise.all([
      this.prisma.organisation.count(), this.prisma.site.count({ where: { deletedAt: null } }),
      this.prisma.unit.count({ where: { deletedAt: null } }), this.prisma.agreement.count({ where: { status: 'active' } }),
      this.prisma.backgroundJob.count({ where: { status: 'failed' } }),
      this.prisma.organisationSubscription.groupBy({ by: ['status'], _count: true }),
    ]);
    return { organisations, sites, units, activeAgreements, failedJobs, subscriptions };
  }

  listOrganisations() {
    return this.prisma.organisation.findMany({ include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 }, _count: { select: { sites: true, members: true } } }, orderBy: { createdAt: 'desc' } });
  }

  listFailedJobs() {
    return this.jobs.listFailed();
  }

  retryJob(id: string) {
    return this.jobs.retry(id);
  }

  upsertFlag(key: string, enabled: boolean, scope?: object) {
    return this.prisma.platformFeatureFlag.upsert({ where: { key }, create: { key, enabled, scope }, update: { enabled, scope } });
  }

  listFlags() {
    return this.prisma.platformFeatureFlag.findMany({ orderBy: { key: 'asc' } });
  }

  grantSupportAccess(actorId: string, organisationId: string, reason: string, expiresAt: Date) {
    return this.prisma.platformSupportAccess.create({ data: { actorId, organisationId, reason, expiresAt } });
  }
}
