import { apiRequest } from './apiClient';
import type { Insights } from './types';

export async function getInsights(): Promise<Insights> {
  const response = await apiRequest<Insights>({
    method: 'GET',
    path: '/insights',
    body: undefined,
    includeAuth: true,
  });
  return {
    ok: response.ok,
    taskSummary: response.taskSummary,
    segment: response.segment,
    daily: response.daily,
    recommendations: response.recommendations,
  };
}
