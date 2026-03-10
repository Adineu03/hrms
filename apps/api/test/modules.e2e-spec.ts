import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  authHeader,
  createTestApp,
  isConnRefused,
  signupOrg,
  TestAuth,
} from './helpers/auth';

describe('Modules & Dashboard (e2e)', () => {
  let app: INestApplication;
  let dbAvailable = false;
  let admin: TestAuth;

  beforeAll(async () => {
    try {
      app = await createTestApp();
      admin = await signupOrg(app);
      dbAvailable = true;
    } catch (err) {
      if (isConnRefused(err)) {
        console.warn('[modules] DB not available — skipping all tests');
      } else {
        throw err;
      }
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/v1/modules (admin) → 200 + 19 modules', async () => {
    if (!dbAvailable) return;

    const res = await request(app.getHttpServer())
      .get('/api/v1/modules')
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
    const modules = res.body.data ?? res.body;
    expect(Array.isArray(modules)).toBe(true);
    expect(modules.length).toBe(19);
  });

  it('POST /api/v1/modules/:id/activate (admin) → 200', async () => {
    if (!dbAvailable) return;

    // cold-start-setup is the first module with no dependencies
    const res = await request(app.getHttpServer())
      .post('/api/v1/modules/cold-start-setup/activate')
      .set(authHeader(admin.token));

    // 200 = activated; 409 = already active; both acceptable
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(500);
    expect([200, 201, 409]).toContain(res.status);
  });

  it('GET /api/v1/dashboard/stats (admin) → 200 + stats shape', async () => {
    if (!dbAvailable) return;

    const res = await request(app.getHttpServer())
      .get('/api/v1/dashboard/stats')
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(typeof res.body.totalEmployees).toBe('number');
    expect(typeof res.body.activeModules).toBe('number');
    expect(typeof res.body.pendingApprovals).toBe('number');
  });

  it('GET /api/v1/dashboard/stats (no token) → 401', async () => {
    if (!dbAvailable) return;

    const res = await request(app.getHttpServer()).get(
      '/api/v1/dashboard/stats',
    );

    expect(res.status).toBe(401);
  });
});
