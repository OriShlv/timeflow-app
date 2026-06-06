import { apiRequest } from './apiClient';
import type {
  DailyFocusSummary,
  FocusSession,
  ListFocusSessionsParams,
  ListFocusSessionsResult,
} from './types';

function buildQuery(params: ListFocusSessionsParams): string {
  const query = new URLSearchParams();
  if (params.from !== undefined) {
    query.set('from', params.from);
  }
  if (params.to !== undefined) {
    query.set('to', params.to);
  }
  if (params.taskId !== undefined) {
    query.set('taskId', params.taskId);
  }
  if (params.status !== undefined) {
    query.set('status', params.status);
  }
  if (params.page !== undefined) {
    query.set('page', String(params.page));
  }
  if (params.pageSize !== undefined) {
    query.set('pageSize', String(params.pageSize));
  }
  const qs = query.toString();
  if (qs.length === 0) {
    return '';
  }
  return `?${qs}`;
}

export async function listFocusSessions(params: ListFocusSessionsParams): Promise<ListFocusSessionsResult> {
  const response = await apiRequest<{ ok: boolean } & ListFocusSessionsResult>({
    method: 'GET',
    path: `/focus-sessions${buildQuery(params)}`,
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

export async function startFocusSession(taskId: string | undefined): Promise<FocusSession> {
  const response = await apiRequest<{ ok: boolean; session: FocusSession }>({
    method: 'POST',
    path: '/focus-sessions/start',
    body: taskId === undefined ? {} : { taskId },
    includeAuth: true,
  });
  return response.session;
}

export async function stopFocusSession(id: string): Promise<FocusSession> {
  const response = await apiRequest<{ ok: boolean; session: FocusSession }>({
    method: 'POST',
    path: `/focus-sessions/${id}/stop`,
    body: {},
    includeAuth: true,
  });
  return response.session;
}

export async function cancelFocusSession(id: string): Promise<FocusSession> {
  const response = await apiRequest<{ ok: boolean; session: FocusSession }>({
    method: 'POST',
    path: `/focus-sessions/${id}/cancel`,
    body: {},
    includeAuth: true,
  });
  return response.session;
}

export async function getDailyFocusSummary(day: string | undefined): Promise<DailyFocusSummary> {
  const query = day === undefined ? '' : `?day=${encodeURIComponent(day)}`;
  const response = await apiRequest<{ ok: boolean; summary: DailyFocusSummary }>({
    method: 'GET',
    path: `/focus-sessions/summary/daily${query}`,
    body: undefined,
    includeAuth: true,
  });
  return response.summary;
}
