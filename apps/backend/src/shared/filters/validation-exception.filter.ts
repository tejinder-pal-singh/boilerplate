import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationError } from 'class-validator';
import { PinoLoggerService } from '../services/logger.service';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new PinoLoggerService();

  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    let validationErrors: ValidationError[] = [];
    if (exception.getResponse()['message'] instanceof Array) {
      validationErrors = exception.getResponse()['message'];
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      message: 'Validation failed',
      errors: this.formatValidationErrors(validationErrors),
    };

    this.logger.warn('Validation Error', errorResponse);

    response
      .status(status)
      .json(errorResponse);
  }

  private formatValidationErrors(errors: ValidationError[]): any {
    return errors.reduce((acc, error) => {
      acc[error.property] = Object.values(error.constraints);
      return acc;
    }, {});
  }
}
