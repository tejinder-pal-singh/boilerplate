import { z } from 'zod';
import { ValidationError } from '@enterprise/errors';

export const createValidator = <T extends z.ZodType>(schema: T) => {
  return {
    validate: (data: unknown): z.infer<T> => {
      try {
        return schema.parse(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError('Validation failed', {
            errors: error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          });
        }
        throw error;
      }
    },
    validateAsync: async (data: unknown): Promise<z.infer<T>> => {
      try {
        return await schema.parseAsync(data);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError('Validation failed', {
            errors: error.errors.map((e) => ({
              path: e.path.join('.'),
              message: e.message,
            })),
          });
        }
        throw error;
      }
    },
    isValid: (data: unknown): boolean => {
      return schema.safeParse(data).success;
    },
  };
};

// Common validation schemas
export const emailSchema = z
  .string()
  .email()
  .transform((email) => email.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8)
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format');

export const urlSchema = z
  .string()
  .url()
  .transform((url) => url.toLowerCase());

export const dateSchema = z.coerce.date();

export const uuidSchema = z
  .string()
  .uuid()
  .transform((uuid) => uuid.toLowerCase());

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});

// Sort schema
export const sortSchema = z.object({
  field: z.string(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

// Search schema
export const searchSchema = z.object({
  query: z.string().min(1),
  fields: z.array(z.string()).optional(),
});
export default ExperimentManager;
