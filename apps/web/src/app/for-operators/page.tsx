import Link from 'next/link';
import { BarChart2, FileText, Users, Globe, Zap, Shield } from 'lucide-react';
import { getT } from '@/lib/get-locale';
import { BrandLogo } from '@/components/brand-logo';

export default function ForOperatorsPage() {
  const t = getT();

  const FEATURES = [
    { icon: Globe, title: t('forOperators.features.marketplace.title'), desc: t('forOperators.features.marketplace.desc') },
    { icon: Users, title: t('forOperators.features.tenantManagement.title'), desc: t('forOperators.features.tenantManagement.desc') },
    { icon: FileText, title: t('forOperators.features.billing.title'), desc: t('forOperators.features.billing.desc') },
    { icon: BarChart2, title: t('forOperators.features.reporting.title'), desc: t('forOperators.features.reporting.desc') },
    { icon: Zap, title: t('forOperators.features.instantBooking.title'), desc: t('forOperators.features.instantBooking.desc') },
    { icon: Shield, title: t('forOperators.features.accessControl.title'), desc: t('forOperators.features.accessControl.desc') },
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <BrandLogo href="/" compact />
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900">{t('forOperators.nav.signIn')}</Link>
            <Link href="/register" className="text-sm bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg hover:bg-blue-700">
              {t('forOperators.nav.startFree')}
            </Link>
          </div>
        </div>
      </header>

      <section className="py-20 px-6 bg-slate-50 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            {t('forOperators.hero.title')}
          </h1>
          <p className="text-lg text-slate-500 mb-8">
            {t('forOperators.hero.subtitle')}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/register"
              className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700">
              {t('forOperators.hero.getStarted')}
            </Link>
            <Link href="/pricing"
              className="border border-slate-200 text-slate-700 font-medium px-6 py-3 rounded-xl hover:bg-slate-50">
              {t('forOperators.hero.viewPricing')}
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">{t('forOperators.features.title')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <f.icon className="w-6 h-6 text-blue-600 mb-3" />
                <h3 className="font-semibold text-slate-900 mb-1">{f.title}</h3>
                <p className="text-sm text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-blue-600 text-white text-center">
        <h2 className="text-2xl font-bold mb-3">{t('forOperators.ctaSection.title')}</h2>
        <p className="text-blue-100 mb-6 text-sm">{t('forOperators.ctaSection.subtitle')}</p>
        <Link href="/register"
          className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-xl hover:bg-blue-50">
          {t('forOperators.ctaSection.cta')}
        </Link>
      </section>

      <footer className="border-t border-slate-100 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-6 justify-between text-sm text-slate-400">
          <BrandLogo href="/" compact markClassName="h-7 w-7" />
          <div className="flex gap-6">
            <Link href="/pricing" className="hover:text-slate-700">{t('forOperators.footer.pricing')}</Link>
            <Link href="/legal/privacy" className="hover:text-slate-700">{t('forOperators.footer.privacy')}</Link>
            <Link href="/legal/terms" className="hover:text-slate-700">{t('forOperators.footer.terms')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
