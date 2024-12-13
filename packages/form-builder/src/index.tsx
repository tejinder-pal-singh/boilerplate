import React, { createContext, useContext, useState, useCallback } from 'react';
import { z } from 'zod';
import { useValidation } from '@/packages/validator';

interface FormField {
  name: string;
  type: 'text' | 'number' | 'email' | 'password' | 'select' | 'radio' | 'checkbox' | 'textarea';
  label?: string;
  placeholder?: string;
  defaultValue?: any;
  options?: { label: string; value: any }[];
  validation?: Record<string, any>;
  schema?: z.ZodType;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
  onChange?: (value: any) => void;
  onBlur?: () => void;
  render?: (props: any) => React.ReactNode;
}

interface FormConfig {
  fields: FormField[];
  onSubmit: (values: Record<string, any>) => void | Promise<void>;
  onError?: (errors: any) => void;
  initialValues?: Record<string, any>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  resetOnSubmit?: boolean;
}

interface FormState {
  values: Record<string, any>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

interface FormContextType extends FormState {
  setFieldValue: (name: string, value: any) => void;
  setFieldTouched: (name: string) => void;
  setFieldError: (name: string, error: string) => void;
  validateField: (name: string) => Promise<void>;
  validateForm: () => Promise<boolean>;
  resetForm: () => void;
  submitForm: () => Promise<void>;
}

const FormContext = createContext<FormContextType | null>(null);

export function FormProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config: FormConfig;
}) {
  const { validate, validateSchema } = useValidation();
  const [state, setState] = useState<FormState>({
    values: config.initialValues || {},
    errors: {},
    touched: {},
    isSubmitting: false,
    isValid: true,
  });

  const setFieldValue = useCallback((name: string, value: any) => {
    setState(prev => ({
      ...prev,
      values: { ...prev.values, [name]: value },
    }));

    if (config.validateOnChange) {
      validateField(name);
    }
  }, [config.validateOnChange]);

  const setFieldTouched = useCallback((name: string) => {
    setState(prev => ({
      ...prev,
      touched: { ...prev.touched, [name]: true },
    }));

    if (config.validateOnBlur) {
      validateField(name);
    }
  }, [config.validateOnBlur]);

  const setFieldError = useCallback((name: string, error: string) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [name]: error },
      isValid: false,
    }));
  }, []);

  const validateField = useCallback(async (name: string) => {
    const field = config.fields.find(f => f.name === name);
    if (!field) return;

    const value = state.values[name];

    if (field.schema) {
      try {
        await field.schema.parseAsync(value);
      } catch (error) {
        if (error instanceof z.ZodError) {
          setFieldError(name, error.errors[0].message);
          return;
        }
      }
    }

    if (field.validation) {
      const result = await validate(value, field.validation, name);
      if (!result.valid) {
        setFieldError(name, result.errors[0].message);
      }
    }
  }, [state.values, config.fields]);

  const validateForm = useCallback(async () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    for (const field of config.fields) {
      const value = state.values[field.name];

      if (field.schema) {
        try {
          await field.schema.parseAsync(value);
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors[field.name] = error.errors[0].message;
            isValid = false;
          }
        }
      }

      if (field.validation) {
        const result = await validate(value, field.validation, field.name);
        if (!result.valid) {
          errors[field.name] = result.errors[0].message;
          isValid = false;
        }
      }
    }

    setState(prev => ({
      ...prev,
      errors,
      isValid,
    }));

    return isValid;
  }, [state.values, config.fields]);

  const resetForm = useCallback(() => {
    setState({
      values: config.initialValues || {},
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: true,
    });
  }, [config.initialValues]);

  const submitForm = useCallback(async () => {
    setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      const isValid = await validateForm();
      if (!isValid) {
        if (config.onError) {
          config.onError(state.errors);
        }
        return;
      }

      await config.onSubmit(state.values);

      if (config.resetOnSubmit) {
        resetForm();
      }
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [state.values, state.errors, config]);

  return (
    <FormContext.Provider
      value={{
        ...state,
        setFieldValue,
        setFieldTouched,
        setFieldError,
        validateField,
        validateForm,
        resetForm,
        submitForm,
      }}
    >
      {children}
    </FormContext.Provider>
  );
}

export function useForm() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useForm must be used within a FormProvider');
  }
  return context;
}

export function Form({
  config,
  children,
  className,
}: {
  config: FormConfig;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <FormProvider config={config}>
      <FormContent className={className}>{children}</FormContent>
    </FormProvider>
  );
}

function FormContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { submitForm } = useForm();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitForm();
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      {children}
    </form>
  );
}

export function Field({ name }: { name: string }) {
  const {
    values,
    errors,
    touched,
    setFieldValue,
    setFieldTouched,
  } = useForm();

  const config = useContext(FormContext);
  if (!config) {
    throw new Error('Field must be used within a Form');
  }

  const field = config.fields.find(f => f.name === name);
  if (!field) {
    throw new Error(`Field ${name} not found in form config`);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = field.type === 'checkbox' ? e.target.checked : e.target.value;
    setFieldValue(name, value);
    if (field.onChange) {
      field.onChange(value);
    }
  };

  const handleBlur = () => {
    setFieldTouched(name);
    if (field.onBlur) {
      field.onBlur();
    }
  };

  if (field.render) {
    return field.render({
      value: values[name],
      onChange: handleChange,
      onBlur: handleBlur,
      error: touched[name] ? errors[name] : undefined,
    });
  }

  const commonProps = {
    id: name,
    name,
    value: values[name] || '',
    onChange: handleChange,
    onBlur: handleBlur,
    disabled: field.disabled,
    required: field.required,
    autoFocus: field.autoFocus,
    className: field.className,
    placeholder: field.placeholder,
  };

  switch (field.type) {
    case 'select':
      return (
        <div>
          {field.label && <label htmlFor={name}>{field.label}</label>}
          <select {...commonProps}>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {touched[name] && errors[name] && (
            <div className="error">{errors[name]}</div>
          )}
        </div>
      );

    case 'radio':
      return (
        <div>
          {field.label && <div>{field.label}</div>}
          {field.options?.map(option => (
            <label key={option.value}>
              <input
                type="radio"
                {...commonProps}
                value={option.value}
                checked={values[name] === option.value}
              />
              {option.label}
            </label>
          ))}
          {touched[name] && errors[name] && (
            <div className="error">{errors[name]}</div>
          )}
        </div>
      );

    case 'checkbox':
      return (
        <div>
          <label>
            <input
              type="checkbox"
              {...commonProps}
              checked={values[name] || false}
            />
            {field.label}
          </label>
          {touched[name] && errors[name] && (
            <div className="error">{errors[name]}</div>
          )}
        </div>
      );

    case 'textarea':
      return (
        <div>
          {field.label && <label htmlFor={name}>{field.label}</label>}
          <textarea {...commonProps} />
          {touched[name] && errors[name] && (
            <div className="error">{errors[name]}</div>
          )}
        </div>
      );

    default:
      return (
        <div>
          {field.label && <label htmlFor={name}>{field.label}</label>}
          <input type={field.type} {...commonProps} />
          {touched[name] && errors[name] && (
            <div className="error">{errors[name]}</div>
          )}
        </div>
      );
  }
}

// Example usage:
// const formConfig: FormConfig = {
//   fields: [
//     {
//       name: 'email',
//       type: 'email',
//       label: 'Email',
//       validation: {
//         required: true,
//         email: true,
//       },
//     },
//     {
//       name: 'password',
//       type: 'password',
//       label: 'Password',
//       schema: z.string().min(8),
//     },
//   ],
//   onSubmit: async (values) => {
//     console.log(values);
//   },
//   validateOnChange: true,
// };
//
// function LoginForm() {
//   return (
//     <Form config={formConfig}>
//       <Field name="email" />
//       <Field name="password" />
//       <button type="submit">Login</button>
//     </Form>
//   );
// }
