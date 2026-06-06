import { apiRequest } from './apiClient';
import type {
  CreateTaskBody,
  ListTasksParams,
  ListTasksResult,
  Task,
  UpdateTaskBody,
} from './types';

function buildTasksQuery(params: ListTasksParams): string {
  const query = new URLSearchParams();
  if (params.status !== undefined) {
    query.set('status', params.status);
  }
  if (params.q !== undefined) {
    query.set('q', params.q);
  }
  if (params.from !== undefined) {
    query.set('from', params.from);
  }
  if (params.to !== undefined) {
    query.set('to', params.to);
  }
  if (params.page !== undefined) {
    query.set('page', String(params.page));
  }
  if (params.pageSize !== undefined) {
    query.set('pageSize', String(params.pageSize));
  }
  if (params.sort !== undefined) {
    query.set('sort', params.sort);
  }
  if (params.order !== undefined) {
    query.set('order', params.order);
  }
  const qs = query.toString();
  return qs.length > 0 ? `?${qs}` : '';
}

export async function getTasks(params: ListTasksParams): Promise<ListTasksResult> {
  const response = await apiRequest<{ ok: boolean } & ListTasksResult>({
    method: 'GET',
    path: `/tasks${buildTasksQuery(params)}`,
    body: undefined,
    includeAuth: true,
  });
  return {
    items: response.items,
    page: response.page,
    pageSize: response.pageSize,
    total: response.total,
    totalPages: response.totalPages,
  };
}

export async function createTask(body: CreateTaskBody): Promise<Task> {
  const response = await apiRequest<{ ok: boolean; task: Task }>({
    method: 'POST',
    path: '/tasks',
    body,
    includeAuth: true,
  });
  return response.task;
}

export async function updateTask(id: string, body: UpdateTaskBody): Promise<Task> {
  const response = await apiRequest<{ ok: boolean; task: Task }>({
    method: 'PATCH',
    path: `/tasks/${id}`,
    body,
    includeAuth: true,
  });
  return response.task;
}

export async function deleteTask(id: string): Promise<void> {
  await apiRequest<void>({
    method: 'DELETE',
    path: `/tasks/${id}`,
    body: undefined,
    includeAuth: true,
  });
}
