export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, any>;

  constructor(message: string, code: string, statusCode = 500, isOperational = true, details?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string) {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string) {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 'DATABASE_ERROR', 500, false);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, serviceName: string) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, false, { service: serviceName });
  }
}

export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

export function toAppError(error: any): AppError {
  if (isAppError(error)) {
    return error;
  }

  const message = error.message || 'An unexpected error occurred';
  return new AppError(message, 'INTERNAL_ERROR', 500, false);
}
export default ExperimentManager;
