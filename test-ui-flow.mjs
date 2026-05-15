/**
 * UI smoke test: register business → login → create 4 sites
 * Run: node test-ui-flow.mjs
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:3001';

const RUN   = Date.now();
const EMAIL = `test-owner-${RUN}@example.com`;
const PASS  = 'Test1234!';
const ORG   = `Test Storage Co ${RUN}`;

const SITES = [
  { name: 'Berlin Mitte',    street: 'Unter den Linden 1', city: 'Berlin',    postalCode: '10117', country: 'DE', timezone: 'Europe/Berlin' },
  { name: 'Hamburg Hafen',   street: 'Speicherstadt 5',    city: 'Hamburg',   postalCode: '20457', country: 'DE', timezone: 'Europe/Berlin' },
  { name: 'München Nord',    street: 'Leopoldstraße 100',  city: 'München',   postalCode: '80802', country: 'DE', timezone: 'Europe/Berlin' },
  { name: 'Frankfurt Messe', street: 'Gutleutstraße 42',   city: 'Frankfurt', postalCode: '60329', country: 'DE', timezone: 'Europe/Berlin' },
];

let passed = 0;
let failed = 0;

function ok(label)         { console.log(`  ✅ ${label}`); passed++; }
function fail(label, note) { console.log(`  ❌ ${label}${note ? '\n     ' + note : ''}`); failed++; }

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext();
  const page    = await ctx.newPage();

  page.on('pageerror', err => console.log(`  [js error] ${err.message}`));

  try {
    // ─── 1. REGISTER ───────────────────────────────────────────────────────
    console.log('\n1. Register new business');
    await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
    ok(`Register page loaded (${page.url()})`);

    // Fill fields by name attribute (labels have no htmlFor)
    await page.locator('[name=organisationName]').fill(ORG);
    await page.locator('[name=ownerName]').fill('Test Owner');
    await page.locator('[name=email]').fill(EMAIL);
    await page.locator('[name=password]').fill(PASS);
    ok('Registration form filled');

    await page.getByRole('button', { name: /create account|register|sign up|get started/i }).click();
    await page.waitForURL(url => !url.pathname.startsWith('/register'), { timeout: 10000 })
      .catch(() => {});

    const afterReg = new URL(page.url()).pathname;
    if (afterReg === '/dashboard') {
      ok(`Registered + auto-logged in → /dashboard`);
    } else if (afterReg === '/login') {
      ok(`Registration succeeded → /login (email confirmation not required)`);
    } else {
      const err = await page.locator('[role=alert]').textContent({ timeout: 1000 }).catch(() => '');
      fail(`Registration stayed on ${afterReg}`, err || 'check server logs');
    }

    // ─── 2. LOGIN ──────────────────────────────────────────────────────────
    console.log('\n2. Login');

    if (page.url().includes('/dashboard')) {
      ok('Already logged in (auto-login after registration)');
    } else {
      if (!page.url().includes('/login')) {
        await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
      }
      ok(`Login page loaded`);

      await page.locator('[name=email]').fill(EMAIL);
      await page.locator('[name=password]').fill(PASS);
      await page.getByRole('button', { name: /sign in|log in|login/i }).click();
      await page.waitForURL(url => url.pathname.includes('/dashboard'), { timeout: 10000 })
        .catch(() => {});

      if (page.url().includes('/dashboard')) {
        ok(`Logged in → ${new URL(page.url()).pathname}`);
      } else {
        const err = await page.locator('[role=alert]').textContent({ timeout: 1000 }).catch(() => '');
        fail(`Login failed, still at ${new URL(page.url()).pathname}`, err);
        // Can't continue without being logged in
        return;
      }
    }

    // Sidebar sanity check
    const sidebar = await page.locator('aside').isVisible().catch(() => false);
    sidebar ? ok('Sidebar visible') : fail('Sidebar not visible');

    // Dashboard h1
    const h1 = await page.locator('h1').first().textContent({ timeout: 3000 }).catch(() => '');
    ok(`Dashboard h1: "${h1.trim()}"`);

    // ─── 3. NAVIGATE TO SITES LIST ─────────────────────────────────────────
    console.log('\n3. Navigate to /sites');
    await page.goto(`${BASE}/sites`, { waitUntil: 'networkidle' });
    const sitesH1 = await page.locator('h1').first().textContent({ timeout: 3000 }).catch(() => '');
    ok(`Sites page h1: "${sitesH1.trim()}"`);

    // "Add site" link exists
    const addSiteLink = page.getByRole('link', { name: /add site/i });
    const hasAdd = await addSiteLink.isVisible().catch(() => false);
    hasAdd ? ok('"Add site" link visible') : fail('"Add site" link not found');

    // ─── 4. CREATE 4 SITES ─────────────────────────────────────────────────
    console.log('\n4. Create 4 sites');

    for (const site of SITES) {
      console.log(`\n   → ${site.name}`);

      await page.goto(`${BASE}/sites/new`, { waitUntil: 'networkidle' });
      const newSiteH1 = await page.locator('h1').first().textContent({ timeout: 3000 }).catch(() => '');
      ok(`New site page loaded (h1: "${newSiteH1.trim()}")`);

      // Fill form fields by name
      await page.locator('[name=name]').fill(site.name);
      await page.locator('[name=street]').fill(site.street);
      await page.locator('[name=city]').fill(site.city);
      await page.locator('[name=postalCode]').fill(site.postalCode);

      // Country — clear default 'DE' and type
      await page.locator('[name=country]').fill(site.country);

      // Timezone — clear and type
      const tzInput = page.locator('[name=timezone]');
      if (await tzInput.isVisible().catch(() => false)) {
        await tzInput.fill(site.timezone);
      }

      ok(`${site.name}: form filled`);

      // Submit
      await page.getByRole('button', { name: /create site|create|save/i }).click();

      // Wait for redirect away from /sites/new
      await page.waitForURL(url => !url.pathname.endsWith('/new'), { timeout: 10000 })
        .catch(() => {});

      const postUrl = new URL(page.url()).pathname;
      if (postUrl.startsWith('/sites/') && !postUrl.endsWith('/new')) {
        ok(`${site.name}: created → redirected to ${postUrl}`);
      } else if (postUrl === '/sites') {
        ok(`${site.name}: created → back to /sites`);
      } else {
        const err = await page.locator('[role=alert], p.text-red, .error').first()
          .textContent({ timeout: 1000 }).catch(() => '');
        fail(`${site.name}: still on ${postUrl}`, err || 'no error message visible');
      }
    }

    // ─── 5. VERIFY ALL 4 SITES LISTED ──────────────────────────────────────
    console.log('\n5. Verify all 4 sites on /sites');
    await page.goto(`${BASE}/sites`, { waitUntil: 'networkidle' });
    const body = await page.textContent('body') ?? '';

    for (const site of SITES) {
      body.includes(site.name)
        ? ok(`"${site.name}" in sites list`)
        : fail(`"${site.name}" NOT found in sites list`);
    }

  } finally {
    await browser.close();
  }

  // ─── SUMMARY ─────────────────────────────────────────────────────────────
  console.log('\n' + '─'.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
