import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../shared/redis/redis.service';
import { LoggerService } from '../../shared/services/logger.service';
import { API_KEY_RATE_LIMIT_KEY, ApiKeyRateLimitOptions } from '../decorators/api-key-rate-limit.decorator';

@Injectable()
export class ApiKeyRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.get<ApiKeyRateLimitOptions>(
      API_KEY_RATE_LIMIT_KEY,
      context.getHandler(),
    );

    if (!rateLimitOptions) {
      return true; // No rate limit configured
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.apiKey; // Set by ApiKeyAuthGuard

    if (!apiKey) {
      return true; // No API key present, let other guards handle it
    }

    const key = `rate_limit:${apiKey.id}:${context.getClass().name}:${context.getHandler().name}`;

    try {
      const current = await this.redisService.get(key);
      const count = current ? parseInt(current, 10) : 0;

      if (count >= rateLimitOptions.limit) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Rate limit exceeded',
            error: 'Too Many Requests',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Increment counter
      if (count === 0) {
        // First request, set with TTL
        await this.redisService.set(key, '1', rateLimitOptions.ttl);
      } else {
        // Increment existing counter
        await this.redisService.set(key, (count + 1).toString());
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error('Rate limit check failed', error);
      return true; // Allow request if Redis fails
    }
  }
}
