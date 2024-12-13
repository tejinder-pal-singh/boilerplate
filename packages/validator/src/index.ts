import { z } from 'zod';
import { createContext, useContext, useState, useCallback } from 'react';

interface ValidationRule<T = any> {
  name: string;
  validate: (value: T, options?: any) => boolean | Promise<boolean>;
  message: string | ((value: T, options?: any) => string);
  async?: boolean;
}

interface ValidationError {
  field: string;
  rule: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

class Validator {
  private static instance: Validator;
  private rules: Map<string, ValidationRule> = new Map();
  private schemas: Map<string, z.ZodType> = new Map();
  private cache: Map<string, ValidationResult> = new Map();
  private cacheTimeout: number = 5000;

  private constructor() {
    this.registerDefaultRules();
  }

  public static getInstance(): Validator {
    if (!Validator.instance) {
      Validator.instance = new Validator();
    }
    return Validator.instance;
  }

  private registerDefaultRules(): void {
    // String rules
    this.registerRule({
      name: 'required',
      validate: (value: any) => value !== undefined && value !== null && value !== '',
      message: 'This field is required',
    });

    this.registerRule({
      name: 'email',
      validate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: 'Invalid email address',
    });

    this.registerRule({
      name: 'minLength',
      validate: (value: string, min: number) => value.length >= min,
      message: (value: string, min: number) => `Must be at least ${min} characters`,
    });

    this.registerRule({
      name: 'maxLength',
      validate: (value: string, max: number) => value.length <= max,
      message: (value: string, max: number) => `Must be no more than ${max} characters`,
    });

    this.registerRule({
      name: 'pattern',
      validate: (value: string, pattern: RegExp) => pattern.test(value),
      message: 'Invalid format',
    });

    // Number rules
    this.registerRule({
      name: 'min',
      validate: (value: number, min: number) => value >= min,
      message: (value: number, min: number) => `Must be at least ${min}`,
    });

    this.registerRule({
      name: 'max',
      validate: (value: number, max: number) => value <= max,
      message: (value: number, max: number) => `Must be no more than ${max}`,
    });

    // Array rules
    this.registerRule({
      name: 'minItems',
      validate: (value: any[], min: number) => value.length >= min,
      message: (value: any[], min: number) => `Must have at least ${min} items`,
    });

    this.registerRule({
      name: 'maxItems',
      validate: (value: any[], max: number) => value.length <= max,
      message: (value: any[], max: number) => `Must have no more than ${max} items`,
    });

    // Custom async rules
    this.registerRule({
      name: 'unique',
      validate: async (value: string, field: string) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 100));
        return true;
      },
      message: 'Must be unique',
      async: true,
    });
  }

  public registerRule(rule: ValidationRule): void {
    this.rules.set(rule.name, rule);
  }

  public registerSchema(name: string, schema: z.ZodType): void {
    this.schemas.set(name, schema);
  }

  private getMessage(rule: ValidationRule, value: any, options?: any): string {
    return typeof rule.message === 'function'
      ? rule.message(value, options)
      : rule.message;
  }

  private getCacheKey(value: any, rules: any): string {
    return JSON.stringify({ value, rules });
  }

  public async validate(
    value: any,
    rules: Record<string, any>,
    field: string = 'field'
  ): Promise<ValidationResult> {
    const cacheKey = this.getCacheKey(value, rules);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const errors: ValidationError[] = [];
    const ruleEntries = Object.entries(rules);

    for (const [ruleName, options] of ruleEntries) {
      const rule = this.rules.get(ruleName);
      if (!rule) continue;

      try {
        const result = rule.validate(value, options);
        const isValid = rule.async ? await result : result;

        if (!isValid) {
          errors.push({
            field,
            rule: ruleName,
            message: this.getMessage(rule, value, options),
          });
        }
      } catch (error) {
        errors.push({
          field,
          rule: ruleName,
          message: error.message,
        });
      }
    }

    const result = { valid: errors.length === 0, errors };
    this.cache.set(cacheKey, result);
    setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout);

    return result;
  }

  public async validateSchema(value: any, schemaName: string): Promise<ValidationResult> {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      throw new Error(`Schema '${schemaName}' not found`);
    }

    try {
      await schema.parseAsync(value);
      return { valid: true, errors: [] };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          rule: 'schema',
          message: err.message,
        }));
        return { valid: false, errors };
      }
      throw error;
    }
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public setCacheTimeout(timeout: number): void {
    this.cacheTimeout = timeout;
  }

  public getRule(name: string): ValidationRule | undefined {
    return this.rules.get(name);
  }

  public getRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }
}

// React Context
const ValidationContext = createContext<Validator | null>(null);

// React Provider
export const ValidationProvider: React.FC<{
  children,
}: {
  children: React.ReactNode;
}) {
  const validator = Validator.getInstance();

  return (
    <ValidationContext.Provider value={validator}>
      {children}
    </ValidationContext.Provider>
  );
}

// React Hook
export function useValidation() {
  const validator = useContext(ValidationContext);
  if (!validator) {
    throw new Error('useValidation must be used within a ValidationProvider');
  }

  const [errors, setErrors] = useState<ValidationError[]>([]);

  const validate = useCallback(async (
    value: any,
    rules: Record<string, any>,
    field?: string
  ) => {
    const result = await validator.validate(value, rules, field);
    setErrors(result.errors);
    return result.valid;
  }, [validator]);

  const validateSchema = useCallback(async (
    value: any,
    schemaName: string
  ) => {
    const result = await validator.validateSchema(value, schemaName);
    setErrors(result.errors);
    return result.valid;
  }, [validator]);

  return {
    validate,
    validateSchema,
    errors,
    clearErrors: () => setErrors([]),
  };
}

export { Validator, type ValidationRule, type ValidationError, type ValidationResult };

// Example usage:
// const validator = Validator.getInstance();
//
// // Register custom rule
// validator.registerRule({
//   name: 'password',
//   validate: (value: string) => {
//     return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(value);
//   },
//   message: 'Password must be at least 8 characters with letters and numbers',
// });
//
// // Register schema
// validator.registerSchema('user', z.object({
//   email: z.string().email(),
//   password: z.string().min(8),
//   age: z.number().min(18),
// }));
//
// // Validate
// const result = await validator.validate('test', {
//   required: true,
//   email: true,
// });
//
// // Validate schema
// const schemaResult = await validator.validateSchema({
//   email: 'test@example.com',
//   password: 'password123',
//   age: 20,
// }, 'user');
export default ExperimentManager;
