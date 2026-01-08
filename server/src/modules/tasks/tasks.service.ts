import { prisma } from "../../db/prisma";
import { TaskStatus } from "@prisma/client";

type ListParams = {
    userId: string;
    status?: TaskStatus;
    q?: string;
    from?: Date;
    to?: Date;
    page: number;
    pageSize: number;
    sort: "createdAt" | "dueAt";
    order: "asc" | "desc";
};

export async function createTask(userId: string, data: { title: string; description?: string; dueAt?: Date }) {
    return prisma.task.create({
        data: {
            userId,
            title: data.title,
            description: data.description,
            dueAt: data.dueAt
        },
        select: {
            id: true,
            title: true,
            description: true,
            status: true,
            dueAt: true,
            createdAt: true,
            updatedAt: true
        }
    });
}

export async function listTasks(params: ListParams) {
    const where: any = { userId: params.userId };

    if (params.status) {
        where.status = params.status;
    }

    if (params.q) {
        where.OR = [
            { title: { contains: params.q, mode: "insensitive" } },
            { description: { contains: params.q, mode: "insensitive" } }
        ];
    }

    if (params.from || params.to) {
        where.createdAt = {};
        if (params.from) {
            where.createdAt.gte = params.from;
        }

        if (params.to){
            where.createdAt.lte = params.to;
        }
    }

    const skip = (params.page - 1) * params.pageSize;
    const take = params.pageSize;

    const [items, total] = await Promise.all([
        prisma.task.findMany({
            where,
            skip,
            take,
            orderBy: { [params.sort]: params.order },
            select: {
            id: true,
            title: true,
            description: true,
            status: true,
            dueAt: true,
            createdAt: true,
            updatedAt: true
            }
        }),
        prisma.task.count({ where })
    ]);

    const totalPages = Math.max(1, Math.ceil(total / params.pageSize));

    return {
        items,
        page: params.page,
        pageSize: params.pageSize,
        total,
        totalPages
    };
}

export async function updateTask(userId: string, taskId: string, data: any) {
    const existing = await prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!existing) {
        return null;
    }

    return prisma.task.update({
        where: { id: taskId },
        data,
        select: {
            id: true,
            title: true,
            description: true,
            status: true,
            dueAt: true,
            createdAt: true,
            updatedAt: true
        }
    });
}

export async function deleteTask(userId: string, taskId: string) {
    const existing = await prisma.task.findFirst({ where: { id: taskId, userId } });
    if (!existing) {
        return false;
    }

    await prisma.task.delete({ where: { id: taskId } });
    return true;
}
