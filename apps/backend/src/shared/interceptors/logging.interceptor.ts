import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PinoLoggerService } from '../services/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new PinoLoggerService();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, headers, query } = request;
    const userAgent = headers['user-agent'] || '';
    const { ip } = request;

    const now = Date.now();

    return next.handle().pipe(
      tap({
        next: (data: any) => {
          const response = context.switchToHttp().getResponse();
          const delay = Date.now() - now;

          this.logger.log({
            message: `${method} ${url}`,
            method,
            url,
            statusCode: response.statusCode,
            delay,
            userAgent,
            ip,
            query,
            body: this.sanitizeBody(body),
          });
        },
        error: (error: any) => {
          const delay = Date.now() - now;

          this.logger.error({
            message: `${method} ${url}`,
            method,
            url,
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
            delay,
            userAgent,
            ip,
            query,
            body: this.sanitizeBody(body),
          });
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'authorization', 'secret'];

    sensitiveFields.forEach(field => {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
