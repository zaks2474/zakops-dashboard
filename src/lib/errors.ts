/**
 * Error Handling Utilities (Phase 20.5.2)
 *
 * Provides unified error handling for both Axios and Fetch errors.
 * Works without requiring Axios as a dependency.
 */

// Axios-like error structure (for type checking without importing axios)
interface AxiosLikeError {
  isAxiosError: true;
  response?: {
    status?: number;
    data?: unknown;
  };
  code?: string;
  message?: string;
}

/**
 * Check if error is an Axios error.
 */
export function isAxiosError(error: unknown): error is AxiosLikeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosLikeError).isAxiosError === true
  );
}

/**
 * Extract HTTP status code from various error types.
 *
 * Supports:
 * - Axios errors (error.response.status)
 * - Fetch Response errors (error.status)
 * - Custom error objects with status property
 */
export function getHttpStatus(error: unknown): number | null {
  if (!error) return null;

  // Axios error
  if (isAxiosError(error)) {
    return error.response?.status ?? null;
  }

  // Fetch Response
  if (typeof Response !== 'undefined' && error instanceof Response) {
    return error.status;
  }

  // Generic object with status
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === 'number') return status;
  }

  // Generic object with response.status (Axios-like)
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response: unknown }).response;
    if (response && typeof response === 'object' && response !== null && 'status' in response) {
      const status = (response as { status: unknown }).status;
      if (typeof status === 'number') return status;
    }
  }

  return null;
}

/**
 * Extract response data from various error types.
 */
export function getErrorData<T = unknown>(error: unknown): T | null {
  if (!error) return null;

  // Axios error
  if (isAxiosError(error)) {
    return (error.response?.data as T) ?? null;
  }

  // Already parsed data
  if (typeof error === 'object' && error !== null && 'data' in error) {
    return (error as { data: T }).data;
  }

  return null;
}

/**
 * Check if error is a network error (no response).
 */
export function isNetworkError(error: unknown): boolean {
  if (isAxiosError(error)) {
    return !error.response && error.code === 'ERR_NETWORK';
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  return false;
}

/**
 * Check if error is a conflict error (409).
 */
export function isConflictError(error: unknown): boolean {
  return getHttpStatus(error) === 409;
}

/**
 * Check if error is an auth error (401/403).
 */
export function isAuthError(error: unknown): boolean {
  const status = getHttpStatus(error);
  return status === 401 || status === 403;
}

/**
 * Check if error is a server error (5xx).
 */
export function isServerError(error: unknown): boolean {
  const status = getHttpStatus(error);
  return status !== null && status >= 500;
}

/**
 * Get a user-friendly error message.
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return 'An unknown error occurred';

  // Axios error with response
  if (isAxiosError(error) && error.response?.data) {
    const data = error.response.data as Record<string, unknown>;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.error === 'string') return data.error;
  }

  // Standard Error
  if (error instanceof Error) {
    return error.message;
  }

  // String error
  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
}
