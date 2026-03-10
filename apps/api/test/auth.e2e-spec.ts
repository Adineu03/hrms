import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  authHeader,
  createTestApp,
  isConnRefused,
  signupOrg,
} from './helpers/auth';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dbAvailable = false;
  let adminToken: string;
  const suffix = Math.random().toString(36).slice(2, 10);
  const email = `admin-${suffix}@hrms-test.local`;
  const password = 'Password123!';

  beforeAll(async () => {
    try {
      app = await createTestApp();
      dbAvailable = true;
    } catch (err) {
      if (isConnRefused(err)) {
        console.warn('[auth] DB not available — skipping all tests');
      } else {
        throw err;
      }
    }
  });

  afterAll(async () => {
    await app?.close();
  });

  it('POST /api/v1/auth/signup → 201 + tokens', async () => {
    if (!dbAvailable) return;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        orgName: `E2E Auth Org ${suffix}`,
        industry: 'technology',
        firstName: 'Admin',
        lastName: 'User',
        email,
        password,
      });

    expect(res.status).toBe(201);
    expect(res.body.tokens).toBeDefined();
    expect(res.body.tokens.accessToken).toBeTruthy();
    expect(res.body.tokens.refreshToken).toBeTruthy();
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.role).toBe('super_admin');

    adminToken = res.body.tokens.accessToken;
  });

  it('POST /api/v1/auth/login → 200 + tokens', async () => {
    if (!dbAvailable) return;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password });

    // NestJS @Post defaults to 201; login semantically returns tokens
    expect([200, 201]).toContain(res.status);
    expect(res.body.tokens.accessToken).toBeTruthy();
    expect(res.body.user.email).toBe(email);
  });

  it('POST /api/v1/auth/login (wrong password) → 401', async () => {
    if (!dbAvailable) return;

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'WrongPassword!' });

    expect(res.status).toBe(401);
  });

  it('GET /api/v1/modules (with token) → 200', async () => {
    if (!dbAvailable) return;
    if (!adminToken) {
      const auth = await signupOrg(app, `auth-me-${suffix}`);
      adminToken = auth.token;
    }

    const res = await request(app.getHttpServer())
      .get('/api/v1/modules')
      .set(authHeader(adminToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/v1/modules (no token) → 401', async () => {
    if (!dbAvailable) return;

    const res = await request(app.getHttpServer()).get('/api/v1/modules');

    expect(res.status).toBe(401);
  });
});
