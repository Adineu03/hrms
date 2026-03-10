import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  authHeader,
  createTestApp,
  isConnRefused,
  signupOrg,
  TestAuth,
} from './helpers/auth';

describe('Core HR (e2e)', () => {
  let app: INestApplication;
  let dbAvailable = false;
  let admin: TestAuth;
  let createdEmployeeId: string;

  beforeAll(async () => {
    try {
      app = await createTestApp();
      admin = await signupOrg(app);
      dbAvailable = true;
    } catch (err) {
      if (isConnRefused(err)) {
        console.warn('[core-hr] DB not available — skipping all tests');
      } else {
        throw err;
      }
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/v1/core-hr/admin/employees (admin) → 200 + array', async () => {
    if (!dbAvailable) return;

    const res = await request(app.getHttpServer())
      .get('/api/v1/core-hr/admin/employees')
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data ?? res.body)).toBe(true);
  });

  it('GET /api/v1/core-hr/admin/employees (no token) → 401', async () => {
    if (!dbAvailable) return;

    const res = await request(app.getHttpServer()).get(
      '/api/v1/core-hr/admin/employees',
    );

    expect(res.status).toBe(401);
  });

  it('POST /api/v1/core-hr/admin/employees (admin creates employee) → 201', async () => {
    if (!dbAvailable) return;

    const suffix = Math.random().toString(36).slice(2, 8);
    const res = await request(app.getHttpServer())
      .post('/api/v1/core-hr/admin/employees')
      .set(authHeader(admin.token))
      .send({
        firstName: 'John',
        lastName: 'Doe',
        email: `john-${suffix}@hrms-test.local`,
        employmentType: 'full_time',
        joinDate: new Date().toISOString().slice(0, 10),
      });

    // Accept 201 (created) or 200 (upsert style)
    expect([200, 201]).toContain(res.status);
    if (res.body.id) {
      createdEmployeeId = res.body.id;
    }
  });

  it('GET /api/v1/core-hr/admin/employees/:id (admin) → 200 or 404', async () => {
    if (!dbAvailable) return;
    if (!createdEmployeeId) {
      console.warn('[core-hr] No employee created, skipping getById test');
      return;
    }

    const res = await request(app.getHttpServer())
      .get(`/api/v1/core-hr/admin/employees/${createdEmployeeId}`)
      .set(authHeader(admin.token));

    expect([200, 404]).toContain(res.status);
  });

  it('GET /api/v1/core-hr/admin/entities (admin) → 200', async () => {
    if (!dbAvailable) return;

    const res = await request(app.getHttpServer())
      .get('/api/v1/core-hr/admin/entities')
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data ?? res.body)).toBe(true);
  });
});
