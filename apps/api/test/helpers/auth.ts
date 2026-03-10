import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

export interface TestAuth {
  token: string;
  userId: string;
  orgId: string;
}

export function isConnRefused(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message ?? '';
  return (
    msg.includes('ECONNREFUSED') ||
    msg.includes('connect ETIMEDOUT') ||
    msg.includes('getaddrinfo') ||
    ('code' in (err as NodeJS.ErrnoException) &&
      (err as NodeJS.ErrnoException).code === 'ECONNREFUSED')
  );
}

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

export async function signupOrg(
  app: INestApplication,
  suffix?: string,
): Promise<TestAuth> {
  const s = suffix ?? Math.random().toString(36).slice(2, 10);
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/signup')
    .send({
      orgName: `Test Org ${s}`,
      industry: 'technology',
      firstName: 'Admin',
      lastName: 'Tester',
      email: `admin-${s}@hrms-test.local`,
      password: 'Password123!',
    });

  if (res.status !== 201) {
    throw new Error(
      `Signup failed (${res.status}): ${JSON.stringify(res.body)}`,
    );
  }

  return {
    token: res.body.tokens.accessToken,
    userId: res.body.user.id,
    orgId: res.body.user.orgId,
  };
}

export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
