import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createServer } from '../../src/app/server';
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

  beforeAll(async () => {
    const auth = await registerAndGetToken();
    accessToken = auth.accessToken;
    userId = auth.userId;
  });

  afterAll(async () => {
    await prisma.task.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
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
      await request(app)
        .post('/tasks')
        .send({ title: 'No auth task' })
        .expect(401);
    });

    it('rejects invalid token', async () => {
      await request(app)
        .post('/tasks')
        .set('Authorization', 'Bearer invalid-token')
        .send({ title: 'Task' })
        .expect(401);
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
  });
});
