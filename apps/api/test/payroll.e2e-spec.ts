import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  authHeader,
  createTestApp,
  isConnRefused,
  signupOrg,
  TestAuth,
} from './helpers/auth';

describe('Payroll Processing (e2e)', () => {
  let app: INestApplication;
  let dbAvailable = false;
  let admin: TestAuth;
  let createdRunId: string;

  beforeAll(async () => {
    try {
      app = await createTestApp();
      admin = await signupOrg(app);
      dbAvailable = true;
    } catch (err) {
      if (isConnRefused(err)) {
        console.warn('[payroll] DB not available — skipping all tests');
      } else {
        throw err;
      }
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/v1/payroll-processing/admin/runs (admin) → 200 + array', async () => {
    if (!dbAvailable) return;

    const res = await request(app.getHttpServer())
      .get('/api/v1/payroll-processing/admin/runs')
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data ?? res.body)).toBe(true);
  });

  it('POST /api/v1/payroll-processing/admin/runs (admin creates run) → 201 or 200', async () => {
    if (!dbAvailable) return;

    const now = new Date();
    const res = await request(app.getHttpServer())
      .post('/api/v1/payroll-processing/admin/runs')
      .set(authHeader(admin.token))
      .send({
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      });

    // 201/200 = created, 409 = already exists for this month
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(500);
    expect([200, 201, 409]).toContain(res.status);

    if (res.body.id) {
      createdRunId = res.body.id;
    }
  });

  it('GET /api/v1/payroll-processing/admin/runs/:id (admin) → 200 or 404', async () => {
    if (!dbAvailable) return;
    if (!createdRunId) {
      console.warn('[payroll] No run created, skipping getById test');
      return;
    }

    const res = await request(app.getHttpServer())
      .get(`/api/v1/payroll-processing/admin/runs/${createdRunId}`)
      .set(authHeader(admin.token));

    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/v1/payroll-processing/employee/payslips (employee) → 200', async () => {
    if (!dbAvailable) return;

    const res = await request(app.getHttpServer())
      .get('/api/v1/payroll-processing/employee/payslips')
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data ?? res.body)).toBe(true);
  });
});
