export interface CacheOptions {
  ttl?: number;  // Time to live in seconds
  namespace?: string;
}

export interface CacheValue<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  size: number;  // Size in bytes
  lastCleanup: Date;
}

export interface CacheConfig {
  defaultTTL: number;  // Default time to live in seconds
  maxSize: number;     // Maximum cache size in bytes
  cleanupInterval: number;  // Cleanup interval in seconds
  namespace: string;
}

export interface CacheKey {
  key: string;
  namespace?: string;
}
