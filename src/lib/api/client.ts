import { withRetry, isRetryableError } from '@/lib/utils/retry';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface FetchOptions extends RequestInit {
  retry?: boolean;
}

async function fetchApi<T>(
  endpoint: string,
  options?: FetchOptions
): Promise<T> {
  const { retry = true, ...fetchOptions } = options || {};

  const doFetch = async () => {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions?.headers,
      },
    });

    if (!response.ok) {
      throw new ApiError(response.status, `API Error: ${response.statusText}`);
    }

    return response.json();
  };

  if (retry) {
    return withRetry(doFetch, {
      maxRetries: 3,
      shouldRetry: isRetryableError,
    });
  }

  return doFetch();
}

export const api = {
  get: <T>(endpoint: string, options?: { retry?: boolean }) =>
    fetchApi<T>(endpoint, options),
  post: <T>(endpoint: string, data: unknown, options?: { retry?: boolean }) =>
    fetchApi<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    }),
};

