import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

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
  description?: string;
  dueAt?: string;
}

export interface UpdateTaskBody {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  dueAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class TasksService {
  private readonly apiUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  getTasks(params: ListTasksParams = {}): Observable<ListTasksResult> {
    const query = new URLSearchParams();
    if (params.status != null) query.set('status', params.status);
    if (params.q != null) query.set('q', params.q);
    if (params.from != null) query.set('from', params.from);
    if (params.to != null) query.set('to', params.to);
    if (params.page != null) query.set('page', String(params.page));
    if (params.pageSize != null) query.set('pageSize', String(params.pageSize));
    if (params.sort != null) query.set('sort', params.sort);
    if (params.order != null) query.set('order', params.order);

    const qs = query.toString();
    const url = qs ? `${this.apiUrl}/tasks?${qs}` : `${this.apiUrl}/tasks`;

    return this.http.get<{ ok: boolean } & ListTasksResult>(url).pipe(
      map((res) => ({
        items: res.items,
        page: res.page,
        pageSize: res.pageSize,
        total: res.total,
        totalPages: res.totalPages,
      }))
    );
  }

  createTask(body: CreateTaskBody): Observable<Task> {
    return this.http
      .post<{ ok: boolean; task: Task }>(`${this.apiUrl}/tasks`, body)
      .pipe(
        map((res) => res.task),
        catchError((err: HttpErrorResponse) =>
          throwError(() => this.parseError(err, 'Create failed'))
        )
      );
  }

  updateTask(id: string, body: UpdateTaskBody): Observable<Task> {
    return this.http
      .patch<{ ok: boolean; task: Task }>(`${this.apiUrl}/tasks/${id}`, body)
      .pipe(
        map((res) => res.task),
        catchError((err: HttpErrorResponse) =>
          throwError(() => this.parseError(err, 'Update failed'))
        )
      );
  }

  deleteTask(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tasks/${id}`).pipe(
      map(() => undefined),
      catchError((err: HttpErrorResponse) =>
        throwError(() => this.parseError(err, 'Delete failed'))
      )
    );
  }

  private parseError(err: HttpErrorResponse, fallback: string): Error {
    const body = err.error as { error?: string } | undefined;
    const message = body?.error ?? fallback;
    return new Error(message);
  }
}
