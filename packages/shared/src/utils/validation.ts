import { z } from 'zod';
import type { ApiResponse } from '../types/api';

export function validateSchema<T>(schema: z.Schema<T>, data: unknown): ApiResponse<T> {
  try {
    const validated = schema.parse(data);
    return { data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.errors,
        },
      };
    }
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during validation',
      },
    };
  }
}