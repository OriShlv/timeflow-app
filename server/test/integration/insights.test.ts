import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createServer } from '../../src/app/server';
import { prisma } from '../../src/db/prisma';

const app = createServer();

async function registerAndGetToken(): Promise<{ userId: string; accessToken: string }> {
  const email = `insights-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request(app)
    .post('/auth/register')
    .send({ email, password: 'password123', name: 'Insights User' })
    .expect(201);

  return {
    userId: res.body.user.id,
    accessToken: res.body.accessToken,
  };
}

describe('Insights + recommendations consistency', () => {
  let userId: string;
  let accessToken: string;
  let otherUserId: string;

  beforeAll(async () => {
    const auth = await registerAndGetToken();
    userId = auth.userId;
    accessToken = auth.accessToken;

    const otherAuth = await registerAndGetToken();
    otherUserId = otherAuth.userId;

    const now = Date.now();
    const activeData = Array.from({ length: 6 }).map((_, idx) => ({
      userId,
      type: `active_${idx}`,
      score: 100 - idx,
      message: `active message ${idx}`,
      evidence: { idx },
      expiresAt: new Date(now + 60 * 60 * 1000),
    }));

    await prisma.userRecommendation.createMany({
      data: [
        ...activeData,
        {
          userId,
          type: 'expired_old',
          score: 999,
          message: 'expired should be filtered',
          evidence: { expired: true },
          expiresAt: new Date(now - 60 * 60 * 1000),
        },
        {
          userId: otherUserId,
          type: 'other_user_active',
          score: 500,
          message: 'other user recommendation',
          evidence: { foreign: true },
          expiresAt: new Date(now + 60 * 60 * 1000),
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.userRecommendation.deleteMany({ where: { userId: { in: [userId, otherUserId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  });

  it('returns same active recommendation ordering policy in /recommendations and /insights', async () => {
    const [recsRes, insightsRes] = await Promise.all([
      request(app)
        .get('/recommendations')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200),
      request(app)
        .get('/insights')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200),
    ]);

    const recommendationsMessages = recsRes.body.items.map((item: { message: string }) => item.message);
    const insightsMessages = insightsRes.body.recommendations.map((item: { message: string }) => item.message);

    expect(recommendationsMessages).toHaveLength(6);
    expect(insightsMessages).toHaveLength(5);
    expect(insightsMessages).toEqual(recommendationsMessages.slice(0, 5));
    expect(recommendationsMessages).not.toContain('expired should be filtered');
    expect(recommendationsMessages).not.toContain('other user recommendation');
  });
});
