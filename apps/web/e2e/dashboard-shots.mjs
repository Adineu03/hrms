// One-off helper: screenshot the three role dashboards for owner review.
// Logs in fresh (storageState tokens go stale) the same way e2e/global-setup.ts does.
// Run from apps/web:  node e2e/dashboard-shots.mjs
import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const API = 'http://localhost:3001/api/v1';
const PERSONAS = [
  { role: 'admin', email: 'admin@acme.com', password: 'Admin@123' },
  { role: 'manager', email: 'manager@acme.com', password: 'Manager@123' },
  { role: 'employee', email: 'emp01@acme.com', password: 'Employee@123' },
];

const browser = await chromium.launch();
for (const { role, email, password } of PERSONAS) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: HTTP ${res.status}`);
  const data = await res.json();
  const ctx = await browser.newContext({
    storageState: {
      cookies: [],
      origins: [
        {
          origin: BASE,
          localStorage: [
            { name: 'token', value: data.tokens.accessToken },
            { name: 'refreshToken', value: data.tokens.refreshToken ?? '' },
            { name: 'user', value: JSON.stringify(data.user) },
          ],
        },
      ],
    },
    viewport: { width: 1440, height: 1000 },
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/react devtools|download the react|\[fast refresh\]/i.test(m.text())) {
      errors.push(m.text().slice(0, 200));
    }
  });
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('main h1', { timeout: 60000 });
  await page.waitForTimeout(2500); // charts + count-up settle
  const file = path.join(HERE, 'screenshots', `dashboard-${role}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`[shots] ${role}: ${file}${errors.length ? `  CONSOLE ERRORS: ${errors.join(' | ')}` : '  (no console errors)'}`);
  await ctx.close();
}
await browser.close();
