import type { ApiResponse, ApiErrorCode } from '../types/api';

export class AppError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  details?: unknown
): ApiResponse<never> {
  return {
    error: {
      code,
      message,
      details,
    },
  };
}export default ExperimentManager;
