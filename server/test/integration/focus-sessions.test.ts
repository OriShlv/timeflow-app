import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createServer } from '../../src/app/server';
import { prisma } from '../../src/db/prisma';

const app = createServer();

async function registerAndGetToken(): Promise<{ userId: string; accessToken: string }> {
  const email = `focus-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request(app)
    .post('/auth/register')
    .send({ email, password: 'password123', name: 'Focus User' })
    .expect(201);

  return {
    userId: res.body.user.id,
    accessToken: res.body.accessToken,
  };
}

describe('Focus sessions API', () => {
  let userId = '';

  afterAll(async () => {
    await prisma.focusSession.deleteMany({ where: { userId } });
    await prisma.taskEvent.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  });

  it('starts and completes a taskless focus session without task event publishing failures', async () => {
    const auth = await registerAndGetToken();
    userId = auth.userId;

    const startRes = await request(app)
      .post('/focus-sessions/start')
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .send({})
      .expect(201);

    expect(startRes.body.ok).toBe(true);
    expect(startRes.body.session).toMatchObject({
      userId,
      taskId: null,
      status: 'RUNNING',
      actualMinutes: 0,
    });

    const startedAt = new Date(startRes.body.session.startedAt);
    const endedAt = new Date(startedAt.getTime() + 120000).toISOString();

    const stopRes = await request(app)
      .post(`/focus-sessions/${startRes.body.session.id}/stop`)
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .send({ endedAt })
      .expect(200);

    expect(stopRes.body.session).toMatchObject({
      taskId: null,
      status: 'COMPLETED',
      actualMinutes: 2,
    });

    const summaryRes = await request(app)
      .get(`/focus-sessions/summary/daily?day=${encodeURIComponent(startRes.body.session.startedAt)}`)
      .set('Authorization', `Bearer ${auth.accessToken}`)
      .expect(200);

    expect(summaryRes.body.summary.totalMinutes).toBe(2);
    expect(summaryRes.body.summary.completedSessionsCount).toBe(1);
    expect(summaryRes.body.summary.byTask).toEqual([
      {
        taskId: null,
        minutes: 2,
        sessionsCount: 1,
      },
    ]);

    const tasklessEvents = await prisma.taskEvent.findMany({
      where: { userId, type: { startsWith: 'FOCUS_SESSION_' } },
    });
    expect(tasklessEvents).toHaveLength(0);
  });
});
