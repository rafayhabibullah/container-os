import type { Locale } from './locale';

const messages = {
  en: {
    nav: { locations: 'Locations', myAccount: 'My Account' },
    footer: 'GDPR Compliant · Privacy · Imprint',
    home: {
      badge: '🇩🇪 GDPR compliant · SEPA certified',
      headline1: 'Secure storage space,',
      headline2: 'book online instantly',
      sub: 'Container units and storage boxes — drive-up, 24/7 access, digitally managed. No paperwork, no waiting.',
      locationsTitle: 'Our locations',
      locationsSub: 'Choose a location and check live availability.',
      noLocations: 'No locations available.',
      from: 'from',
      perMonth: '/ month',
      checkAvailability: 'Check availability →',
      whyTitle: 'Why Container OS?',
      features: [
        { icon: '🔐', title: 'Digital access', desc: 'PIN code or app — no key required.' },
        { icon: '📅', title: 'Flexible contracts', desc: '30-day notice, monthly billing.' },
        { icon: '💳', title: 'SEPA Direct Debit', desc: 'Pay by direct debit or credit card.' },
        { icon: '📸', title: 'Documented', desc: 'Move-in and move-out inspection with photos.' },
      ],
    },
    site: {
      breadcrumbHome: 'Locations',
      hours: ['Mon–Fri: 6am–10pm', 'Sat: 7am–8pm', 'Sun: 8am–6pm'],
      availableUnits: 'Available units',
      noUnits: 'No units found.',
      available: 'available',
      soldOut: 'Sold out',
      from: 'from',
      perMonth: '/mo',
      book: 'Book →',
      waitlist: 'Waitlist',
    },
    checkout: {
      title: 'Book online',
      steps: ['Unit', 'Price summary', 'Your details', 'Payment', 'Confirmation'],
      back: 'Back',
      next: 'Next',
      priceSummary: { rent: 'Monthly rent', vat: 'VAT 19%', deposit: 'Deposit', total: 'Due today' },
      confirmed: 'Booking confirmed!',
      confirmedSub: 'You will receive your rental agreement by email shortly.',
    },
  },
  de: {
    nav: { locations: 'Standorte', myAccount: 'Mein Konto' },
    footer: 'DSGVO-konform · Datenschutz · Impressum',
    home: {
      badge: '🇩🇪 DSGVO-konform · SEPA-zertifiziert',
      headline1: 'Sicherer Lagerraum,',
      headline2: 'sofort online buchen',
      sub: 'Containerstellplätze und Lagerboxen — Drive-up, 24/7 Zugang, digital verwaltet. Kein Papierkram, keine Wartezeit.',
      locationsTitle: 'Unsere Standorte',
      locationsSub: 'Wählen Sie Ihren Standort und prüfen Sie die Verfügbarkeit.',
      noLocations: 'Keine Standorte verfügbar.',
      from: 'ab',
      perMonth: '/ Monat',
      checkAvailability: 'Verfügbarkeit prüfen →',
      whyTitle: 'Warum Container OS?',
      features: [
        { icon: '🔐', title: 'Digitaler Zugang', desc: 'PIN-Code oder App — ganz ohne Schlüssel.' },
        { icon: '📅', title: 'Flexibel kündbar', desc: '30 Tage Kündigungsfrist, monatliche Abrechnung.' },
        { icon: '💳', title: 'SEPA-Lastschrift', desc: 'Bequem per Lastschrift oder Kreditkarte zahlen.' },
        { icon: '📸', title: 'Protokolliert', desc: 'Einzugs- und Auszugsprotokoll mit Fotos.' },
      ],
    },
    site: {
      breadcrumbHome: 'Standorte',
      hours: ['Mo–Fr: 6–22 Uhr', 'Sa: 7–20 Uhr', 'So: 8–18 Uhr'],
      availableUnits: 'Verfügbare Einheiten',
      noUnits: 'Keine Einheiten gefunden.',
      available: 'verfügbar',
      soldOut: 'Ausgebucht',
      from: 'ab',
      perMonth: '/Mo.',
      book: 'Buchen →',
      waitlist: 'Warteliste',
    },
    checkout: {
      title: 'Online einmieten',
      steps: ['Einheit', 'Preisübersicht', 'Ihre Daten', 'Zahlung', 'Bestätigung'],
      back: 'Zurück',
      next: 'Weiter',
      priceSummary: { rent: 'Monatsmiete', vat: 'MwSt. 19%', deposit: 'Kaution', total: 'Heute fällig' },
      confirmed: 'Buchung bestätigt!',
      confirmedSub: 'Sie erhalten in Kürze eine E-Mail mit Ihrem Mietvertrag.',
    },
  },
} as const;

export type Messages = typeof messages['en'];

export function getMessages(locale: Locale): Messages {
  return messages[locale] as Messages;
}
