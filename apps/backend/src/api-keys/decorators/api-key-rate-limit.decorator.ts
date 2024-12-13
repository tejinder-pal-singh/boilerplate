import { SetMetadata } from '@nestjs/common';

export const API_KEY_RATE_LIMIT_KEY = 'api_key_rate_limit';

export interface ApiKeyRateLimitOptions {
  limit: number;
  ttl: number; // Time window in seconds
}

export const ApiKeyRateLimit = (options: ApiKeyRateLimitOptions) =>
  SetMetadata(API_KEY_RATE_LIMIT_KEY, options);
