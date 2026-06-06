import { apiRequest } from './apiClient';
import type { DailyFeatureRow } from './types';

export type DailyFeaturesResponse = {
  from: string;
  to: string;
  rows: DailyFeatureRow[];
};

export async function getDailyFeatures(from: string, to: string): Promise<DailyFeaturesResponse> {
  const query = new URLSearchParams({ from, to });
  const response = await apiRequest<{ ok: boolean; from: string; to: string; rows: DailyFeatureRow[] }>({
    method: 'GET',
    path: `/features/daily?${query.toString()}`,
    body: undefined,
    includeAuth: true,
  });
  return {
    from: response.from,
    to: response.to,
    rows: response.rows,
  };
}
