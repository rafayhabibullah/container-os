import Link from 'next/link';
import { CalendarDays, Download, FileText, Gauge, ReceiptText } from 'lucide-react';
import { requireAuth } from '@/lib/auth';
import { serverFetch } from '@/lib/server-api';
import { getT } from '@/lib/get-locale';
import { PlanSwitchButton } from './plan-switch-button';
import { CheckoutStarter } from './CheckoutStarter';
import { CheckoutReturn } from './CheckoutReturn';

interface OrgProfile {
  id: string;
  legalName: string;
  plan: string;
}

interface PlanUsage {
  plan: string;
  sites: { used: number; limit: number };
  units: { used: number; limit: number };
}

interface Subscription {
  plan: string;
  status: string;
  billingInterval: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  lastPaymentStatus: string | null;
}

interface SubscriptionInvoice {
  id: string;
  invoiceNumber: string;
  plan: string;
  billingInterval: string;
  billingReason: string;
  status: string;
  currency: string;
  totalMinor: number;
  netMinor: number;
  vatMinor: number;
  periodStart: string;
  periodEnd: string;
  invoiceDate: string;
  dueDate: string;
  paidAt: string | null;
}

interface BillingOverview {
  subscription: Subscription | null;
  invoices: SubscriptionInvoice[];
  totals: {
    paidMinor: number;
    outstandingMinor: number;
    paidInvoiceCount: number;
    invoiceCount: number;
  };
  nextCharge: { date: string; estimatedAmountMinor: number; currency: string } | null;
  billingPolicy: { type: 'calendar_month' | 'anniversary_month' | 'annual_anniversary'; firstPeriodProrated: boolean } | null;
}

const PLAN_DETAILS: Record<string, { key: string; monthlyMinor: number; sites: number; units: number; commission: string }> = {
  free: { key: 'free', monthlyMinor: 0, sites: 1, units: 10, commission: '7%' },
  starter: { key: 'starter', monthlyMinor: 4900, sites: 1, units: 50, commission: '5%' },
  professional: { key: 'professional', monthlyMinor: 14900, sites: 5, units: 500, commission: '3.5%' },
  enterprise: { key: 'enterprise', monthlyMinor: 39900, sites: Infinity, units: Infinity, commission: '2%' },
};

const statusClasses: Record<string, string> = {
  paid: 'border-green-200 bg-green-50 text-green-700',
  active: 'border-green-200 bg-green-50 text-green-700',
  open: 'border-amber-200 bg-amber-50 text-amber-800',
  pending_payment: 'border-amber-200 bg-amber-50 text-amber-800',
  failed: 'border-red-200 bg-red-50 text-red-700',
  payment_failed: 'border-red-200 bg-red-50 text-red-700',
  past_due: 'border-red-200 bg-red-50 text-red-700',
};

export default async function BillingContent({
  searchParams,
}: {
  searchParams: { checkout?: string; plan?: string; interval?: string };
}) {
  const user = await requireAuth();
  const t = getT();
  const [org, usage, overview] = await Promise.all([
    serverFetch<OrgProfile>(`/v1/organisations/${user.organisationId}`).catch(() => null),
    serverFetch<PlanUsage>(`/v1/organisations/${user.organisationId}/usage`).catch(() => null),
    serverFetch<BillingOverview>(`/v1/organisations/${user.organisationId}/subscription/overview`).catch(() => null),
  ]);

  const subscription = overview?.subscription ?? null;
  const invoices = overview?.invoices ?? [];
  const plan = subscription?.plan ?? org?.plan ?? 'free';
  const details = PLAN_DETAILS[plan] ?? PLAN_DETAILS.free;
  const subscriptionStatus = subscription?.status ?? (plan === 'free' ? 'active' : 'billing_setup_required');
  const selectedInterval = searchParams.interval === 'yearly' ? 'yearly' : 'monthly';
  const money = (minor: number, currency = 'EUR') => new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(minor / 100);
  const date = (value: string | Date) => new Date(value).toLocaleDateString('de-DE');
  const serviceEnd = (value: string) => date(new Date(new Date(value).getTime() - 24 * 60 * 60 * 1000));
  const currentPrice = subscription?.billingInterval === 'yearly' ? details.monthlyMinor * 10 : details.monthlyMinor;
  const currentPriceSuffix = subscription?.billingInterval === 'yearly'
    ? t('dashboard.billing.perYear')
    : t('dashboard.billing.perMonth');

  const totals = overview?.totals ?? {
    paidMinor: invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.totalMinor, 0),
    outstandingMinor: 0,
    paidInvoiceCount: invoices.filter((invoice) => invoice.status === 'paid').length,
    invoiceCount: invoices.length,
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">{t('dashboard.billing.title')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('dashboard.billing.subtitle')}</p>
        </div>
        <a href="#available-plans" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
          {t('dashboard.billing.managePlan')}
        </a>
      </div>

      {searchParams.checkout === 'return' && <CheckoutReturn />}
      {searchParams.plan && searchParams.plan !== 'free' && (
        <CheckoutStarter plan={searchParams.plan} billingInterval={selectedInterval} />
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: ReceiptText, label: t('dashboard.billing.totalPaid'), value: money(totals.paidMinor) },
          { icon: FileText, label: t('dashboard.billing.paidInvoices'), value: String(totals.paidInvoiceCount) },
          { icon: CalendarDays, label: t('dashboard.billing.nextBilling'), value: overview?.nextCharge ? date(overview.nextCharge.date) : t('dashboard.billing.noCharge') },
          { icon: Gauge, label: t('dashboard.billing.nextCharge'), value: overview?.nextCharge ? money(overview.nextCharge.estimatedAmountMinor, overview.nextCharge.currency) : money(0) },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
              <Icon className="h-4 w-4" />
            </div>
            <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">{t('dashboard.billing.currentPlan')}</p>
              <div className="mt-2 flex items-center gap-2">
                <h3 className="text-2xl font-extrabold text-slate-900">{t(`dashboard.billing.plans.${details.key}`)}</h3>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses[subscriptionStatus] ?? 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                  {t(`dashboard.billing.statuses.${subscriptionStatus}`)}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-600">{money(currentPrice)} {currentPriceSuffix}</p>
            </div>
            {subscription && (
              <div className="text-right text-xs text-slate-500">
                <p className="font-bold text-slate-700">{t('dashboard.billing.currentServicePeriod')}</p>
                <p className="mt-1">{date(subscription.currentPeriodStart)} - {serviceEnd(subscription.currentPeriodEnd)}</p>
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-3">
            {[
              { label: t('dashboard.billing.sitesIncluded'), value: Number.isFinite(details.sites) ? String(details.sites) : t('dashboard.billing.usage.unlimited') },
              { label: t('dashboard.billing.unitsIncluded'), value: Number.isFinite(details.units) ? String(details.units) : t('dashboard.billing.usage.unlimited') },
              { label: t('dashboard.billing.marketplaceCommission'), value: details.commission },
            ].map((item) => (
              <div key={item.label} className="rounded-md bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase text-slate-400">{item.label}</p>
                <p className="mt-1 text-lg font-extrabold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>

          {usage && (
            <div className="mt-5 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
              {[
                { label: t('dashboard.billing.usage.sites'), data: usage.sites },
                { label: t('dashboard.billing.usage.units'), data: usage.units },
              ].map(({ label, data }) => {
                const ratio = Number.isFinite(data.limit) && data.limit > 0 ? Math.min(100, Math.round(data.used / data.limit * 100)) : 0;
                return (
                  <div key={label}>
                    <div className="mb-2 flex justify-between text-xs font-bold text-slate-600">
                      <span>{label}</span>
                      <span>{data.used} {t('dashboard.billing.usage.of')} {Number.isFinite(data.limit) ? data.limit : t('dashboard.billing.usage.unlimited')}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-blue-600" style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="rounded-lg border border-blue-200 bg-blue-50 p-5">
          <CalendarDays className="h-5 w-5 text-blue-700" />
          <h3 className="mt-3 text-sm font-extrabold text-slate-900">{t('dashboard.billing.billingPolicyTitle')}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {!subscription && plan !== 'free'
              ? t('dashboard.billing.setupPolicyBody')
              : overview?.billingPolicy?.type === 'annual_anniversary'
              ? t('dashboard.billing.annualPolicyBody')
              : overview?.billingPolicy?.type === 'anniversary_month'
                ? t('dashboard.billing.anniversaryPolicyBody')
                : t('dashboard.billing.calendarPolicyBody')}
          </p>
        </aside>
      </div>

      <section className="mb-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{t('dashboard.billing.invoiceHistory')}</h3>
            <p className="mt-1 text-xs text-slate-500">{t('dashboard.billing.invoiceHistorySubtitle')}</p>
          </div>
          <span className="text-xs font-bold text-slate-400">{totals.invoiceCount}</span>
        </div>

        {invoices.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FileText className="mx-auto h-6 w-6 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-500">{t('dashboard.billing.noInvoices')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-3">{t('dashboard.billing.invoice')}</th>
                  <th className="px-5 py-3">{t('dashboard.billing.servicePeriod')}</th>
                  <th className="px-5 py-3">{t('dashboard.billing.amount')}</th>
                  <th className="px-5 py-3">{t('dashboard.billing.status')}</th>
                  <th className="px-5 py-3 text-right">{t('dashboard.billing.document')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="text-sm font-extrabold text-slate-900">{invoice.invoiceNumber}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <span>{date(invoice.invoiceDate)}</span>
                        {invoice.billingReason === 'initial_proration' && (
                          <span className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 font-bold text-blue-700">{t('dashboard.billing.prorated')}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{date(invoice.periodStart)} - {serviceEnd(invoice.periodEnd)}</td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-extrabold text-slate-900">{money(invoice.totalMinor, invoice.currency)}</p>
                      <p className="mt-1 text-xs text-slate-400">{t('dashboard.billing.includingVat')}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusClasses[invoice.status] ?? 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                        {t(`dashboard.billing.statuses.${invoice.status}`)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <a
                        href={`/api/billing/subscription-invoices/${invoice.id}/pdf`}
                        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        <Download className="h-4 w-4" />
                        {t('dashboard.billing.download')}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="available-plans" className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{t('dashboard.billing.availablePlans')}</h3>
            <p className="mt-1 text-xs text-slate-500">{t('dashboard.billing.planPricesIncludeVat')}</p>
          </div>
          <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1">
            <Link href="/settings/billing?interval=monthly#available-plans" className={`rounded px-3 py-1.5 text-xs font-bold ${selectedInterval === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              {t('dashboard.billing.interval.monthly')}
            </Link>
            <Link href="/settings/billing?interval=yearly#available-plans" className={`rounded px-3 py-1.5 text-xs font-bold ${selectedInterval === 'yearly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              {t('dashboard.billing.interval.yearly')}
            </Link>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {Object.entries(PLAN_DETAILS).map(([key, item]) => {
            const isCurrent = key === plan && Boolean(subscription) && (key === 'free' || subscription?.billingInterval === selectedInterval);
            const intervalPrice = selectedInterval === 'yearly' ? item.monthlyMinor * 10 : item.monthlyMinor;
            return (
              <div key={key} className={`flex flex-wrap items-center justify-between gap-4 px-5 py-4 ${isCurrent ? 'bg-slate-50' : ''}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-extrabold text-slate-900">{t(`dashboard.billing.plans.${item.key}`)}</p>
                    {selectedInterval === 'yearly' && key !== 'free' && (
                      <span className="rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-xs font-bold text-green-700">{t('dashboard.billing.twoMonthsFree')}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {Number.isFinite(item.sites)
                      ? `${t(item.sites === 1 ? 'dashboard.billing.sites' : 'dashboard.billing.sites_plural', { count: String(item.sites) })} · ${t('dashboard.billing.units', { count: String(item.units) })}`
                      : t('dashboard.billing.usage.unlimited')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="min-w-28 text-right text-sm font-extrabold text-slate-900">
                    {money(intervalPrice)} {selectedInterval === 'yearly' ? t('dashboard.billing.perYear') : t('dashboard.billing.perMonth')}
                  </p>
                  {isCurrent ? (
                    <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">{t('dashboard.billing.current')}</span>
                  ) : (
                    <PlanSwitchButton
                      plan={key}
                      planLabel={t(`dashboard.billing.plans.${item.key}`)}
                      billingInterval={key === 'free' ? 'monthly' : selectedInterval}
                      style={{ fontSize: '12px', fontWeight: 700, color: '#334155', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '7px 12px', cursor: 'pointer' }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
