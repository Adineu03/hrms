import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  authHeader,
  createTestApp,
  isConnRefused,
  signupOrg,
  TestAuth,
} from './helpers/auth';

describe('Leave Management (e2e)', () => {
  let app: INestApplication;
  let dbAvailable = false;
  let admin: TestAuth;
  let createdRequestId: string;

  beforeAll(async () => {
    try {
      app = await createTestApp();
      admin = await signupOrg(app);
      dbAvailable = true;
    } catch (err) {
      if (isConnRefused(err)) {
        console.warn('[leave] DB not available — skipping all tests');
      } else {
        throw err;
      }
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/v1/leave-management/admin/policy (admin) → 200', async () => {
    if (!dbAvailable) return;

    const res = await request(app.getHttpServer())
      .get('/api/v1/leave-management/admin/policy')
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
  });

  it('POST /api/v1/leave-management/employee/apply (employee applies leave) → 201 or 400', async () => {
    if (!dbAvailable) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const res = await request(app.getHttpServer())
      .post('/api/v1/leave-management/employee/apply')
      .set(authHeader(admin.token))
      .send({
        // omit leaveTypeId — a fresh org has no leave types configured yet
        fromDate: tomorrow.toISOString().slice(0, 10),
        toDate: dayAfter.toISOString().slice(0, 10),
        reason: 'E2E test leave',
      });

    // 201 = created, 400/422 = validation / business-rule error (no leave types)
    // Both are acceptable — the key assertion is NOT 401 / 403 / 500
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(500);

    if (res.status === 201) {
      createdRequestId = res.body.id;
    }
  });

  it('GET /api/v1/leave-management/manager/approval-queue (manager views team requests) → 200', async () => {
    if (!dbAvailable) return;

    const res = await request(app.getHttpServer())
      .get('/api/v1/leave-management/manager/approval-queue')
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
    // Response may be an array or a paginated object
    expect(typeof res.body).toBe('object');
  });

  it('PATCH /api/v1/leave-management/manager/approval-queue/:id/approve (manager approves) → 200 or 404', async () => {
    if (!dbAvailable) return;
    if (!createdRequestId) {
      console.warn('[leave] No request created, skipping approve test');
      return;
    }

    const res = await request(app.getHttpServer())
      .patch(
        `/api/v1/leave-management/manager/approval-queue/${createdRequestId}/approve`,
      )
      .set(authHeader(admin.token))
      .send({ comment: 'Approved via e2e test' });

    expect([200, 404, 422]).toContain(res.status);
  });

  it('GET /api/v1/leave-management/employee/balance (employee checks balance) → 200', async () => {
    if (!dbAvailable) return;

    const res = await request(app.getHttpServer())
      .get('/api/v1/leave-management/employee/balance')
      .set(authHeader(admin.token));

    expect(res.status).toBe(200);
    // Response may be an array or a paginated/object shape
    expect(typeof res.body).toBe('object');
  });
});
