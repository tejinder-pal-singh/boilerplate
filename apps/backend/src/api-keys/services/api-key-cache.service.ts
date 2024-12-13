import { Injectable, OnModuleInit } from '@nestjs/common';
import { RedisService } from '../../shared/redis/redis.service';
import { ApiKey } from '../entities/api-key.entity';
import { LoggerService } from '../../shared/services/logger.service';

@Injectable()
export class ApiKeyCacheService implements OnModuleInit {
  private readonly CACHE_PREFIX = 'api_key:';
  private readonly CACHE_TTL = 3600; // 1 hour in seconds

  constructor(
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    // Ensure Redis connection is ready
    try {
      await this.redisService.get('test');
      this.logger.info('API Key cache service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize API Key cache service', error);
      throw error;
    }
  }

  private getCacheKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`;
  }

  async set(hashedKey: string, apiKey: ApiKey): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(hashedKey);
      await this.redisService.set(
        cacheKey,
        JSON.stringify(apiKey),
        this.CACHE_TTL
      );
    } catch (error) {
      this.logger.error('Failed to cache API key', error);
      // Don't throw error as cache is non-critical
    }
  }

  async get(hashedKey: string): Promise<ApiKey | null> {
    try {
      const cacheKey = this.getCacheKey(hashedKey);
      const cached = await this.redisService.get(cacheKey);
      
      if (!cached) {
        return null;
      }

      const apiKey = JSON.parse(cached) as ApiKey;
      
      // Convert string dates back to Date objects
      apiKey.expiresAt = new Date(apiKey.expiresAt);
      apiKey.createdAt = new Date(apiKey.createdAt);
      apiKey.updatedAt = new Date(apiKey.updatedAt);
      
      return apiKey;
    } catch (error) {
      this.logger.error('Failed to get cached API key', error);
      return null;
    }
  }

  async invalidate(hashedKey: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(hashedKey);
      await this.redisService.del(cacheKey);
    } catch (error) {
      this.logger.error('Failed to invalidate cached API key', error);
      // Don't throw error as cache is non-critical
    }
  }

  async invalidateByUserId(userId: string): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}*`;
      await this.redisService.clearPattern(pattern);
    } catch (error) {
      this.logger.error(`Failed to invalidate API keys for user ${userId}`, error);
      // Don't throw error as cache is non-critical
    }
  }
}
