export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthResponse {
  ok: boolean;
  user: AuthUser;
  accessToken: string;
}

export interface AuthErrorResponse {
  ok: boolean;
  error: string;
}

export type TaskStatus = 'PENDING' | 'DONE' | 'CANCELED';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListTasksParams {
  status?: TaskStatus;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  sort?: 'createdAt' | 'dueAt';
  order?: 'asc' | 'desc';
}

export interface ListTasksResult {
  items: Task[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CreateTaskBody {
  title: string;
  description: string | undefined;
  dueAt: string | undefined;
}

export interface UpdateTaskBody {
  title: string | undefined;
  description: string | null | undefined;
  status: TaskStatus | undefined;
  dueAt: string | null | undefined;
}

export interface TaskSummary {
  total: number;
  done: number;
  pending: number;
  canceled: number;
  overdue: number;
  completionRate: number;
}

export interface InsightsSegment {
  segment: number;
  label: string;
  updatedAt: string;
  featuresRef: unknown;
}

export interface InsightsRecommendation {
  id: string;
  message: string;
  evidence: unknown;
  expiresAt: string | null;
  updatedAt: string;
}

export interface InsightsDaily {
  id: string;
  userId: string;
  day: string;
  createdCount: number;
  completedCount: number;
  completionRate: number;
  tasksWithDueAt: number;
  overdueCount: number;
  avgCompletionLagH: number;
  createdMorning: number;
  createdAfternoon: number;
  createdEvening: number;
  createdNight: number;
  updatedAt: string;
}

export interface Insights {
  ok: boolean;
  taskSummary: TaskSummary;
  segment: InsightsSegment | null;
  daily: InsightsDaily | null;
  recommendations: InsightsRecommendation[];
}
