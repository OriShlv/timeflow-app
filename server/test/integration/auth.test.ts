import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createServer } from '../../src/app/server';
import { prisma } from '../../src/db/prisma';
import { env } from '../../src/config/env';

const app = createServer();

describe('POST /auth/register', () => {
  const email = `test-${Date.now()}@example.com`;

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
  });

  it('creates user and returns accessToken', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email, password: 'password123', name: 'Test User' })
      .expect(201);

    expect(res.body.ok).toBe(true);
    expect(res.body.user).toMatchObject({ email, name: 'Test User' });
    expect(res.body.user.id).toBeDefined();
    expect(res.body.accessToken).toBeDefined();
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('rejects duplicate email with 409', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email, password: 'otherpass456', name: 'Other' })
      .expect(409);

    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('EmailAlreadyExists');
  });

  it('rejects invalid payload (short password)', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'new@example.com', password: 'short' });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.body.ok).toBe(false);
  });
});

describe('POST /auth/login', () => {
  const email = `login-${Date.now()}@example.com`;
  const password = 'loginpass123';

  beforeAll(async () => {
    await request(app).post('/auth/register').send({ email, password, name: 'Login User' });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
  });

  it('returns accessToken for valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    expect(res.body.ok).toBe(true);
    expect(res.body.user).toMatchObject({ email });
    expect(res.body.accessToken).toBeDefined();
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email, password: 'wrongpassword' })
      .expect(401);

    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'anypassword' })
      .expect(401);

    expect(res.body.ok).toBe(false);
  });
});

describe('Auth middleware behavior on protected routes', () => {
  const email = `guard-${Date.now()}@example.com`;
  const password = 'guardpass123';
  let userId = '';

  beforeAll(async () => {
    const registerRes = await request(app)
      .post('/auth/register')
      .send({ email, password, name: 'Guard User' })
      .expect(201);
    userId = registerRes.body.user.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
  });

  it('returns 401 MissingAuth for non-bearer authorization header', async () => {
    const res = await request(app)
      .get('/tasks')
      .set('Authorization', 'Token some-token')
      .expect(401);

    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('MissingAuth');
  });

  it('returns 401 ExpiredToken for expired jwt bearer token', async () => {
    const expiredToken = jwt.sign(
      { sub: userId, email },
      env.JWT_SECRET,
      { expiresIn: -1 }
    );

    const res = await request(app)
      .get('/tasks')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);

    expect(res.body.ok).toBe(false);
    expect(res.body.error).toBe('ExpiredToken');
  });
});
