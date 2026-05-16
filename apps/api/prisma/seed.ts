import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function seedSiteConfig(
  siteId: string,
  siteName: string,
  opts: {
    costCenter: string;
    heroHeadline: string;
    heroSubline: string;
    heroCta: string;
    faqs: Array<{ question: string; answer: string }>;
    seoTitle: string;
    seoDescription: string;
  },
) {
  await prisma.feeSchedule.upsert({
    where: { siteId },
    create: { siteId, depositMinor: 9900, lateFeePolicy: { days: 14, feeMinor: 2500 }, adminFeeMinor: 0 },
    update: {},
  });
  await prisma.taxProfile.upsert({
    where: { id: `tax_${siteId}_std` },
    create: { id: `tax_${siteId}_std`, siteId, taxCode: 'DE_STD', vatRate: 0.19 },
    update: {},
  });
  await prisma.delinquencyPolicy.upsert({
    where: { siteId },
    create: { siteId, overdueDays: 14, lockoutEnabled: true, lateFeeRules: [{ daysOverdue: 14, feeMinor: 2500 }] },
    update: {},
  });
  await prisma.reminderPolicy.upsert({
    where: { siteId },
    create: { siteId, steps: [{ dayOffset: 3, channel: 'email' }, { dayOffset: 7, channel: 'email' }, { dayOffset: 10, channel: 'email' }] },
    update: {},
  });
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
  await prisma.landingPageConfig.upsert({
    where: { siteId },
    create: {
      siteId,
      heroContent: { headline: opts.heroHeadline, subline: opts.heroSubline, cta: opts.heroCta },
      faqBlocks: opts.faqs,
      seoMeta: { title: opts.seoTitle, description: opts.seoDescription },
    },
    update: {},
  });
  await prisma.accountingMapping.upsert({
    where: { id: `acc_map_${siteId}_rent` },
    create: { id: `acc_map_${siteId}_rent`, siteId, revenueAccount: '8400', taxCode: 'DE_STD', costCenter: opts.costCenter, effectiveFrom: new Date('2026-01-01') },
    update: {},
  });
  await prisma.inspectionTemplate.upsert({
    where: { id: `insp_${siteId}_movein` },
    create: {
      id: `insp_${siteId}_movein`, siteId, kind: 'move_in',
      checklist: [
        { code: 'dry', label: 'Unit dry and mould-free?' },
        { code: 'door_seal', label: 'Door seal intact?' },
        { code: 'lock', label: 'Lock functional?' },
        { code: 'floor', label: 'Floor clean and undamaged?' },
        { code: 'ventilation', label: 'Ventilation present and clear?' },
      ],
    },
    update: {},
  });
  await prisma.inspectionTemplate.upsert({
    where: { id: `insp_${siteId}_moveout` },
    create: {
      id: `insp_${siteId}_moveout`, siteId, kind: 'move_out',
      checklist: [
        { code: 'empty', label: 'Unit fully cleared?' },
        { code: 'clean', label: 'Unit clean and swept?' },
        { code: 'damage', label: 'No new damage present?' },
        { code: 'door_seal', label: 'Door seal still intact?' },
      ],
    },
    update: {},
  });
  console.log(`✓ Site config: ${siteName}`);
}

async function main() {
  console.log('Seeding SiteLager database...');

  // ─── Organisation & Owner User ────────────────────────────────────────────

  const org = await prisma.organisation.upsert({
    where: { slug: 'sitelager-demo' },
    create: {
      legalName: 'SiteLager Demo GmbH',
      tradingName: 'SiteLager',
      slug: 'sitelager-demo',
      countryCode: 'DE',
      defaultLanguage: 'de',
      currency: 'EUR',
      billingEmail: 'billing@sitelager.dev',
      supportEmail: 'support@sitelager.dev',
      status: 'active',
      plan: 'professional',
    },
    update: {},
  });

  const passwordHash = await bcrypt.hash('Test1234!', 12);

  const owner = await prisma.user.upsert({
    where: { email: 'owner@sitelager.dev' },
    create: {
      type: 'owner',
      email: 'owner@sitelager.dev',
      name: 'Demo Owner',
      passwordHash,
      status: 'active',
      mfaState: 'disabled',
    },
    update: { passwordHash },
  });

  await prisma.organisationMember.upsert({
    where: { organisationId_userId: { organisationId: org.id, userId: owner.id } },
    create: { organisationId: org.id, userId: owner.id, role: 'owner' },
    update: {},
  });

  console.log(`✓ Organisation: ${org.tradingName} (${org.slug})`);
  console.log(`✓ Owner user: ${owner.email} / Test1234!`);

  // ─── Sites ────────────────────────────────────────────────────────────────

  const site1 = await prisma.site.upsert({
    where: { slug: 'passau-hafen' },
    create: {
      name: 'Passau Hafen',
      slug: 'passau-hafen',
      organisationId: org.id,
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
    update: { organisationId: org.id },
  });

  const site2 = await prisma.site.upsert({
    where: { slug: 'muenchen-nord' },
    create: {
      name: 'München Nord',
      slug: 'muenchen-nord',
      organisationId: org.id,
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
    update: { organisationId: org.id },
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
    { channel: 'email', locale: 'de', eventType: 'invoice.overdue', subject: 'Zahlungserinnerung — Rechnung {{number}}', body: '<p>Sehr geehrte/r {{name}},</p><p>Ihre Rechnung <strong>{{number}}</strong> ist überfällig. Bitte begleichen Sie den ausstehenden Betrag, um den Zugang zu Ihrem Lagerraum zu erhalten.</p><p>Mit freundlichen Grüßen,<br>SiteLager</p>' },
    { channel: 'email', locale: 'en', eventType: 'invoice.overdue', subject: 'Payment reminder — Invoice {{number}}', body: '<p>Dear {{name}},</p><p>Your invoice <strong>{{number}}</strong> is overdue. Please settle the outstanding amount to maintain access to your storage unit.</p><p>Best regards,<br>SiteLager</p>' },
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
    // reservation.confirmed
    { channel: 'email', locale: 'de', eventType: 'reservation.confirmed', subject: 'Buchungsbestätigung — {{reservationId}}', body: '<p>Hallo {{name}},</p><p>Ihre Buchung wurde bestätigt. Reservierungs-ID: <strong>{{reservationId}}</strong>. Einzugsdatum: {{startDate}}.</p><p>Wir melden uns, um Ihren Vertrag und den Zugangscode zu arrangieren.</p><p>Mit freundlichen Grüßen,<br>SiteLager</p>' },
    { channel: 'email', locale: 'en', eventType: 'reservation.confirmed', subject: 'Booking confirmed — {{reservationId}}', body: '<p>Hi {{name}},</p><p>Your booking is confirmed. Reservation ID: <strong>{{reservationId}}</strong>. Move-in date: {{startDate}}.</p><p>We will be in touch to arrange your agreement and access.</p><p>Best regards,<br>SiteLager</p>' },
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

  // ─── Operator Users ───────────────────────────────────────────────────────

  const operatorPasswordHash = await bcrypt.hash('Test1234!', 12);

  const operator1 = await prisma.user.upsert({
    where: { email: 'operator@sitelager.dev' },
    create: { type: 'operator', email: 'operator@sitelager.dev', name: 'Anna Müller', passwordHash: operatorPasswordHash, status: 'active', mfaState: 'disabled' },
    update: { passwordHash: operatorPasswordHash },
  });

  await prisma.organisationMember.upsert({
    where: { organisationId_userId: { organisationId: org.id, userId: operator1.id } },
    create: { organisationId: org.id, userId: operator1.id, role: 'operator' },
    update: {},
  });

  console.log(`✓ Operator user: ${operator1.email}`);

  // ─── Org 2: NordLager GmbH ────────────────────────────────────────────────

  const org2 = await prisma.organisation.upsert({
    where: { slug: 'nordlager-demo' },
    create: {
      legalName: 'NordLager GmbH',
      tradingName: 'NordLager',
      slug: 'nordlager-demo',
      countryCode: 'DE',
      defaultLanguage: 'de',
      currency: 'EUR',
      billingEmail: 'billing@nordlager.dev',
      supportEmail: 'support@nordlager.dev',
      status: 'active',
      plan: 'professional',
    },
    update: {},
  });

  const owner2 = await prisma.user.upsert({
    where: { email: 'owner@nordlager.dev' },
    create: { type: 'owner', email: 'owner@nordlager.dev', name: 'NordLager Owner', passwordHash, status: 'active', mfaState: 'disabled' },
    update: { passwordHash },
  });

  await prisma.organisationMember.upsert({
    where: { organisationId_userId: { organisationId: org2.id, userId: owner2.id } },
    create: { organisationId: org2.id, userId: owner2.id, role: 'owner' },
    update: {},
  });

  const operator2 = await prisma.user.upsert({
    where: { email: 'operator@nordlager.dev' },
    create: { type: 'operator', email: 'operator@nordlager.dev', name: 'Lars Becker', passwordHash: operatorPasswordHash, status: 'active', mfaState: 'disabled' },
    update: { passwordHash: operatorPasswordHash },
  });

  await prisma.organisationMember.upsert({
    where: { organisationId_userId: { organisationId: org2.id, userId: operator2.id } },
    create: { organisationId: org2.id, userId: operator2.id, role: 'operator' },
    update: {},
  });

  console.log(`✓ Org 2: ${org2.tradingName} — owner: ${owner2.email}, operator: ${operator2.email}`);

  // ─── New Sites ────────────────────────────────────────────────────────────

  const siteFrankfurt = await prisma.site.upsert({
    where: { slug: 'frankfurt-westend' },
    create: {
      name: 'Frankfurt Westend',
      slug: 'frankfurt-westend',
      organisationId: org.id,
      timezone: 'Europe/Berlin',
      currency: 'EUR',
      address: { street: 'Mainzer Landstraße 200', city: 'Frankfurt am Main', postalCode: '60327', country: 'DE' },
      accessHours: {
        monday: { open: '07:00', close: '22:00' }, tuesday: { open: '07:00', close: '22:00' },
        wednesday: { open: '07:00', close: '22:00' }, thursday: { open: '07:00', close: '22:00' },
        friday: { open: '07:00', close: '22:00' }, saturday: { open: '08:00', close: '20:00' },
        sunday: null,
      },
      status: 'active',
    },
    update: { organisationId: org.id },
  });

  const siteBerlin = await prisma.site.upsert({
    where: { slug: 'berlin-mitte' },
    create: {
      name: 'Berlin Mitte',
      slug: 'berlin-mitte',
      organisationId: org2.id,
      timezone: 'Europe/Berlin',
      currency: 'EUR',
      address: { street: 'Alexanderstraße 5', city: 'Berlin', postalCode: '10179', country: 'DE' },
      accessHours: {
        monday: { open: '00:00', close: '23:59' }, tuesday: { open: '00:00', close: '23:59' },
        wednesday: { open: '00:00', close: '23:59' }, thursday: { open: '00:00', close: '23:59' },
        friday: { open: '00:00', close: '23:59' }, saturday: { open: '00:00', close: '23:59' },
        sunday: { open: '00:00', close: '23:59' },
      },
      status: 'active',
    },
    update: { organisationId: org2.id },
  });

  const siteHamburg = await prisma.site.upsert({
    where: { slug: 'hamburg-hafen' },
    create: {
      name: 'Hamburg Hafen',
      slug: 'hamburg-hafen',
      organisationId: org2.id,
      timezone: 'Europe/Berlin',
      currency: 'EUR',
      address: { street: 'Hafenstraße 34', city: 'Hamburg', postalCode: '20459', country: 'DE' },
      accessHours: {
        monday: { open: '06:00', close: '23:00' }, tuesday: { open: '06:00', close: '23:00' },
        wednesday: { open: '06:00', close: '23:00' }, thursday: { open: '06:00', close: '23:00' },
        friday: { open: '06:00', close: '23:00' }, saturday: { open: '06:00', close: '23:00' },
        sunday: { open: '06:00', close: '23:00' },
      },
      status: 'active',
    },
    update: { organisationId: org2.id },
  });

  const siteKoeln = await prisma.site.upsert({
    where: { slug: 'koeln-ehrenfeld' },
    create: {
      name: 'Köln Ehrenfeld',
      slug: 'koeln-ehrenfeld',
      organisationId: org2.id,
      timezone: 'Europe/Berlin',
      currency: 'EUR',
      address: { street: 'Venloer Straße 140', city: 'Köln', postalCode: '50672', country: 'DE' },
      accessHours: {
        monday: { open: '07:00', close: '21:00' }, tuesday: { open: '07:00', close: '21:00' },
        wednesday: { open: '07:00', close: '21:00' }, thursday: { open: '07:00', close: '21:00' },
        friday: { open: '07:00', close: '21:00' }, saturday: { open: '08:00', close: '19:00' },
        sunday: { open: '09:00', close: '17:00' },
      },
      status: 'active',
    },
    update: { organisationId: org2.id },
  });

  console.log(`✓ New sites: ${siteFrankfurt.name}, ${siteBerlin.name}, ${siteHamburg.name}, ${siteKoeln.name}`);

  // ─── Unit Types, Zones, Units, Pricing for New Sites ─────────────────────

  const frankfurtTypes = await seedUnitTypes(siteFrankfurt.id);
  const berlinTypes    = await seedUnitTypes(siteBerlin.id);
  const hamburgTypes   = await seedUnitTypes(siteHamburg.id);
  const koelnTypes     = await seedUnitTypes(siteKoeln.id);

  // Zones — Frankfurt
  const fkZoneA      = await prisma.zone.upsert({ where: { id: `zone_${siteFrankfurt.id}_A` }, create: { id: `zone_${siteFrankfurt.id}_A`, siteId: siteFrankfurt.id, name: 'Block A', vehicleAccess: true }, update: {} });
  const fkZoneB      = await prisma.zone.upsert({ where: { id: `zone_${siteFrankfurt.id}_B` }, create: { id: `zone_${siteFrankfurt.id}_B`, siteId: siteFrankfurt.id, name: 'Block B', vehicleAccess: true }, update: {} });
  const fkZoneIndoor = await prisma.zone.upsert({ where: { id: `zone_${siteFrankfurt.id}_indoor` }, create: { id: `zone_${siteFrankfurt.id}_indoor`, siteId: siteFrankfurt.id, name: 'Indoor', vehicleAccess: false }, update: {} });

  // Zones — Berlin
  const blZoneA      = await prisma.zone.upsert({ where: { id: `zone_${siteBerlin.id}_A` }, create: { id: `zone_${siteBerlin.id}_A`, siteId: siteBerlin.id, name: 'North Wing', vehicleAccess: true }, update: {} });
  const blZoneB      = await prisma.zone.upsert({ where: { id: `zone_${siteBerlin.id}_B` }, create: { id: `zone_${siteBerlin.id}_B`, siteId: siteBerlin.id, name: 'South Wing', vehicleAccess: true }, update: {} });
  const blZoneIndoor = await prisma.zone.upsert({ where: { id: `zone_${siteBerlin.id}_indoor` }, create: { id: `zone_${siteBerlin.id}_indoor`, siteId: siteBerlin.id, name: 'Indoor', vehicleAccess: false }, update: {} });

  // Zones — Hamburg
  const hbZoneA      = await prisma.zone.upsert({ where: { id: `zone_${siteHamburg.id}_A` }, create: { id: `zone_${siteHamburg.id}_A`, siteId: siteHamburg.id, name: 'Pier A', vehicleAccess: true }, update: {} });
  const hbZoneB      = await prisma.zone.upsert({ where: { id: `zone_${siteHamburg.id}_B` }, create: { id: `zone_${siteHamburg.id}_B`, siteId: siteHamburg.id, name: 'Pier B', vehicleAccess: true }, update: {} });
  const hbZoneIndoor = await prisma.zone.upsert({ where: { id: `zone_${siteHamburg.id}_indoor` }, create: { id: `zone_${siteHamburg.id}_indoor`, siteId: siteHamburg.id, name: 'Indoor', vehicleAccess: false }, update: {} });

  // Zones — Köln
  const klZoneA      = await prisma.zone.upsert({ where: { id: `zone_${siteKoeln.id}_A` }, create: { id: `zone_${siteKoeln.id}_A`, siteId: siteKoeln.id, name: 'Row A', vehicleAccess: true }, update: {} });
  const klZoneB      = await prisma.zone.upsert({ where: { id: `zone_${siteKoeln.id}_B` }, create: { id: `zone_${siteKoeln.id}_B`, siteId: siteKoeln.id, name: 'Row B', vehicleAccess: true }, update: {} });
  const klZoneIndoor = await prisma.zone.upsert({ where: { id: `zone_${siteKoeln.id}_indoor` }, create: { id: `zone_${siteKoeln.id}_indoor`, siteId: siteKoeln.id, name: 'Indoor', vehicleAccess: false }, update: {} });

  await seedUnits(siteFrankfurt.id, { outdoor1: fkZoneA.id, outdoor2: fkZoneB.id, indoor: fkZoneIndoor.id }, { t10ft: frankfurtTypes[0].id, t20ft: frankfurtTypes[1].id, t40ft: frankfurtTypes[2].id, small: frankfurtTypes[3].id, medium: frankfurtTypes[4].id });
  await seedUnits(siteBerlin.id,    { outdoor1: blZoneA.id, outdoor2: blZoneB.id, indoor: blZoneIndoor.id }, { t10ft: berlinTypes[0].id, t20ft: berlinTypes[1].id, t40ft: berlinTypes[2].id, small: berlinTypes[3].id, medium: berlinTypes[4].id });
  await seedUnits(siteHamburg.id,   { outdoor1: hbZoneA.id, outdoor2: hbZoneB.id, indoor: hbZoneIndoor.id }, { t10ft: hamburgTypes[0].id, t20ft: hamburgTypes[1].id, t40ft: hamburgTypes[2].id, small: hamburgTypes[3].id, medium: hamburgTypes[4].id });
  await seedUnits(siteKoeln.id,     { outdoor1: klZoneA.id, outdoor2: klZoneB.id, indoor: klZoneIndoor.id }, { t10ft: koelnTypes[0].id, t20ft: koelnTypes[1].id, t40ft: koelnTypes[2].id, small: koelnTypes[3].id, medium: koelnTypes[4].id });

  await seedPricing(siteFrankfurt.id, siteFrankfurt.name, frankfurtTypes);
  await seedPricing(siteBerlin.id,    siteBerlin.name,    berlinTypes);
  await seedPricing(siteHamburg.id,   siteHamburg.name,   hamburgTypes);
  await seedPricing(siteKoeln.id,     siteKoeln.name,     koelnTypes);

  console.log('✓ Unit types, zones, units, pricing: 4 new sites');

  // ─── Site Config (fee, tax, delinquency, reminders, promos, landing, accounting, inspections) ───

  await seedSiteConfig(siteFrankfurt.id, siteFrankfurt.name, {
    costCenter: 'K003',
    heroHeadline: 'Flexible storage in Frankfurt Westend',
    heroSubline: 'Indoor and outdoor units, 5 days a week access, instant online booking',
    heroCta: 'Check availability',
    faqs: [
      { question: 'What unit sizes are available?', answer: '10ft, 20ft and 40ft containers plus indoor boxes from 5–10 m².' },
      { question: 'How does access work?', answer: 'You receive a personal PIN code. Access is available Monday–Saturday 07:00–22:00.' },
      { question: 'What is the notice period?', answer: 'Monthly contracts with 30 days notice to end of month.' },
    ],
    seoTitle: 'Storage Frankfurt Westend — Flexible & Secure',
    seoDescription: 'Rent containers and storage boxes in Frankfurt. Online booking, SEPA direct debit, monthly cancellation.',
  });

  await seedSiteConfig(siteBerlin.id, siteBerlin.name, {
    costCenter: 'K004',
    heroHeadline: '24/7 storage in the heart of Berlin',
    heroSubline: 'Round-the-clock access, video surveillance, instant booking',
    heroCta: 'Book now',
    faqs: [
      { question: 'Is 24/7 access available?', answer: 'Yes, Berlin Mitte is accessible around the clock, every day of the year.' },
      { question: 'Is the site monitored?', answer: 'Yes, the site has 24/7 CCTV coverage and a perimeter fence.' },
      { question: 'How quickly can I move in?', answer: 'Book online today and move in as soon as tomorrow.' },
    ],
    seoTitle: 'Storage Berlin Mitte — 24/7 Access',
    seoDescription: 'Rent storage in Berlin. 24/7 access, CCTV, flexible terms. Book online in minutes.',
  });

  await seedSiteConfig(siteHamburg.id, siteHamburg.name, {
    costCenter: 'K005',
    heroHeadline: 'Waterfront storage at Hamburg Hafen',
    heroSubline: 'Drive-up containers, long access hours, great location near the port',
    heroCta: 'See available units',
    faqs: [
      { question: 'Can I drive up to my unit?', answer: 'Yes, all outdoor containers at Hamburg Hafen have direct drive-up vehicle access.' },
      { question: 'What are the access hours?', answer: 'The site is open daily 06:00–23:00.' },
      { question: 'Is there a minimum rental period?', answer: 'No minimum — month-to-month with 30 days notice.' },
    ],
    seoTitle: 'Container Storage Hamburg Hafen — Drive-Up Access',
    seoDescription: 'Container and self-storage at Hamburg Hafen. Drive-up access, daily 06:00–23:00, SEPA billing.',
  });

  await seedSiteConfig(siteKoeln.id, siteKoeln.name, {
    costCenter: 'K006',
    heroHeadline: 'Storage in Cologne Ehrenfeld',
    heroSubline: 'Convenient location, indoor and outdoor options, competitive rates',
    heroCta: 'Find a unit',
    faqs: [
      { question: 'What types of storage are available?', answer: 'We offer outdoor containers (10ft, 20ft, 40ft) and climate-controlled indoor boxes (5 m² and 10 m²).' },
      { question: 'How do I pay?', answer: 'We collect rent monthly by SEPA direct debit.' },
      { question: 'Can I cancel anytime?', answer: 'Yes — 30 days notice to the end of the month.' },
    ],
    seoTitle: 'Storage Cologne Ehrenfeld — Indoor & Outdoor',
    seoDescription: 'Rent storage in Cologne Ehrenfeld. Climate-controlled indoor boxes and drive-up containers.',
  });

  // ─── Agreement Templates ──────────────────────────────────────────────────

  const agreementBody = `STORAGE RENTAL AGREEMENT

This agreement is entered into between SiteLager ("Operator") and the Tenant named above.

1. UNIT. Operator leases to Tenant the storage unit described above for the exclusive storage of personal or business goods.
2. TERM. This agreement begins on the effective date and continues month-to-month until terminated by either party with 30 days' written notice.
3. RENT. Tenant agrees to pay the monthly rent stated above, due on the first day of each rental month.
4. PERMITTED USE. The unit may only be used for storage of lawful goods. Hazardous materials, perishables, and living beings are strictly prohibited.
5. ACCESS. Tenant may access the unit during posted site hours using the access credentials provided.
6. LIABILITY. Operator is not liable for loss, damage, or theft. Tenant is advised to maintain appropriate insurance.
7. TERMINATION. Either party may terminate with 30 days' written notice. Operator may terminate immediately for breach of any term.`;

  const allSiteIds = [site1.id, site2.id, siteFrankfurt.id, siteBerlin.id, siteHamburg.id, siteKoeln.id];

  for (const siteId of allSiteIds) {
    await prisma.agreementTemplate.upsert({
      where: { siteId_language_version: { siteId, language: 'en', version: '1.0' } },
      create: { siteId, version: '1.0', language: 'en', body: agreementBody, active: true },
      update: {},
    });
  }
  console.log('✓ Agreement templates: 1 per site (en, v1.0)');

  // ─── Listings ─────────────────────────────────────────────────────────────

  // Look up unit IDs for available units to list
  const listingUnits = await Promise.all([
    prisma.unit.findFirst({ where: { siteId: site1.id, unitCode: 'A01', status: 'available' } }),
    prisma.unit.findFirst({ where: { siteId: site1.id, unitCode: 'IN-S01', status: 'available' } }),
    prisma.unit.findFirst({ where: { siteId: site2.id, unitCode: 'A11', status: 'available' } }),
    prisma.unit.findFirst({ where: { siteId: siteFrankfurt.id, unitCode: 'A01', status: 'available' } }),
    prisma.unit.findFirst({ where: { siteId: siteFrankfurt.id, unitCode: 'IN-M01', status: 'available' } }),
    prisma.unit.findFirst({ where: { siteId: siteBerlin.id, unitCode: 'A11', status: 'available' } }),
    prisma.unit.findFirst({ where: { siteId: siteHamburg.id, unitCode: 'B07', status: 'available' } }),
    prisma.unit.findFirst({ where: { siteId: siteKoeln.id, unitCode: 'IN-S01', status: 'available' } }),
  ]);

  const listingDefs = [
    {
      orgId: org.id, siteId: site1.id, unit: listingUnits[0],
      slug: 'passau-hafen-10ft-a01', title: '10ft Drive-Up Container — Passau Hafen',
      description: 'Weatherproof 10ft shipping container with drive-up access and roll-up door. Ideal for household goods, furniture, or workshop overflow. Ground-level loading.',
      publicPriceMinor: 6900, depositMinor: 9900, bookingMode: 'instant_booking' as const,
    },
    {
      orgId: org.id, siteId: site1.id, unit: listingUnits[1],
      slug: 'passau-hafen-indoor-s01', title: 'Climate-Controlled Indoor Box 5 m² — Passau Hafen',
      description: 'Clean, dry indoor storage box. Perfect for documents, electronics, clothing, or valuables. Climate-controlled building with swing door.',
      publicPriceMinor: 4900, depositMinor: 9900, bookingMode: 'approval_required' as const,
    },
    {
      orgId: org.id, siteId: site2.id, unit: listingUnits[2],
      slug: 'muenchen-nord-20ft-a11', title: '20ft Container — München Nord (24/7 Access)',
      description: 'Spacious 20ft container at our 24/7 accessible Munich site. Drive-up, weathersealed, ground level. Perfect for business inventory or long-term storage.',
      publicPriceMinor: 11900, depositMinor: 9900, bookingMode: 'instant_booking' as const,
    },
    {
      orgId: org.id, siteId: siteFrankfurt.id, unit: listingUnits[3],
      slug: 'frankfurt-westend-10ft-a01', title: '10ft Business Container — Frankfurt Westend',
      description: 'Compact 10ft container steps from Frankfurt city centre. Drive-up access, SEPA billing, monthly rolling contract.',
      publicPriceMinor: 6900, depositMinor: 9900, bookingMode: 'approval_required' as const,
    },
    {
      orgId: org.id, siteId: siteFrankfurt.id, unit: listingUnits[4],
      slug: 'frankfurt-westend-indoor-m01', title: '10 m² Indoor Box — Frankfurt Westend',
      description: 'Spacious 10 m² climate-controlled indoor storage. Ideal for archive boxes, sample stock, or sensitive equipment.',
      publicPriceMinor: 7900, depositMinor: 9900, bookingMode: 'instant_booking' as const,
    },
    {
      orgId: org2.id, siteId: siteBerlin.id, unit: listingUnits[5],
      slug: 'berlin-mitte-20ft-a11', title: '20ft Container Berlin Mitte — 24/7 Access',
      description: '24/7 accessible 20ft container in central Berlin. CCTV monitored, weathersealed, drive-up. No minimum term.',
      publicPriceMinor: 11900, depositMinor: 9900, bookingMode: 'instant_booking' as const,
    },
    {
      orgId: org2.id, siteId: siteHamburg.id, unit: listingUnits[6],
      slug: 'hamburg-hafen-40ft-b07', title: '40ft Drive-Up Container — Hamburg Hafen',
      description: 'Massive 40ft container at Hamburg\'s waterfront storage facility. Ideal for large inventories, removals, or long-term archival. Daily access 06:00–23:00.',
      publicPriceMinor: 18900, depositMinor: 9900, bookingMode: 'approval_required' as const,
    },
    {
      orgId: org2.id, siteId: siteKoeln.id, unit: listingUnits[7],
      slug: 'koeln-ehrenfeld-indoor-s01', title: 'Indoor Storage Box 5 m² — Köln Ehrenfeld',
      description: 'Affordable 5 m² indoor unit in Cologne\'s trendy Ehrenfeld district. Climate controlled, secure, and easy to access.',
      publicPriceMinor: 4900, depositMinor: 9900, bookingMode: 'instant_booking' as const,
    },
  ];

  for (const def of listingDefs) {
    if (!def.unit) { console.warn(`⚠ Listing skipped — unit not found for slug ${def.slug}`); continue; }
    await prisma.listing.upsert({
      where: { slug: def.slug },
      create: {
        organisationId: def.orgId,
        siteId: def.siteId,
        unitId: def.unit.id,
        slug: def.slug,
        title: def.title,
        description: def.description,
        publicPriceMinor: def.publicPriceMinor,
        showPrice: true,
        depositMinor: def.depositMinor,
        availableFrom: new Date(),
        bookingMode: def.bookingMode,
        status: 'published',
        requiredDocs: def.bookingMode === 'approval_required' ? ['id_document'] : [],
        seoTitle: def.title,
        seoDescription: def.description?.slice(0, 160),
        commissionRateBp: 0,
        source: 'manual',
      },
      update: {},
    });
  }
  console.log('✓ Listings: 8 published across all sites');

  // ─── Customers ────────────────────────────────────────────────────────────

  const custThomas = await prisma.customer.upsert({
    where: { id: 'cust_thomas_weber' },
    create: { id: 'cust_thomas_weber', type: 'business', personOrOrgData: { firstName: 'Thomas', lastName: 'Weber', companyName: 'Weber Logistics GmbH', vatId: 'DE123456789' }, marketingConsent: true },
    update: {},
  });
  await prisma.contact.upsert({
    where: { id: 'contact_thomas_weber' },
    create: { id: 'contact_thomas_weber', customerId: custThomas.id, role: 'primary', email: 'thomas.weber@weber-logistics.de', phone: '+49 69 1234567' },
    update: {},
  });
  await prisma.mandate.upsert({
    where: { reference: 'MANDATE-TW-001' },
    create: { customerId: custThomas.id, scheme: 'sepa_core', reference: 'MANDATE-TW-001', status: 'active', ibanLast4: '4521', consentSource: 'online_form', signedAt: monthsAgo(6) },
    update: {},
  });

  const custSarah = await prisma.customer.upsert({
    where: { id: 'cust_sarah_mitchell' },
    create: { id: 'cust_sarah_mitchell', type: 'private', personOrOrgData: { firstName: 'Sarah', lastName: 'Mitchell' }, marketingConsent: false },
    update: {},
  });
  await prisma.contact.upsert({
    where: { id: 'contact_sarah_mitchell' },
    create: { id: 'contact_sarah_mitchell', customerId: custSarah.id, role: 'primary', email: 'sarah.mitchell@email.com', phone: '+49 89 9876543' },
    update: {},
  });
  await prisma.mandate.upsert({
    where: { reference: 'MANDATE-SM-001' },
    create: { customerId: custSarah.id, scheme: 'card', reference: 'MANDATE-SM-001', status: 'active', consentSource: 'checkout', signedAt: daysFromNow(-2) },
    update: {},
  });

  const custKlaus = await prisma.customer.upsert({
    where: { id: 'cust_klaus_hoffmann' },
    create: { id: 'cust_klaus_hoffmann', type: 'private', personOrOrgData: { firstName: 'Klaus', lastName: 'Hoffmann' }, marketingConsent: false },
    update: {},
  });
  await prisma.contact.upsert({
    where: { id: 'contact_klaus_hoffmann' },
    create: { id: 'contact_klaus_hoffmann', customerId: custKlaus.id, role: 'primary', email: 'k.hoffmann@gmx.de', phone: '+49 69 5551234' },
    update: {},
  });
  // Klaus has no mandate intentionally — triggers delinquency story

  const custEmma = await prisma.customer.upsert({
    where: { id: 'cust_emma_schneider' },
    create: { id: 'cust_emma_schneider', type: 'private', personOrOrgData: { firstName: 'Emma', lastName: 'Schneider' }, marketingConsent: true },
    update: {},
  });
  await prisma.contact.upsert({
    where: { id: 'contact_emma_schneider' },
    create: { id: 'contact_emma_schneider', customerId: custEmma.id, role: 'primary', email: 'emma.schneider@outlook.com', phone: '+49 30 7778899' },
    update: {},
  });
  await prisma.mandate.upsert({
    where: { reference: 'MANDATE-ES-001' },
    create: { customerId: custEmma.id, scheme: 'sepa_core', reference: 'MANDATE-ES-001', status: 'active', ibanLast4: '7732', consentSource: 'online_form', signedAt: monthsAgo(7) },
    update: {},
  });

  const custTechstore = await prisma.customer.upsert({
    where: { id: 'cust_techstore_gmbh' },
    create: { id: 'cust_techstore_gmbh', type: 'business', personOrOrgData: { firstName: 'Markus', lastName: 'Braun', companyName: 'TechStore GmbH', vatId: 'DE987654321' }, marketingConsent: true },
    update: {},
  });
  await prisma.contact.upsert({
    where: { id: 'contact_techstore' },
    create: { id: 'contact_techstore', customerId: custTechstore.id, role: 'primary', email: 'markus.braun@techstore-gmbh.de', phone: '+49 40 3339900' },
    update: {},
  });
  await prisma.mandate.upsert({
    where: { reference: 'MANDATE-TS-001' },
    create: { customerId: custTechstore.id, scheme: 'sepa_b2b', reference: 'MANDATE-TS-001', status: 'active', ibanLast4: '9103', consentSource: 'online_form', signedAt: monthsAgo(5) },
    update: {},
  });

  console.log('✓ Customers: 5 (Thomas Weber, Sarah Mitchell, Klaus Hoffmann, Emma Schneider, TechStore GmbH)');

  // ─── Story 1: Thomas Weber (active, 6 months) ────────────────────────────

  const weberUnit = await prisma.unit.findFirstOrThrow({ where: { siteId: site1.id, unitCode: 'A16' } });
  await prisma.unit.update({ where: { id: weberUnit.id }, data: { status: 'occupied' } });

  const weberReservation = await prisma.reservation.upsert({
    where: { id: 'res_thomas_weber' },
    create: {
      id: 'res_thomas_weber',
      siteId: site1.id, unitId: weberUnit.id, unitTypeId: weberUnit.unitTypeId,
      customerId: custThomas.id, status: 'converted', source: 'manual',
      startDate: monthsAgo(6), expiresAt: monthsAgo(5),
    },
    update: {},
  });

  const weberAgreement = await prisma.agreement.upsert({
    where: { reservationId: 'res_thomas_weber' },
    create: {
      id: 'agr_thomas_weber',
      reservationId: weberReservation.id,
      tenantId: custThomas.id,
      unitId: weberUnit.id,
      siteId: site1.id,
      status: 'active',
      billingCycle: 'monthly',
      effectiveFrom: monthsAgo(6),
      terminationRules: { noticePeriodDays: 30, noticeCutoff: 'end_of_month' },
      pricingSnapshot: { unitTypeId: weberUnit.unitTypeId, amountMinor: 11900, billingCycle: 'monthly', currency: 'EUR' },
      language: 'en',
    },
    update: {},
  });

  await prisma.signatory.upsert({
    where: { id: 'sig_thomas_weber' },
    create: { id: 'sig_thomas_weber', agreementId: weberAgreement.id, personId: custThomas.id, status: 'signed', signedAt: monthsAgo(6) },
    update: {},
  });

  // 6 months of paid invoices
  for (let i = 0; i < 6; i++) {
    const periodStart = monthsAgo(6 - i);
    const periodEnd   = monthsAgo(5 - i);
    const invId = `inv_thomas_weber_${i + 1}`;
    const inv = await prisma.invoice.upsert({
      where: { agreementId_periodStart: { agreementId: weberAgreement.id, periodStart } },
      create: {
        id: invId,
        agreementId: weberAgreement.id,
        siteId: site1.id,
        status: 'paid',
        invoiceDate: periodStart,
        dueDate: new Date(periodStart.getTime() + 15 * 86400000),
        currency: 'EUR',
        totalMinor: 14161, // €119 + 19% VAT
        periodStart,
        periodEnd,
      },
      update: {},
    });
    await prisma.invoiceLine.upsert({
      where: { id: `il_thomas_weber_${i + 1}` },
      create: { id: `il_thomas_weber_${i + 1}`, invoiceId: inv.id, kind: 'rent', description: '20ft container A16 — monthly rental', amountMinor: 11900, taxCode: 'DE_STD', vatRate: 0.19 },
      update: {},
    });
    await prisma.payment.upsert({
      where: { reference: `pay_thomas_weber_${i + 1}` },
      create: { invoiceId: inv.id, method: 'sepa_core', status: 'succeeded', amountMinor: 14161, reference: `pay_thomas_weber_${i + 1}` },
      update: {},
    });
  }

  await prisma.accessCredential.upsert({
    where: { agreementId: weberAgreement.id },
    create: { agreementId: weberAgreement.id, credentialType: 'pin', maskedValue: '****4521', status: 'active' },
    update: {},
  });

  console.log('✓ Story 1: Thomas Weber — active 6-month tenant, 6 paid invoices');

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
