'use client';

import { useState, useEffect } from 'react';
import { useT } from '@/lib/i18n';
import SiteEditForm from './SiteEditForm';
import UnitTypesTab, { type UnitType } from './UnitTypesTab';
import UnitsTab from './UnitsTab';
import PricingTab from './PricingTab';

type Tab = 'unit-types' | 'units' | 'pricing';

interface Site {
  id: string; name: string; slug: string; status: 'active' | 'inactive';
  address: { street: string; city: string; postalCode: string; country: string };
  timezone: string;
}

interface Unit {
  id: string; unitCode: string; kind: string; status: string; driveUp: boolean;
  unitType: UnitType;
}

interface RateRule { id: string; unitTypeId: string; amountMinor: number; billingCycle: string; }
interface PriceBook { id: string; name: string; status: string; effectiveFrom: string; rules: RateRule[]; }
interface SiteSummary { id: string; name: string; }

interface Props {
  site: Site;
  unitTypes: UnitType[];
  units: Unit[];
  priceBooks: PriceBook[];
  otherSites: SiteSummary[];
  userRole: string;
}

export default function SiteDetailTabs({ site, unitTypes, units, priceBooks, otherSites, userRole }: Props) {
  const t = useT();
  const TABS: { key: Tab; label: string }[] = [
    { key: 'unit-types', label: t('dashboard.sites.tabs.unitTypes') },
    { key: 'units',      label: t('dashboard.sites.tabs.units')     },
    { key: 'pricing',    label: t('dashboard.sites.tabs.pricing')   },
  ];
  const [activeTab, setActiveTab]       = useState<Tab>('unit-types');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const syncTabFromHash = () => {
      const hash = window.location.hash.replace('#', '') as Tab;
      if (['unit-types', 'units', 'pricing'].includes(hash)) setActiveTab(hash);
    };
    syncTabFromHash();
    window.addEventListener('hashchange', syncTabFromHash);
    return () => window.removeEventListener('hashchange', syncTabFromHash);
  }, []);

  function handleTabClick(tab: Tab) {
    setActiveTab(tab);
    window.history.replaceState(null, '', `#${tab}`);
  }

  const hasUnitTypes = unitTypes.length > 0;
  const hasUnits     = units.length > 0;
  const hasPricing   = priceBooks.some(pb => pb.status === 'published');
  const showHint     = !hasUnitTypes || !hasUnits || !hasPricing;

  const canEdit = userRole === 'owner';

  const STEPS = [
    { label: t('dashboard.sites.tabs.stepAddUnitTypes'), done: hasUnitTypes, tab: 'unit-types' as Tab },
    { label: t('dashboard.sites.tabs.stepAddUnits'),     done: hasUnits,     tab: 'units'      as Tab },
    { label: t('dashboard.sites.tabs.stepSetPricing'),   done: hasPricing,   tab: 'pricing'    as Tab },
  ];

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Collapsible site settings */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', marginBottom: '20px', overflow: 'hidden' }}>
        <button onClick={() => setSettingsOpen(o => !o)}
          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>{t('dashboard.sites.tabs.siteSettings')}</span>
          <span style={{ fontSize: '12px', color: '#94a3b8', transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.15s' }}>▾</span>
        </button>
        {settingsOpen && (
          <div style={{ padding: '0 20px 20px' }}>
            <SiteEditForm site={site} />
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '2px solid #e2e8f0' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => handleTabClick(tab.key)}
            style={{
              background: 'none', border: 'none', borderBottom: activeTab === tab.key ? '2px solid #0f172a' : '2px solid transparent',
              marginBottom: '-2px', padding: '10px 18px', fontSize: '14px', fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? '#0f172a' : '#64748b', cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'color 0.12s',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Getting started hint */}
      {showHint && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '24px', alignItems: 'center', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{t('dashboard.sites.tabs.getStarted')}</span>
          {STEPS.map((step, i) => (
            <button key={step.tab} onClick={() => handleTabClick(step.tab)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '18px', height: '18px', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, background: step.done ? '#f0fdf4' : '#f1f5f9', color: step.done ? '#15803d' : '#94a3b8', border: `1px solid ${step.done ? '#bbf7d0' : '#e2e8f0'}`, flexShrink: 0 }}>
                {step.done ? '✓' : i + 1}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: step.done ? '#15803d' : '#475569', textDecoration: step.done ? 'line-through' : 'none', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {step.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'unit-types' && (
        <UnitTypesTab siteId={site.id} unitTypes={unitTypes} units={units} otherSites={otherSites} canEdit={canEdit} />
      )}
      {activeTab === 'units' && (
        <UnitsTab siteId={site.id} unitTypes={unitTypes} units={units} otherSites={otherSites} canEdit={canEdit} />
      )}
      {activeTab === 'pricing' && (
        <PricingTab siteId={site.id} unitTypes={unitTypes} priceBooks={priceBooks} otherSites={otherSites} canEdit={canEdit} />
      )}
    </div>
  );
}
