import { apiRequest } from './apiClient';
import { getMe as fetchMeFromApi } from './usersApi';
import type { AuthResponse, AuthUser } from './types';

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';

interface JwtPayload {
  exp: number | undefined;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (payload === null || payload.exp === undefined) {
    return true;
  }
  return payload.exp * 1000 <= Date.now();
}

export function getAccessToken(): string | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token === null || token.length === 0) {
    return null;
  }
  if (isTokenExpired(token)) {
    clearAuth();
    return null;
  }
  return token;
}

export function getCurrentUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (raw === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AuthUser> & { id: string; email: string };
    return {
      id: parsed.id,
      email: parsed.email,
      name: parsed.name ?? null,
      timezone: parsed.timezone ?? 'UTC',
      language: parsed.language ?? 'en',
      createdAt: parsed.createdAt ?? new Date(0).toISOString(),
    };
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return getAccessToken() !== null;
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function setAuth(auth: AuthResponse): void {
  localStorage.setItem(TOKEN_KEY, auth.accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
}

export function updateStoredUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const user = await fetchMeFromApi();
  updateStoredUser(user);
  return user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const auth = await apiRequest<AuthResponse>({
    method: 'POST',
    path: '/auth/login',
    body: { email: email.toLowerCase(), password },
    includeAuth: false,
  });
  setAuth(auth);
  return auth.user;
}

export async function register(
  email: string,
  password: string,
  name: string | undefined,
): Promise<AuthUser> {
  const payload: { email: string; password: string; name?: string } = {
    email: email.toLowerCase(),
    password,
  };
  if (name !== undefined) {
    payload.name = name;
  }

  const auth = await apiRequest<AuthResponse>({
    method: 'POST',
    path: '/auth/register',
    body: payload,
    includeAuth: false,
  });
  setAuth(auth);
  return auth.user;
}

export function logout(): void {
  clearAuth();
}
