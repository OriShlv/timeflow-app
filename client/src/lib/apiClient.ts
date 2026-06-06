import { clearAuth, getAccessToken } from './auth';
import { getApiUrl } from './env';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export type ApiRequestOptions = {
  method: string;
  path: string;
  body: unknown | undefined;
  includeAuth: boolean;
};

async function parseJsonBody<T>(response: Response): Promise<T | undefined> {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

function parseErrorMessage(body: { error?: string } | undefined, fallback: string): string {
  return body?.error !== undefined ? body.error : fallback;
}

export async function apiRequest<T>(options: ApiRequestOptions): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  let sentAuth = false;

  if (options.includeAuth) {
    const token = getAccessToken();
    if (token !== null) {
      headers.Authorization = `Bearer ${token}`;
      sentAuth = true;
    }
  }

  const response = await fetch(`${getApiUrl()}${options.path}`, {
    method: options.method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401 && sentAuth) {
    clearAuth();
    if (onUnauthorized !== null) {
      onUnauthorized();
    }
    throw new ApiError(401, 'Unauthorized');
  }

  if (!response.ok) {
    const body = await parseJsonBody<{ error?: string }>(response);
    throw new ApiError(response.status, parseErrorMessage(body, 'Request failed'));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await parseJsonBody<T>(response);
  if (body === undefined) {
    throw new ApiError(response.status, 'Empty response body');
  }
  return body;
}
