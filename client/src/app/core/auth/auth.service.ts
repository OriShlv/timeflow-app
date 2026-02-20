import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';

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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getCurrentUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return this.getAccessToken() !== null;
  }

  login(email: string, password: string): Observable<AuthUser> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/login`, {
        email: email.toLowerCase(),
        password,
      })
      .pipe(
        map((res) => {
          this.setAuth(res);
          return res.user;
        }),
        catchError((err: HttpErrorResponse) =>
          throwError(() => this.parseAuthError(err, 'Login failed'))
        )
      );
  }

  register(email: string, password: string, name?: string): Observable<AuthUser> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/auth/register`, {
        email: email.toLowerCase(),
        password,
        ...(name != null && { name }),
      })
      .pipe(
        map((res) => {
          this.setAuth(res);
          return res.user;
        }),
        catchError((err: HttpErrorResponse) =>
          throwError(() => this.parseAuthError(err, 'Registration failed'))
        )
      );
  }

  private parseAuthError(err: HttpErrorResponse, fallback: string): Error {
    const body = err.error as AuthErrorResponse | undefined;
    const message = body?.error ?? fallback;
    return new Error(message);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private setAuth(auth: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, auth.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
  }
}
