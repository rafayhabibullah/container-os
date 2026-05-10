import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Container OS database...');

  // ─── Sites ────────────────────────────────────────────────────────────────

  const site1 = await prisma.site.upsert({
    where: { slug: 'passau-hafen' },
    create: {
      name: 'Passau Hafen',
      slug: 'passau-hafen',
      timezone: 'Europe/Berlin',
      currency: 'EUR',
      address: {
        street: 'Hafenstraße 12',
        city: 'Passau',
        postalCode: '94032',
        country: 'DE',
      },
      accessHours: {
        monday:    { open: '06:00', close: '22:00' },
        tuesday:   { open: '06:00', close: '22:00' },
        wednesday: { open: '06:00', close: '22:00' },
        thursday:  { open: '06:00', close: '22:00' },
        friday:    { open: '06:00', close: '22:00' },
        saturday:  { open: '07:00', close: '20:00' },
        sunday:    { open: '08:00', close: '18:00' },
      },
      status: 'active',
    },
    update: {},
  });

  const site2 = await prisma.site.upsert({
    where: { slug: 'muenchen-nord' },
    create: {
      name: 'München Nord',
      slug: 'muenchen-nord',
      timezone: 'Europe/Berlin',
      currency: 'EUR',
      address: {
        street: 'Industriestraße 88',
        city: 'München',
        postalCode: '80939',
        country: 'DE',
      },
      accessHours: {
        monday:    { open: '00:00', close: '23:59' },
        tuesday:   { open: '00:00', close: '23:59' },
        wednesday: { open: '00:00', close: '23:59' },
        thursday:  { open: '00:00', close: '23:59' },
        friday:    { open: '00:00', close: '23:59' },
        saturday:  { open: '00:00', close: '23:59' },
        sunday:    { open: '00:00', close: '23:59' },
      },
      status: 'active',
    },
    update: {},
  });

  console.log(`✓ Sites: ${site1.name}, ${site2.name}`);

  // ─── Unit Types ───────────────────────────────────────────────────────────

  async function seedUnitTypes(siteId: string) {
    const types = await Promise.all([
      prisma.unitType.upsert({
        where: { id: `ut_${siteId}_10ft` },
        create: {
          id: `ut_${siteId}_10ft`,
          siteId,
          name: '10-Fuß Container',
          sizeSqm: 7.0,
          sizeCbm: 14.0,
          doorType: 'roll-up',
          features: ['driveUp', 'weatherSealed', 'groundLevel'],
        },
        update: {},
      }),
      prisma.unitType.upsert({
        where: { id: `ut_${siteId}_20ft` },
        create: {
          id: `ut_${siteId}_20ft`,
          siteId,
          name: '20-Fuß Container',
          sizeSqm: 14.0,
          sizeCbm: 28.0,
          doorType: 'roll-up',
          features: ['driveUp', 'weatherSealed', 'groundLevel'],
        },
        update: {},
      }),
      prisma.unitType.upsert({
        where: { id: `ut_${siteId}_40ft` },
        create: {
          id: `ut_${siteId}_40ft`,
          siteId,
          name: '40-Fuß Container',
          sizeSqm: 28.0,
          sizeCbm: 56.0,
          doorType: 'roll-up',
          features: ['driveUp', 'weatherSealed', 'groundLevel'],
        },
        update: {},
      }),
      prisma.unitType.upsert({
        where: { id: `ut_${siteId}_small` },
        create: {
          id: `ut_${siteId}_small`,
          siteId,
          name: 'Lagerbox Klein (5 m²)',
          sizeSqm: 5.0,
          sizeCbm: 12.5,
          doorType: 'swing',
          features: ['indoor', 'climateControlled'],
        },
        update: {},
      }),
      prisma.unitType.upsert({
        where: { id: `ut_${siteId}_medium` },
        create: {
          id: `ut_${siteId}_medium`,
          siteId,
          name: 'Lagerbox Mittel (10 m²)',
          sizeSqm: 10.0,
          sizeCbm: 25.0,
          doorType: 'swing',
          features: ['indoor', 'climateControlled'],
        },
        update: {},
      }),
    ]);
    return types;
  }

  const site1Types = await seedUnitTypes(site1.id);
  const site2Types = await seedUnitTypes(site2.id);
  console.log('✓ Unit types: 5 per site (10ft, 20ft, 40ft container + 2 indoor sizes)');

  // ─── Zones ────────────────────────────────────────────────────────────────

  const site1ZoneA = await prisma.zone.upsert({
    where: { id: `zone_${site1.id}_A` },
    create: { id: `zone_${site1.id}_A`, siteId: site1.id, name: 'Reihe A (Nord)', vehicleAccess: true },
    update: {},
  });
  const site1ZoneB = await prisma.zone.upsert({
    where: { id: `zone_${site1.id}_B` },
    create: { id: `zone_${site1.id}_B`, siteId: site1.id, name: 'Reihe B (Süd)', vehicleAccess: true },
    update: {},
  });
  const site1ZoneIndoor = await prisma.zone.upsert({
    where: { id: `zone_${site1.id}_indoor` },
    create: { id: `zone_${site1.id}_indoor`, siteId: site1.id, name: 'Innenbereich', vehicleAccess: false },
    update: {},
  });

  const site2ZoneA = await prisma.zone.upsert({
    where: { id: `zone_${site2.id}_A` },
    create: { id: `zone_${site2.id}_A`, siteId: site2.id, name: 'Block A', vehicleAccess: true },
    update: {},
  });
  const site2ZoneB = await prisma.zone.upsert({
    where: { id: `zone_${site2.id}_B` },
    create: { id: `zone_${site2.id}_B`, siteId: site2.id, name: 'Block B', vehicleAccess: true },
    update: {},
  });
  const site2ZoneIndoor = await prisma.zone.upsert({
    where: { id: `zone_${site2.id}_indoor` },
    create: { id: `zone_${site2.id}_indoor`, siteId: site2.id, name: 'Innenbereich', vehicleAccess: false },
    update: {},
  });

  console.log('✓ Zones: 3 per site (2 outdoor rows + 1 indoor)');

  // ─── Units ────────────────────────────────────────────────────────────────

  async function seedUnits(
    siteId: string,
    zones: { outdoor1: string; outdoor2: string; indoor: string },
    unitTypes: { t10ft: string; t20ft: string; t40ft: string; small: string; medium: string },
  ) {
    const units: Array<{
      id: string; siteId: string; zoneId: string; unitCode: string;
      unitTypeId: string; kind: 'container' | 'self_storage'; status: 'available' | 'occupied' | 'reserved' | 'maintenance';
      driveUp: boolean; position: object; conditionState: string;
    }> = [];

    // Zone A: 10x 10ft containers + 8x 20ft containers
    for (let i = 1; i <= 10; i++) {
      units.push({ id: `unit_${siteId}_A${i.toString().padStart(2, '0')}_10ft`, siteId, zoneId: zones.outdoor1, unitCode: `A${i.toString().padStart(2, '0')}`, unitTypeId: unitTypes.t10ft, kind: 'container', status: i <= 8 ? 'available' : 'occupied', driveUp: true, position: { row: 'A', index: i }, conditionState: 'good' });
    }
    for (let i = 11; i <= 18; i++) {
      units.push({ id: `unit_${siteId}_A${i}_20ft`, siteId, zoneId: zones.outdoor1, unitCode: `A${i}`, unitTypeId: unitTypes.t20ft, kind: 'container', status: i <= 15 ? 'available' : 'occupied', driveUp: true, position: { row: 'A', index: i }, conditionState: 'good' });
    }

    // Zone B: 6x 20ft + 4x 40ft containers
    for (let i = 1; i <= 6; i++) {
      units.push({ id: `unit_${siteId}_B${i.toString().padStart(2, '0')}_20ft`, siteId, zoneId: zones.outdoor2, unitCode: `B${i.toString().padStart(2, '0')}`, unitTypeId: unitTypes.t20ft, kind: 'container', status: 'available', driveUp: true, position: { row: 'B', index: i }, conditionState: 'good' });
    }
    for (let i = 7; i <= 10; i++) {
      units.push({ id: `unit_${siteId}_B${i}_40ft`, siteId, zoneId: zones.outdoor2, unitCode: `B${i.toString().padStart(2, '0')}`, unitTypeId: unitTypes.t40ft, kind: 'container', status: i === 10 ? 'maintenance' : 'available', driveUp: true, position: { row: 'B', index: i }, conditionState: i === 10 ? 'fair' : 'good' });
    }

    // Indoor: 10x small + 8x medium self-storage
    for (let i = 1; i <= 10; i++) {
      units.push({ id: `unit_${siteId}_IN_S${i.toString().padStart(2, '0')}`, siteId, zoneId: zones.indoor, unitCode: `IN-S${i.toString().padStart(2, '0')}`, unitTypeId: unitTypes.small, kind: 'self_storage', status: i <= 7 ? 'available' : 'occupied', driveUp: false, position: { building: 'indoor', shelf: i }, conditionState: 'excellent' });
    }
    for (let i = 1; i <= 8; i++) {
      units.push({ id: `unit_${siteId}_IN_M${i.toString().padStart(2, '0')}`, siteId, zoneId: zones.indoor, unitCode: `IN-M${i.toString().padStart(2, '0')}`, unitTypeId: unitTypes.medium, kind: 'self_storage', status: i <= 5 ? 'available' : 'occupied', driveUp: false, position: { building: 'indoor', shelf: i + 10 }, conditionState: 'excellent' });
    }

    // Upsert all units
    for (const unit of units) {
      await prisma.unit.upsert({
        where: { id: unit.id },
        create: unit,
        update: {},
      });
    }

    return units.length;
  }

  const site1UnitCount = await seedUnits(
    site1.id,
    { outdoor1: site1ZoneA.id, outdoor2: site1ZoneB.id, indoor: site1ZoneIndoor.id },
    { t10ft: site1Types[0].id, t20ft: site1Types[1].id, t40ft: site1Types[2].id, small: site1Types[3].id, medium: site1Types[4].id },
  );
  const site2UnitCount = await seedUnits(
    site2.id,
    { outdoor1: site2ZoneA.id, outdoor2: site2ZoneB.id, indoor: site2ZoneIndoor.id },
    { t10ft: site2Types[0].id, t20ft: site2Types[1].id, t40ft: site2Types[2].id, small: site2Types[3].id, medium: site2Types[4].id },
  );

  console.log(`✓ Units: ${site1UnitCount} at ${site1.name}, ${site2UnitCount} at ${site2.name}`);

  // ─── Price Books & Rate Rules ─────────────────────────────────────────────

  async function seedPricing(siteId: string, siteName: string, types: typeof site1Types) {
    const effectiveFrom = new Date('2026-06-01');
    const book = await prisma.priceBook.upsert({
      where: { id: `pb_${siteId}` },
      create: { id: `pb_${siteId}`, siteId, name: `${siteName} Standardpreise 2026`, status: 'published', effectiveFrom },
      update: {},
    });

    // Monthly rates (EUR cents): 10ft=6900, 20ft=11900, 40ft=18900, small=4900, medium=7900
    const rates = [
      { typeId: types[0].id, minor: 6900 },   // 10ft: €69/mo
      { typeId: types[1].id, minor: 11900 },  // 20ft: €119/mo
      { typeId: types[2].id, minor: 18900 },  // 40ft: €189/mo
      { typeId: types[3].id, minor: 4900 },   // small: €49/mo
      { typeId: types[4].id, minor: 7900 },   // medium: €79/mo
    ];

    for (const rate of rates) {
      await prisma.rateRule.upsert({
        where: { id: `rr_${siteId}_${rate.typeId}` },
        create: { id: `rr_${siteId}_${rate.typeId}`, priceBookId: book.id, unitTypeId: rate.typeId, amountMinor: rate.minor, billingCycle: 'monthly' },
        update: {},
      });
    }

    return book;
  }

  await seedPricing(site1.id, site1.name, site1Types);
  await seedPricing(site2.id, site2.name, site2Types);
  console.log('✓ Price books: published with 5 rate rules per site');

  // ─── Fee Schedules ────────────────────────────────────────────────────────

  await prisma.feeSchedule.upsert({
    where: { siteId: site1.id },
    create: { siteId: site1.id, depositMinor: 9900, lateFeePolicy: { days: 14, feeMinor: 2500 }, adminFeeMinor: 0 },
    update: {},
  });
  await prisma.feeSchedule.upsert({
    where: { siteId: site2.id },
    create: { siteId: site2.id, depositMinor: 9900, lateFeePolicy: { days: 14, feeMinor: 2500 }, adminFeeMinor: 0 },
    update: {},
  });
  console.log('✓ Fee schedules: €99 deposit, €25 late fee after 14 days');

  // ─── Tax Profiles ─────────────────────────────────────────────────────────

  for (const siteId of [site1.id, site2.id]) {
    await prisma.taxProfile.upsert({
      where: { id: `tax_${siteId}_std` },
      create: { id: `tax_${siteId}_std`, siteId, taxCode: 'DE_STD', vatRate: 0.19 },
      update: {},
    });
  }
  console.log('✓ Tax profiles: 19% MwSt (DE_STD) per site');

  // ─── Delinquency Policies ─────────────────────────────────────────────────

  await prisma.delinquencyPolicy.upsert({
    where: { siteId: site1.id },
    create: { siteId: site1.id, overdueDays: 14, lockoutEnabled: true, lateFeeRules: [{ daysOverdue: 14, feeMinor: 2500 }] },
    update: {},
  });
  await prisma.delinquencyPolicy.upsert({
    where: { siteId: site2.id },
    create: { siteId: site2.id, overdueDays: 14, lockoutEnabled: true, lateFeeRules: [{ daysOverdue: 14, feeMinor: 2500 }] },
    update: {},
  });
  console.log('✓ Delinquency policies: lockout after 14 days, €25 late fee');

  // ─── Reminder Policies ────────────────────────────────────────────────────

  await prisma.reminderPolicy.upsert({
    where: { siteId: site1.id },
    create: { siteId: site1.id, steps: [{ dayOffset: 3, channel: 'email' }, { dayOffset: 7, channel: 'email' }, { dayOffset: 10, channel: 'email' }] },
    update: {},
  });
  await prisma.reminderPolicy.upsert({
    where: { siteId: site2.id },
    create: { siteId: site2.id, steps: [{ dayOffset: 3, channel: 'email' }, { dayOffset: 7, channel: 'email' }, { dayOffset: 10, channel: 'email' }] },
    update: {},
  });
  console.log('✓ Reminder policies: 3 email reminders at days 3, 7, 10');

  // ─── Promotions ───────────────────────────────────────────────────────────

  for (const siteId of [site1.id, site2.id]) {
    await prisma.promotion.upsert({
      where: { id: `promo_${siteId}_summer` },
      create: { id: `promo_${siteId}_summer`, siteId, code: 'SOMMER25', discountType: 'percentage', value: 25, stackingPolicy: 'none', validFrom: new Date('2026-06-01'), validTo: new Date('2026-08-31') },
      update: {},
    });
    await prisma.promotion.upsert({
      where: { id: `promo_${siteId}_new` },
      create: { id: `promo_${siteId}_new`, siteId, code: 'NEUMIETER15', discountType: 'percentage', value: 15, stackingPolicy: 'none', validFrom: new Date('2026-01-01') },
      update: {},
    });
  }
  console.log('✓ Promotions: SOMMER25 (25% off, summer 2026), NEUMIETER15 (15% off, open-ended)');

  // ─── Notification Templates ───────────────────────────────────────────────

  const notificationTemplates = [
    // invoice.overdue
    { channel: 'email', locale: 'de', eventType: 'invoice.overdue', subject: 'Zahlungserinnerung — Rechnung {{number}}', body: '<p>Sehr geehrte/r {{name}},</p><p>Ihre Rechnung <strong>{{number}}</strong> ist überfällig. Bitte begleichen Sie den ausstehenden Betrag, um den Zugang zu Ihrem Lagerraum zu erhalten.</p><p>Mit freundlichen Grüßen,<br>Container OS</p>' },
    { channel: 'email', locale: 'en', eventType: 'invoice.overdue', subject: 'Payment reminder — Invoice {{number}}', body: '<p>Dear {{name}},</p><p>Your invoice <strong>{{number}}</strong> is overdue. Please settle the outstanding amount to maintain access to your storage unit.</p><p>Best regards,<br>Container OS</p>' },
    // invoice.paid
    { channel: 'email', locale: 'de', eventType: 'invoice.paid', subject: 'Zahlung eingegangen — Rechnung {{number}}', body: '<p>Ihre Zahlung wurde erfolgreich verarbeitet. Ihr Zugang ist wiederhergestellt.</p>' },
    { channel: 'email', locale: 'en', eventType: 'invoice.paid', subject: 'Payment received — Invoice {{number}}', body: '<p>Your payment has been successfully processed. Your access has been restored.</p>' },
    // agreement.activated
    { channel: 'email', locale: 'de', eventType: 'agreement.activated', subject: 'Willkommen — Ihr Mietvertrag ist aktiv', body: '<p>Herzlich Willkommen! Ihr Mietvertrag ist jetzt aktiv. Ihre Zugangsdaten erhalten Sie in einer separaten E-Mail.</p>' },
    { channel: 'email', locale: 'en', eventType: 'agreement.activated', subject: 'Welcome — Your rental agreement is active', body: '<p>Welcome! Your rental agreement is now active. You will receive your access credentials in a separate email.</p>' },
    // access.credential.issued
    { channel: 'email', locale: 'de', eventType: 'access.credential.issued', subject: 'Ihre Zugangsdaten', body: '<p>Ihre Zugangsdaten: <strong>{{credential}}</strong></p><p>Bitte halten Sie diese vertraulich.</p>' },
    { channel: 'email', locale: 'en', eventType: 'access.credential.issued', subject: 'Your access credentials', body: '<p>Your access credentials: <strong>{{credential}}</strong></p><p>Please keep these confidential.</p>' },
    // access.lockout.activated
    { channel: 'email', locale: 'de', eventType: 'access.lockout.activated', subject: 'Wichtig: Zugang gesperrt', body: '<p>Ihr Zugang wurde aufgrund ausstehender Zahlungen gesperrt. Bitte begleichen Sie Ihre offene Rechnung, um den Zugang wiederherzustellen.</p>' },
    { channel: 'email', locale: 'en', eventType: 'access.lockout.activated', subject: 'Important: Access suspended', body: '<p>Your access has been suspended due to outstanding payments. Please settle your invoice to restore access.</p>' },
  ];

  for (const tmpl of notificationTemplates) {
    await prisma.notificationTemplate.upsert({
      where: { channel_locale_eventType: { channel: tmpl.channel, locale: tmpl.locale, eventType: tmpl.eventType } },
      create: tmpl,
      update: {},
    });
  }
  console.log('✓ Notification templates: 10 (5 event types × de/en)');

  // ─── Inspection Templates ─────────────────────────────────────────────────

  for (const siteId of [site1.id, site2.id]) {
    await prisma.inspectionTemplate.upsert({
      where: { id: `insp_${siteId}_movein` },
      create: {
        id: `insp_${siteId}_movein`, siteId, kind: 'move_in',
        checklist: [
          { code: 'dry', label: 'Einheit trocken und schimmelfreilich?' },
          { code: 'door_seal', label: 'Türdichtung intakt?' },
          { code: 'lock', label: 'Schloss funktionsfähig?' },
          { code: 'floor', label: 'Boden sauber und unbeschädigt?' },
          { code: 'ventilation', label: 'Belüftung vorhanden und frei?' },
        ],
      },
      update: {},
    });
    await prisma.inspectionTemplate.upsert({
      where: { id: `insp_${siteId}_moveout` },
      create: {
        id: `insp_${siteId}_moveout`, siteId, kind: 'move_out',
        checklist: [
          { code: 'empty', label: 'Einheit vollständig geräumt?' },
          { code: 'clean', label: 'Einheit sauber und besenfrei?' },
          { code: 'damage', label: 'Keine neuen Schäden vorhanden?' },
          { code: 'door_seal', label: 'Türdichtung noch intakt?' },
        ],
      },
      update: {},
    });
  }
  console.log('✓ Inspection templates: move-in (5 items) + move-out (4 items) per site');

  // ─── Landing Page Config ──────────────────────────────────────────────────

  await prisma.landingPageConfig.upsert({
    where: { siteId: site1.id },
    create: {
      siteId: site1.id,
      heroContent: { headline: 'Sicherer Containerstellplatz in Passau', subline: 'Drive-up, 24/7 Zugang, flexibel kündbar', cta: 'Jetzt buchen' },
      faqBlocks: [
        { question: 'Welche Containergrößen sind verfügbar?', answer: '10-, 20- und 40-Fuß-Container sowie Innenboxen von 5–10 m².' },
        { question: 'Wie funktioniert der Zugang?', answer: 'Sie erhalten einen persönlichen PIN-Code oder digitales Zugangsmittel. Zugang möglich von 06:00–22:00 Uhr.' },
        { question: 'Wie lange ist die Kündigungsfrist?', answer: 'Monatliche Verträge mit 30 Tagen Kündigungsfrist zum Monatsende.' },
      ],
      seoMeta: { title: 'Containerlager Passau Hafen — Sicher & Günstig', description: 'Container und Lagerboxen in Passau mieten. Drive-up, 24/7 Zugang, SEPA-Lastschrift.' },
    },
    update: {},
  });

  await prisma.landingPageConfig.upsert({
    where: { siteId: site2.id },
    create: {
      siteId: site2.id,
      heroContent: { headline: '24/7 Containerlager München Nord', subline: 'Rund um die Uhr Zugang, sofort verfügbar', cta: 'Verfügbarkeit prüfen' },
      faqBlocks: [
        { question: 'Ist 24/7 Zugang möglich?', answer: 'Ja, München Nord ist rund um die Uhr zugänglich.' },
        { question: 'Gibt es Überwachung?', answer: 'Das Gelände ist videoüberwacht und eingezäunt.' },
      ],
      seoMeta: { title: 'Containerlager München Nord — 24/7 Zugang', description: 'Container mieten in München. 24/7 Zugang, Videoüberwachung, flexible Laufzeiten.' },
    },
    update: {},
  });
  console.log('✓ Landing page config: hero content, FAQs, SEO meta per site');

  // ─── Accounting Mappings ──────────────────────────────────────────────────

  for (const siteId of [site1.id, site2.id]) {
    await prisma.accountingMapping.upsert({
      where: { id: `acc_map_${siteId}_rent` },
      create: { id: `acc_map_${siteId}_rent`, siteId, revenueAccount: '8400', taxCode: 'DE_STD', costCenter: siteId === site1.id ? 'K001' : 'K002', effectiveFrom: new Date('2026-01-01') },
      update: {},
    });
  }
  console.log('✓ Accounting mappings: revenue account 8400, cost centers K001/K002');

  // ─── Summary ─────────────────────────────────────────────────────────────

  const [unitCount, siteCount, templateCount] = await Promise.all([
    prisma.unit.count(),
    prisma.site.count(),
    prisma.notificationTemplate.count(),
  ]);

  console.log('\n═══════════════════════════════════════');
  console.log(`Seed complete!`);
  console.log(`  Sites:                  ${siteCount}`);
  console.log(`  Units:                  ${unitCount}`);
  console.log(`  Notification templates: ${templateCount}`);
  console.log('═══════════════════════════════════════\n');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
