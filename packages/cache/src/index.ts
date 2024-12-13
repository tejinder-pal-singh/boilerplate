import { Redis } from 'ioredis';
import { ExternalServiceError } from '@enterprise/errors';

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
}

export class Cache {
  private readonly redis: Redis;
  private readonly defaultTTL: number;
  private readonly prefix: string;

  constructor(
    redisUrl: string,
    { ttl = 3600, prefix = 'cache:' }: CacheOptions = {}
  ) {
    this.redis = new Redis(redisUrl, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });

    this.defaultTTL = ttl;
    this.prefix = prefix;

    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
    });
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(this.getKey(key));
      return data ? JSON.parse(data) : null;
    } catch (error) {
      throw new ExternalServiceError(
        `Failed to get cache key: ${key}`,
        'Redis'
      );
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      const finalTTL = ttl || this.defaultTTL;

      await this.redis.set(
        this.getKey(key),
        serializedValue,
        'EX',
        finalTTL
      );
    } catch (error) {
      throw new ExternalServiceError(
        `Failed to set cache key: ${key}`,
        'Redis'
      );
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(this.getKey(key));
    } catch (error) {
      throw new ExternalServiceError(
        `Failed to delete cache key: ${key}`,
        'Redis'
      );
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      return (await this.redis.exists(this.getKey(key))) === 1;
    } catch (error) {
      throw new ExternalServiceError(
        `Failed to check cache key: ${key}`,
        'Redis'
      );
    }
  }

  async clear(pattern?: string): Promise<void> {
    try {
      const keys = await this.redis.keys(
        this.getKey(pattern || '*')
      );
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      throw new ExternalServiceError(
        'Failed to clear cache',
        'Redis'
      );
    }
  }

  async remember<T>(
    key: string,
    ttl: number,
    callback: () => Promise<T>
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await callback();
    await this.set(key, fresh, ttl);
    return fresh;
  }

  async tags(tags: string[]): Promise<{
    get: <T>(key: string) => Promise<T | null>;
    set: (key: string, value: any, ttl?: number) => Promise<void>;
    flush: () => Promise<void>;
  }> {
    const tagKeys = tags.map((tag) => this.getKey(`tag:${tag}`));

    return {
      get: async <T>(key: string) => {
        const tagVersions = await Promise.all(
          tagKeys.map((tagKey) => this.redis.get(tagKey))
        );
        const versionedKey = this.getKey(
          `${key}:${tagVersions.join(':')}`
        );
        return this.get<T>(versionedKey);
      },
      set: async (key: string, value: any, ttl?: number) => {
        const tagVersions = await Promise.all(
          tagKeys.map((tagKey) =>
            this.redis.get(tagKey).then((v) => v || '0')
          )
        );
        const versionedKey = this.getKey(
          `${key}:${tagVersions.join(':')}`
        );
        await this.set(versionedKey, value, ttl);
      },
      flush: async () => {
        await Promise.all(
          tagKeys.map((tagKey) =>
            this.redis.incr(tagKey)
          )
        );
      },
    };
  }
}
export default ExperimentManager;
