import fs from 'fs';
import path from 'path';

/**
 * Global setup for the Demo-Readiness Survey Crawler.
 *
 * Logs in all three personas and writes a Playwright `storageState` file for each, so the
 * survey specs attach the matching auth instead of logging in per test.
 *
 * The app stores auth in localStorage (`token` / `refreshToken` / `user`, see
 * apps/web/src/lib/auth-store.ts). We log in against the API and write those exact three
 * keys into a storageState file — functionally identical to a real form login, but without
 * browser flakiness, and with clear fail-fast diagnostics that distinguish web-down vs
 * api-down vs not-seeded.
 */

const WEB = 'http://localhost:3000';
const API = 'http://localhost:3001/api/v1';

const PERSONAS = [
  { role: 'admin', email: 'admin@acme.com', password: 'Admin@123' },
  { role: 'manager', email: 'manager@acme.com', password: 'Manager@123' },
  { role: 'employee', email: 'emp01@acme.com', password: 'Employee@123' },
] as const;

const AUTH_DIR = path.join(__dirname, '.auth');

export default async function globalSetup() {
  // 1. Web reachable? (the survey navigates the browser to :3000)
  try {
    await fetch(`${WEB}/login`, { method: 'GET' });
  } catch (e) {
    throw new Error(
      `[survey] Web app not reachable at ${WEB}. Start the app with \`pnpm dev\` ` +
        `(web :3000 + api :3001) and seed it with \`pnpm seed\`, then re-run. (${String(e)})`,
    );
  }

  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // 2. API + seed: log in each persona and write its storageState.
  for (const p of PERSONAS) {
    let res: Response;
    try {
      res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: p.email, password: p.password }),
      });
    } catch (e) {
      throw new Error(
        `[survey] API not reachable at ${API}. Start it with \`pnpm dev\`, then re-run. (${String(e)})`,
      );
    }

    if (res.status === 401 || res.status === 400 || res.status === 404) {
      throw new Error(
        `[survey] Login failed for ${p.email} (HTTP ${res.status}). ` +
          `Is the DB seeded? Run \`pnpm seed\` (expects admin@acme.com / manager@acme.com / emp01@acme.com).`,
      );
    }
    if (!res.ok) {
      throw new Error(`[survey] Unexpected HTTP ${res.status} logging in ${p.email} at ${API}/auth/login.`);
    }

    const data = (await res.json()) as {
      tokens?: { accessToken?: string; refreshToken?: string };
      user?: unknown;
    };
    const accessToken = data.tokens?.accessToken;
    const refreshToken = data.tokens?.refreshToken;
    if (!accessToken || !data.user) {
      throw new Error(
        `[survey] Login response for ${p.email} is missing tokens/user — has the auth response shape changed?`,
      );
    }

    const storageState = {
      cookies: [],
      origins: [
        {
          origin: WEB,
          localStorage: [
            { name: 'token', value: accessToken },
            { name: 'refreshToken', value: refreshToken ?? '' },
            { name: 'user', value: JSON.stringify(data.user) },
          ],
        },
      ],
    };

    fs.writeFileSync(path.join(AUTH_DIR, `${p.role}.json`), JSON.stringify(storageState, null, 2));
    const role = (data.user as { role?: string }).role ?? '?';
    console.log(`[survey] storageState saved for ${p.role} (${p.email}) — role=${role}`);
  }
}
