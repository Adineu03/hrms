import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  authHeader,
  createTestApp,
  isConnRefused,
  signupOrg,
  TestAuth,
} from './helpers/auth';

describe('Attendance (e2e)', () => {
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
        console.warn('[attendance] DB not available — skipping all tests');
      } else {
        throw err;
      }
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('POST /api/v1/attendance/employee/clock/in (employee) → 201 or 200', async () => {
    if (!dbAvailable) return;

    const res = await request(app.getHttpServer())
      .post('/api/v1/attendance/employee/clock/in')
      .set(authHeader(admin.token))
      .send({ location: 'Office', notes: 'E2E clock-in' });

    // 201/200 = clocked in; 409 = already clocked in (idempotent scenario)
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(500);
    expect([200, 201, 409]).toContain(res.status);
  });

  it('GET /api/v1/attendance/admin/reports/daily-summary (admin) → 200', async () => {
    if (!dbAvailable) return;

    const today = new Date().toISOString().slice(0, 10);
    const res = await request(app.getHttpServer())
      .get(`/api/v1/attendance/admin/reports/daily-summary?date=${today}`)
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
  });

  it('GET /api/v1/attendance/employee/my-attendance/today (employee) → 200', async () => {
    if (!dbAvailable) return;

    const res = await request(app.getHttpServer())
      .get('/api/v1/attendance/employee/my-attendance/today')
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
  });

  it('GET /api/v1/attendance/employee/clock/status (employee) → 200', async () => {
    if (!dbAvailable) return;

    const res = await request(app.getHttpServer())
      .get('/api/v1/attendance/employee/clock/status')
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
  });
});
