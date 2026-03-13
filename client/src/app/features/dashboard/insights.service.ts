import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

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

interface InsightsApiResponse {
  ok: boolean;
  taskSummary: TaskSummary;
  segment: InsightsSegment | null;
  daily: InsightsDaily | null;
  recommendations: InsightsRecommendation[];
}

@Injectable({ providedIn: 'root' })
export class InsightsService {
  private readonly apiUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  getInsights(): Observable<Insights> {
    return this.http
      .get<InsightsApiResponse>(`${this.apiUrl}/insights`)
      .pipe(
        map((res) => ({
          ok: res.ok,
          taskSummary: res.taskSummary,
          segment: res.segment,
          daily: res.daily,
          recommendations: res.recommendations,
        })),
        catchError((err: HttpErrorResponse) =>
          throwError(() => this.parseError(err, 'Insights failed'))
        )
      );
  }

  private parseError(err: HttpErrorResponse, fallback: string): Error {
    const body = err.error as { error?: string } | undefined;
    const message = body?.error ?? fallback;
    return new Error(message);
  }
}
