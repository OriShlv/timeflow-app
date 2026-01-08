import { Router } from "express";
import { requireAuth, AuthedRequest } from "../../app/middleware/require-auth";
import {
  createTaskSchema,
  updateTaskSchema,
  listTasksQuerySchema,
  toDateOrUndefined
} from "./tasks.schemas";
import { createTask, deleteTask, listTasks, updateTask } from "./tasks.service";
import { TaskStatus } from "@prisma/client";

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

tasksRouter.post("/", async (req: AuthedRequest, res, next) => {
    try {
        const body = createTaskSchema.parse(req.body);

        const task = await createTask(req.user!.id, {
            title: body.title,
            description: body.description,
            dueAt: body.dueAt ? new Date(body.dueAt) : undefined
        });

        res.status(201).json({ ok: true, task });
    } catch (err) {
        next(err);
    }
});

tasksRouter.get("/", async (req: AuthedRequest, res, next) => {
    try {
        const q = listTasksQuerySchema.parse(req.query);

        const result = await listTasks({
            userId: req.user!.id,
            status: q.status as TaskStatus | undefined,
            q: q.q,
            from: toDateOrUndefined(q.from),
            to: toDateOrUndefined(q.to),
            page: q.page,
            pageSize: q.pageSize,
            sort: q.sort,
            order: q.order
        });

        res.json({ ok: true, ...result });
    } catch (err) {
        next(err);
    }
});

tasksRouter.patch("/:id", async (req: AuthedRequest, res, next) => {
    try {
        const body = updateTaskSchema.parse(req.body);
        const id = req.params.id;

        const updated = await updateTask(req.user!.id, id, {
            ...(body.title !== undefined ? { title: body.title } : {}),
            ...(body.description !== undefined ? { description: body.description } : {}),
            ...(body.status !== undefined ? { status: body.status } : {}),
            ...(body.dueAt !== undefined ? { dueAt: body.dueAt ? new Date(body.dueAt) : null } : {})
        });

        if (!updated) { 
            return res.status(404).json({ ok: false, error: "TaskNotFound" });
        }

        res.json({ ok: true, task: updated });
    } catch (err) {
        next(err);
    }
});

tasksRouter.delete("/:id", async (req: AuthedRequest, res, next) => {
    try {
        const id = req.params.id;
        const ok = await deleteTask(req.user!.id, id);

        if (!ok) {
            return res.status(404).json({ ok: false, error: "TaskNotFound" });
        }

        res.status(204).send();
    } catch (err) {
        next(err);
    }
});
