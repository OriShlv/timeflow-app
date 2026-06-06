import { getApiUrl } from './env';
import type { AuthErrorResponse, AuthResponse, AuthUser } from './types';

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
    return JSON.parse(raw) as AuthUser;
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

function parseAuthError(body: AuthErrorResponse | undefined, fallback: string): Error {
  const message = body?.error !== undefined ? body.error : fallback;
  return new Error(message);
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await fetch(`${getApiUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.toLowerCase(), password }),
  });

  const body = (await response.json()) as AuthResponse | AuthErrorResponse;
  if (!response.ok) {
    throw parseAuthError(body as AuthErrorResponse, 'Login failed');
  }
  const auth = body as AuthResponse;
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

  const response = await fetch(`${getApiUrl()}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const body = (await response.json()) as AuthResponse | AuthErrorResponse;
  if (!response.ok) {
    throw parseAuthError(body as AuthErrorResponse, 'Registration failed');
  }
  const auth = body as AuthResponse;
  setAuth(auth);
  return auth.user;
}

export function logout(): void {
  clearAuth();
}
