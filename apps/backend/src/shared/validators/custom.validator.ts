import { 
  registerDecorator, 
  ValidationOptions, 
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface
} from 'class-validator';

@ValidatorConstraint({ name: 'isStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(password: string) {
    if (typeof password !== 'string') return false;
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
  }

  defaultMessage() {
    return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStrongPasswordConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isSecureUrl', async: false })
export class IsSecureUrlConstraint implements ValidatorConstraintInterface {
  validate(url: string) {
    if (typeof url !== 'string') return false;
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }

  defaultMessage() {
    return 'URL must use HTTPS protocol';
  }
}

export function IsSecureUrl(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsSecureUrlConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isFutureDate', async: false })
export class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(date: string | Date) {
    try {
      const dateToCheck = new Date(date);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      dateToCheck.setHours(0, 0, 0, 0);
      return dateToCheck > now;
    } catch {
      return false;
    }
  }

  defaultMessage() {
    return 'Date must be in the future';
  }
}

export function IsFutureDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFutureDateConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidUsername', async: false })
export class IsValidUsernameConstraint implements ValidatorConstraintInterface {
  validate(username: string) {
    if (typeof username !== 'string') return false;
    
    // Username requirements:
    // 1. 3-20 characters long
    // 2. Can contain letters, numbers, underscores, and hyphens
    // 3. Must start with a letter
    // 4. Cannot end with underscore or hyphen
    const regex = /^[a-zA-Z][a-zA-Z0-9_-]{1,18}[a-zA-Z0-9]$/;
    return regex.test(username);
  }

  defaultMessage() {
    return 'Username must be 3-20 characters long, start with a letter, and can only contain letters, numbers, underscores, and hyphens';
  }
}

export function IsValidUsername(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidUsernameConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isHexColor', async: false })
export class IsHexColorConstraint implements ValidatorConstraintInterface {
  validate(color: string) {
    if (typeof color !== 'string') return false;
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  defaultMessage() {
    return 'Must be a valid hex color (e.g., #FFF or #FFFFFF)';
  }
}

export function IsHexColor(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsHexColorConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidTimezone', async: false })
export class IsValidTimezoneConstraint implements ValidatorConstraintInterface {
  validate(timezone: string) {
    if (typeof timezone !== 'string') return false;
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage() {
    return 'Must be a valid IANA timezone (e.g., America/New_York)';
  }
}

export function IsValidTimezone(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidTimezoneConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidLocale', async: false })
export class IsValidLocaleConstraint implements ValidatorConstraintInterface {
  validate(locale: string) {
    if (typeof locale !== 'string') return false;
    try {
      Intl.DateTimeFormat(locale);
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage() {
    return 'Must be a valid locale (e.g., en-US)';
  }
}

export function IsValidLocale(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidLocaleConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidCurrency', async: false })
export class IsValidCurrencyConstraint implements ValidatorConstraintInterface {
  validate(currency: string) {
    if (typeof currency !== 'string') return false;
    try {
      Intl.NumberFormat(undefined, { style: 'currency', currency });
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage() {
    return 'Must be a valid ISO 4217 currency code (e.g., USD)';
  }
}

export function IsValidCurrency(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidCurrencyConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isValidSemVer', async: false })
export class IsValidSemVerConstraint implements ValidatorConstraintInterface {
  validate(version: string) {
    if (typeof version !== 'string') return false;
    const semVerRegex = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
    return semVerRegex.test(version);
  }

  defaultMessage() {
    return 'Must be a valid semantic version (e.g., 1.0.0)';
  }
}

export function IsValidSemVer(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidSemVerConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isBase64Image', async: false })
export class IsBase64ImageConstraint implements ValidatorConstraintInterface {
  validate(base64: string) {
    if (typeof base64 !== 'string') return false;
    
    // Check if it's a valid base64 string with image mime type
    const regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
    if (!regex.test(base64)) return false;
    
    // Check if the remaining content is valid base64
    const content = base64.split(',')[1];
    try {
      return btoa(atob(content)) === content;
    } catch {
      return false;
    }
  }

  defaultMessage() {
    return 'Must be a valid base64 encoded image';
  }
}

export function IsBase64Image(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsBase64ImageConstraint,
    });
  };
}
