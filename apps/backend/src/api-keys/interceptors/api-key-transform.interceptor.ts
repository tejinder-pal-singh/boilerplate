import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { plainToClass } from 'class-transformer';
import { ApiKeyResponseDto } from '../dto/api-key-response.dto';

@Injectable()
export class ApiKeyTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => {
        // Handle array responses
        if (Array.isArray(data)) {
          return data.map(item => this.transformToDto(item));
        }
        // Handle single item responses
        return this.transformToDto(data);
      }),
    );
  }

  private transformToDto(data: any): ApiKeyResponseDto {
    // Skip transformation if the data is already transformed or doesn't need transformation
    if (!data || data.apiKey || !data.id) {
      return data;
    }
    
    return plainToClass(ApiKeyResponseDto, data, {
      excludeExtraneousValues: true,
    });
  }
}
