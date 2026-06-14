import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { resolveDateRange } from './dto/report-query.dto';

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaClient) {}

  private async getSites(orgId: string): Promise<{ id: string; name: string }[]> {
    return this.prisma.site.findMany({ where: { organisationId: orgId }, select: { id: true, name: true } });
  }

  async getOccupancyReport(orgId: string) {
    const sites = await this.getSites(orgId);
    return Promise.all(sites.map(async ({ id: siteId, name: siteName }) => {
      const grouped = await this.prisma.unit.groupBy({ by: ['status'], where: { siteId, deletedAt: null }, _count: { status: true } });
      const total = grouped.reduce((s, g) => s + g._count.status, 0);
      const occupied = grouped.find((g) => g.status === 'occupied')?._count.status ?? 0;

      const units = await this.prisma.unit.findMany({ where: { siteId, deletedAt: null }, select: { status: true, unitType: { select: { id: true, name: true, sizeSqm: true } } } });
      const byType = new Map<string, { unitTypeId: string; unitTypeName: string; sizeSqm: number; totalUnits: number; occupiedUnits: number }>();
      for (const u of units) {
        const key = u.unitType.id;
        if (!byType.has(key)) byType.set(key, { unitTypeId: key, unitTypeName: u.unitType.name, sizeSqm: u.unitType.sizeSqm, totalUnits: 0, occupiedUnits: 0 });
        const entry = byType.get(key)!;
        entry.totalUnits += 1;
        if (u.status === 'occupied') entry.occupiedUnits += 1;
      }

      return {
        siteId,
        siteName,
        occupancyPct: total > 0 ? Math.round((occupied / total) * 1000) / 10 : 0,
        totalUnits: total,
        occupiedUnits: occupied,
        byUnitType: Array.from(byType.values()).map((t) => ({ ...t, occupancyPct: t.totalUnits > 0 ? Math.round((t.occupiedUnits / t.totalUnits) * 1000) / 10 : 0 })),
      };
    }));
  }

  async getRevenueReport(orgId: string, fromStr?: string, toStr?: string) {
    const sites = await this.getSites(orgId);
    const siteIds = sites.map((s) => s.id);
    const { from, to } = resolveDateRange(fromStr, toStr);

    const invoices = await this.prisma.invoice.findMany({
      where: { siteId: { in: siteIds }, status: 'paid', invoiceDate: { gte: from, lte: to } },
      select: { siteId: true, totalMinor: true, invoiceDate: true, payments: { select: { method: true, status: true, amountMinor: true } } },
    });

    const bySite = new Map<string, number>();
    const byMonth = new Map<string, number>();
    const byPaymentMethod = new Map<string, number>();
    for (const inv of invoices) {
      bySite.set(inv.siteId, (bySite.get(inv.siteId) ?? 0) + inv.totalMinor);
      const monthKey = `${inv.invoiceDate.getUTCFullYear()}-${String(inv.invoiceDate.getUTCMonth() + 1).padStart(2, '0')}`;
      byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + inv.totalMinor);
      for (const p of inv.payments) {
        if (p.status === 'succeeded') byPaymentMethod.set(p.method, (byPaymentMethod.get(p.method) ?? 0) + p.amountMinor);
      }
    }

    const sites_ = sites.map((s) => ({ siteId: s.id, totalMinor: bySite.get(s.id) ?? 0, currency: 'EUR' }));
    const byMonthArr = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, totalMinor]) => ({ month, totalMinor }));
    const byPaymentMethodArr = Array.from(byPaymentMethod.entries()).map(([method, totalMinor]) => ({ method, totalMinor }));

    return { sites: sites_, byMonth: byMonthArr, byPaymentMethod: byPaymentMethodArr };
  }

  async getDelinquencyReport(orgId: string, fromStr?: string, toStr?: string) {
    const siteIds = (await this.getSites(orgId)).map((s) => s.id);
    const { to } = resolveDateRange(fromStr, toStr);

    const overdue = await this.prisma.invoice.findMany({
      where: { siteId: { in: siteIds }, status: { in: ['overdue', 'pending'] }, dueDate: { lt: to } },
      select: { id: true, totalMinor: true, dueDate: true, agreement: { select: { tenantId: true } } },
    });

    const byCustomer = new Map<string, { customerId: string; buckets: Record<string, number>; total: number }>();
    for (const inv of overdue) {
      const days = Math.floor((to.getTime() - inv.dueDate.getTime()) / (24 * 60 * 60 * 1000));
      if (days <= 0) continue;
      const bucket = days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '90+';
      const customerId = inv.agreement.tenantId;
      if (!byCustomer.has(customerId)) byCustomer.set(customerId, { customerId, buckets: { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }, total: 0 });
      const entry = byCustomer.get(customerId)!;
      entry.buckets[bucket] += inv.totalMinor;
      entry.total += inv.totalMinor;
    }

    return Array.from(byCustomer.values());
  }

  async getChurnReport(orgId: string, fromStr?: string, toStr?: string) {
    const siteIds = (await this.getSites(orgId)).map((s) => s.id);
    const { from, to } = resolveDateRange(fromStr, toStr);

    const terminated = await this.prisma.agreement.findMany({
      where: { siteId: { in: siteIds }, status: 'terminated', updatedAt: { gte: from, lte: to } },
      select: {
        id: true,
        tenantId: true,
        unitId: true,
        siteId: true,
        updatedAt: true,
        amendments: { where: { type: 'termination' }, select: { data: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    return {
      count: terminated.length,
      agreements: terminated.map((a) => ({
        agreementId: a.id,
        tenantId: a.tenantId,
        unitId: a.unitId,
        siteId: a.siteId,
        terminatedAt: a.updatedAt,
        reason: (a.amendments[0]?.data as any)?.reason ?? null,
      })),
    };
  }

  async getLeadConversionReport(orgId: string, fromStr?: string, toStr?: string) {
    const siteIds = (await this.getSites(orgId)).map((s) => s.id);
    const { from, to } = resolveDateRange(fromStr, toStr);

    const leads = await this.prisma.lead.findMany({
      where: { siteId: { in: siteIds }, createdAt: { gte: from, lte: to }, deletedAt: null },
      select: { status: true, source: true },
    });

    const byStatus = new Map<string, number>();
    const bySource = new Map<string, { source: string; total: number; converted: number }>();
    for (const lead of leads) {
      byStatus.set(lead.status, (byStatus.get(lead.status) ?? 0) + 1);
      if (!bySource.has(lead.source)) bySource.set(lead.source, { source: lead.source, total: 0, converted: 0 });
      const entry = bySource.get(lead.source)!;
      entry.total += 1;
      if (lead.status === 'converted') entry.converted += 1;
    }

    const total = leads.length;
    const converted = byStatus.get('converted') ?? 0;
    return {
      total,
      converted,
      conversionRatePct: total > 0 ? Math.round((converted / total) * 1000) / 10 : 0,
      byStatus: Array.from(byStatus.entries()).map(([status, count]) => ({ status, count })),
      bySource: Array.from(bySource.values()).map((s) => ({ ...s, conversionRatePct: s.total > 0 ? Math.round((s.converted / s.total) * 1000) / 10 : 0 })),
    };
  }

  async getMandateStatusReport(orgId: string) {
    const siteIds = (await this.getSites(orgId)).map((s) => s.id);

    const mandates = await this.prisma.mandate.findMany({
      where: { deletedAt: null, customer: { agreements: { some: { siteId: { in: siteIds } } } } },
      select: { status: true, scheme: true },
    });

    const grouped = new Map<string, { status: string; scheme: string; count: number }>();
    for (const m of mandates) {
      const key = `${m.status}:${m.scheme}`;
      if (!grouped.has(key)) grouped.set(key, { status: m.status, scheme: m.scheme, count: 0 });
      grouped.get(key)!.count += 1;
    }

    return Array.from(grouped.values());
  }

  async getInspectionsReport(orgId: string, fromStr?: string, toStr?: string) {
    const siteIds = (await this.getSites(orgId)).map((s) => s.id);
    const { from, to } = resolveDateRange(fromStr, toStr);
    const unitIds = (await this.prisma.unit.findMany({ where: { siteId: { in: siteIds } }, select: { id: true } })).map((u) => u.id);

    const runs = await this.prisma.inspectionRun.findMany({
      where: { unitId: { in: unitIds }, completedAt: { gte: from, lte: to } },
      select: { result: true, checklist: true },
    });

    let passed = 0;
    let failed = 0;
    let failedChecklistItems = 0;
    let tasksCreated = 0;
    for (const run of runs) {
      if (run.result === 'pass') passed += 1;
      else if (run.result === 'fail') {
        failed += 1;
        tasksCreated += 1;
      }
      const checklist = run.checklist as any;
      if (Array.isArray(checklist)) {
        failedChecklistItems += checklist.filter((item: any) => item?.passed === false).length;
      }
    }

    return { total: runs.length, passed, failed, failedChecklistItems, tasksCreated };
  }

  async getOperationsReport(orgId: string, fromStr?: string, toStr?: string) {
    const siteIds = (await this.getSites(orgId)).map((s) => s.id);
    const { from, to } = resolveDateRange(fromStr, toStr);

    const [tasksByPriority, tasksByType, incidentsByStatus] = await this.prisma.$transaction([
      this.prisma.task.groupBy({ by: ['priority', 'status'], where: { siteId: { in: siteIds }, createdAt: { gte: from, lte: to } }, _count: { _all: true }, orderBy: { priority: 'asc' } }),
      this.prisma.task.groupBy({ by: ['type', 'status'], where: { siteId: { in: siteIds }, createdAt: { gte: from, lte: to } }, _count: { _all: true }, orderBy: { type: 'asc' } }),
      this.prisma.incident.groupBy({ by: ['status', 'severity'], where: { siteId: { in: siteIds }, createdAt: { gte: from, lte: to } }, _count: { _all: true }, orderBy: { status: 'asc' } }),
    ]);

    return {
      tasksByPriority: tasksByPriority.map((t: any) => ({ priority: t.priority, status: t.status, count: t._count._all })),
      tasksByType: tasksByType.map((t: any) => ({ type: t.type, status: t.status, count: t._count._all })),
      incidentsByStatus: incidentsByStatus.map((i: any) => ({ status: i.status, severity: i.severity, count: i._count._all })),
    };
  }

  async getPaymentsReport(orgId: string, fromStr?: string, toStr?: string) {
    const siteIds = (await this.getSites(orgId)).map((s) => s.id);
    const { from, to } = resolveDateRange(fromStr, toStr);

    const attempts = await this.prisma.paymentAttempt.findMany({
      where: { createdAt: { gte: from, lte: to }, payment: { invoice: { siteId: { in: siteIds } } } },
      select: { status: true, provider: true, payment: { select: { amountMinor: true } } },
    });

    const grouped = new Map<string, { status: string; provider: string; count: number; totalMinor: number }>();
    for (const a of attempts) {
      const key = `${a.status}:${a.provider}`;
      if (!grouped.has(key)) grouped.set(key, { status: a.status, provider: a.provider, count: 0, totalMinor: 0 });
      const entry = grouped.get(key)!;
      entry.count += 1;
      entry.totalMinor += a.payment.amountMinor;
    }

    return Array.from(grouped.values());
  }
}
