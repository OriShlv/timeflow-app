import { clearAuth, getAccessToken } from './auth';
import { getApiUrl } from './env';

export class ApiError extends Error {
  readonly status: number;
  readonly retryable: boolean;

  constructor(status: number, message: string, retryable: boolean) {
    super(message);
    this.status = status;
    this.retryable = retryable;
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

type RequestAttemptResult = {
  response: Response | undefined;
  networkError: Error | undefined;
};

async function parseJsonBody<T>(response: Response): Promise<T | undefined> {
  try {
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

function parseErrorMessage(
  body: { error?: string; message?: string } | undefined,
  fallback: string,
): string {
  if (body?.message !== undefined && body.message.length > 0) {
    return body.message;
  }
  return body?.error !== undefined ? body.error : fallback;
}

function parseRetryAfterMs(response: Response): number | undefined {
  const retryAfterHeader = response.headers.get('Retry-After');
  if (retryAfterHeader === null) {
    return undefined;
  }
  const seconds = Number(retryAfterHeader);
  if (!Number.isNaN(seconds) && seconds >= 0) {
    return seconds * 1000;
  }
  return undefined;
}

function wait(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function shouldRetryStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function getMaxRetries(method: string): number {
  if (method === 'GET') {
    return 2;
  }
  return 1;
}

function getRetryDelayMs(attempt: number, response: Response | undefined): number {
  if (response !== undefined) {
    const retryAfterMs = parseRetryAfterMs(response);
    if (retryAfterMs !== undefined) {
      return retryAfterMs;
    }
  }
  return 300 * 2 ** attempt;
}

async function performRequest(
  requestUrl: string,
  options: ApiRequestOptions,
  headers: Record<string, string>,
): Promise<RequestAttemptResult> {
  try {
    const response = await fetch(requestUrl, {
      method: options.method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    return {
      response,
      networkError: undefined,
    };
  } catch (error: unknown) {
    const networkError = error instanceof Error ? error : new Error('Network request failed');
    return {
      response: undefined,
      networkError,
    };
  }
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

  const requestUrl = `${getApiUrl()}${options.path}`;
  const maxRetries = getMaxRetries(options.method);
  let attempt = 0;
  let lastNetworkError: Error | undefined;
  let response: Response | undefined;

  while (attempt <= maxRetries) {
    const result = await performRequest(requestUrl, options, headers);
    response = result.response;
    if (result.networkError !== undefined) {
      lastNetworkError = result.networkError;
      if (attempt < maxRetries) {
        console.warn('api_request_retry', {
          method: options.method,
          path: options.path,
          attempt: attempt + 1,
          reason: 'network_error',
        });
        const delayMs = getRetryDelayMs(attempt, undefined);
        await wait(delayMs);
        attempt += 1;
        continue;
      }
      break;
    }

    if (response !== undefined && shouldRetryStatus(response.status) && attempt < maxRetries) {
      console.warn('api_request_retry', {
        method: options.method,
        path: options.path,
        attempt: attempt + 1,
        reason: 'retryable_status',
        status: response.status,
      });
      const delayMs = getRetryDelayMs(attempt, response);
      await wait(delayMs);
      attempt += 1;
      continue;
    }
    break;
  }

  if (response === undefined) {
    throw new ApiError(0, lastNetworkError?.message ?? 'Network request failed', true);
  }

  if (response.status === 401 && sentAuth) {
    clearAuth();
    if (onUnauthorized !== null) {
      onUnauthorized();
    }
    throw new ApiError(401, 'Unauthorized', false);
  }

  if (!response.ok) {
    const body = await parseJsonBody<{ error?: string }>(response);
    throw new ApiError(
      response.status,
      parseErrorMessage(body, 'Request failed'),
      shouldRetryStatus(response.status),
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const body = await parseJsonBody<T>(response);
  if (body === undefined) {
    throw new ApiError(response.status, 'Empty response body', false);
  }
  return body;
}
