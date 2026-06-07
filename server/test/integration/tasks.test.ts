import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createServer } from '../../src/app/server';
import { env } from '../../src/config/env';
import { prisma } from '../../src/db/prisma';

const app = createServer();

async function registerAndGetToken(): Promise<{ userId: string; accessToken: string }> {
  const email = `tasks-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const res = await request(app)
    .post('/auth/register')
    .send({ email, password: 'password123', name: 'Tasks User' });
  const { user, accessToken } = res.body;
  return { userId: user.id, accessToken };
}

describe('Tasks API', () => {
  let accessToken: string;
  let userId: string;
  let otherUserId: string;

  beforeAll(async () => {
    const auth = await registerAndGetToken();
    accessToken = auth.accessToken;
    userId = auth.userId;

    const otherAuth = await registerAndGetToken();
    otherUserId = otherAuth.userId;
  });

  afterAll(async () => {
    await prisma.task.deleteMany({ where: { userId: { in: [userId, otherUserId] } } });
    await prisma.taskEvent.deleteMany({ where: { userId: { in: [userId, otherUserId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userId, otherUserId] } } });
  });

  describe('POST /tasks', () => {
    it('creates task and returns 201', async () => {
      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'My first task', description: 'Optional desc' })
        .expect(201);

      expect(res.body.ok).toBe(true);
      expect(res.body.task).toMatchObject({
        title: 'My first task',
        description: 'Optional desc',
        status: 'PENDING',
      });
      expect(res.body.task.id).toBeDefined();
      expect(res.body.task.createdAt).toBeDefined();
    });

    it('rejects without auth', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'No auth task' })
        .expect(401);

      expect(res.body.error).toBe('MissingAuth');
    });

    it('rejects invalid token', async () => {
      const res = await request(app)
        .post('/tasks')
        .set('Authorization', 'Bearer invalid-token')
        .send({ title: 'Task' })
        .expect(401);

      expect(res.body.error).toBe('InvalidToken');
    });

    it('rejects expired token', async () => {
      const expiredToken = jwt.sign(
        { sub: userId, email: 'expired@example.com' },
        env.JWT_SECRET,
        { expiresIn: -1 }
      );

      const res = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ title: 'Task' })
        .expect(401);

      expect(res.body.error).toBe('ExpiredToken');
    });

    it('rejects empty title', async () => {
      await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: '' })
        .expect(400);
    });
  });

  describe('GET /tasks', () => {
    beforeAll(async () => {
      await prisma.task.createMany({
        data: [
          { userId, title: 'Task A', status: 'PENDING' },
          { userId, title: 'Task B', status: 'DONE' },
        ],
      });
    });

    it('returns paginated tasks', async () => {
      const res = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.page).toBe(1);
      expect(res.body.pageSize).toBeDefined();
      expect(res.body.total).toBeGreaterThanOrEqual(2);
    });

    it('filters by status', async () => {
      const res = await request(app)
        .get('/tasks?status=DONE')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.items.every((t: { status: string }) => t.status === 'DONE')).toBe(true);
    });

    it('rejects without auth', async () => {
      await request(app).get('/tasks').expect(401);
    });
  });

  describe('PATCH /tasks/:id', () => {
    let taskId: string;

    beforeAll(async () => {
      const task = await prisma.task.create({
        data: { userId, title: 'To update', status: 'PENDING' },
      });
      taskId = task.id;
    });

    it('updates task', async () => {
      const res = await request(app)
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Updated title', status: 'DONE' })
        .expect(200);

      expect(res.body.task.title).toBe('Updated title');
      expect(res.body.task.status).toBe('DONE');
    });

    it('returns 404 for non-existent task', async () => {
      const fakeId = 'clxxxxxxxxxxxxxxxxxxxxxxxxxx';
      const res = await request(app)
        .patch(`/tasks/${fakeId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'New' })
        .expect(404);

      expect(res.body.error).toBe('TaskNotFound');
    });

    it('returns 404 when updating another user task', async () => {
      const foreignTask = await prisma.task.create({
        data: { userId: otherUserId, title: 'Foreign task', status: 'PENDING' },
      });

      const res = await request(app)
        .patch(`/tasks/${foreignTask.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Unauthorized update' })
        .expect(404);

      expect(res.body.error).toBe('TaskNotFound');
    });
  });

  describe('DELETE /tasks/:id', () => {
    let taskId: string;

    beforeAll(async () => {
      const task = await prisma.task.create({
        data: { userId, title: 'To delete', status: 'PENDING' },
      });
      taskId = task.id;
    });

    it('deletes task and returns 204', async () => {
      await request(app)
        .delete(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      const found = await prisma.task.findUnique({ where: { id: taskId } });
      expect(found).toBeNull();
    });

    it('returns 404 for already deleted or non-existent', async () => {
      const res = await request(app)
        .delete(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(res.body.error).toBe('TaskNotFound');
    });

    it('returns 404 when deleting another user task', async () => {
      const foreignTask = await prisma.task.create({
        data: { userId: otherUserId, title: 'Do not delete me', status: 'PENDING' },
      });

      const res = await request(app)
        .delete(`/tasks/${foreignTask.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(res.body.error).toBe('TaskNotFound');

      const stillExists = await prisma.task.findUnique({ where: { id: foreignTask.id } });
      expect(stillExists).not.toBeNull();
      expect(stillExists?.userId).toBe(otherUserId);
    });

    it('preserves subtasks when deleting their parent task', async () => {
      const parent = await prisma.task.create({
        data: { userId, title: 'Parent task', status: 'PENDING' },
      });
      const subtask = await prisma.task.create({
        data: {
          userId,
          title: 'Subtask to keep',
          status: 'PENDING',
          parentTaskId: parent.id,
        },
      });

      await request(app)
        .delete(`/tasks/${parent.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      const preservedSubtask = await prisma.task.findUnique({ where: { id: subtask.id } });
      expect(preservedSubtask).not.toBeNull();
      expect(preservedSubtask?.parentTaskId).toBeNull();
    });
  });

  describe('Ownership isolation', () => {
    it('does not list another user tasks', async () => {
      const ownTask = await prisma.task.create({
        data: { userId, title: 'My own list task', status: 'PENDING' },
      });
      const otherTask = await prisma.task.create({
        data: { userId: otherUserId, title: 'Other list task', status: 'PENDING' },
      });

      const res = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const ids = new Set(res.body.items.map((task: { id: string }) => task.id));
      expect(ids.has(ownTask.id)).toBe(true);
      expect(ids.has(otherTask.id)).toBe(false);
    });
  });

  describe('Task completion event idempotency', () => {
    it('creates TASK_COMPLETED once for first DONE transition only', async () => {
      const task = await prisma.task.create({
        data: { userId, title: 'Idempotency task', status: 'PENDING' },
      });
      const dedupeKey = `TASK_COMPLETED:${task.id}`;

      await request(app)
        .patch(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'DONE' })
        .expect(200);

      await request(app)
        .patch(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'DONE' })
        .expect(200);

      await request(app)
        .patch(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'PENDING' })
        .expect(200);

      await request(app)
        .patch(`/tasks/${task.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'DONE' })
        .expect(200);

      const completionEvents = await prisma.taskEvent.findMany({
        where: { userId, taskId: task.id, type: 'TASK_COMPLETED' },
      });
      expect(completionEvents).toHaveLength(1);
      expect(completionEvents[0]?.dedupeKey).toBe(dedupeKey);
    });
  });
});
