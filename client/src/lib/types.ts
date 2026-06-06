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
  type: string;
  score: number;
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

export type FocusSessionStatus = 'RUNNING' | 'COMPLETED' | 'CANCELED';

export interface FocusSession {
  id: string;
  userId: string;
  taskId: string | null;
  status: FocusSessionStatus;
  startedAt: string;
  endedAt: string | null;
  plannedMinutes: number | null;
  actualMinutes: number;
  source: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FocusSessionTaskSummary {
  taskId: string | null;
  minutes: number;
  sessionsCount: number;
}

export interface DailyFocusSummary {
  day: string;
  totalMinutes: number;
  sessionsCount: number;
  completedSessionsCount: number;
  byTask: FocusSessionTaskSummary[];
}

export interface ListFocusSessionsParams {
  from?: string;
  to?: string;
  taskId?: string;
  status?: FocusSessionStatus;
  page?: number;
  pageSize?: number;
}

export interface ListFocusSessionsResult {
  items: FocusSession[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DailyFeatureRow {
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
}
