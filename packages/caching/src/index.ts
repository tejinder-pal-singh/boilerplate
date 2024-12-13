import { createContext, useContext, useEffect, useState } from 'react';
import LRUCache from 'lru-cache';

interface CacheConfig {
  maxSize?: number;
  maxAge?: number;
  updateAgeOnGet?: boolean;
  staleWhileRevalidate?: boolean;
  persistToStorage?: boolean;
  compression?: boolean;
  encryption?: boolean;
  namespace?: string;
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  lastCleanup: number;
}

class CacheManager {
  private static instance: CacheManager;
  private cache: LRUCache<string, CacheEntry<any>>;
  private storage: Storage | null;
  private namespace: string;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    lastCleanup: Date.now(),
  };
  private subscribers: Set<(stats: CacheStats) => void> = new Set();
  private revalidationQueue: Map<string, Promise<any>> = new Map();

  private constructor(config: CacheConfig = {}) {
    const {
      maxSize = 1000,
      maxAge = 60 * 60 * 1000, // 1 hour
      updateAgeOnGet = true,
      persistToStorage = false,
      namespace = 'app-cache',
    } = config;

    this.cache = new LRUCache({
      max: maxSize,
      maxAge,
      updateAgeOnGet,
    });

    this.namespace = namespace;
    this.storage = persistToStorage && typeof localStorage !== 'undefined' ? localStorage : null;

    if (this.storage) {
      this.loadFromStorage();
      this.setupStorageSync();
    }

    // Periodic cleanup
    setInterval(() => this.cleanup(), 5 * 60 * 1000); // Every 5 minutes
  }

  public static getInstance(config?: CacheConfig): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(config);
    }
    return CacheManager.instance;
  }

  private async compress(data: string): Promise<string> {
    if (typeof CompressionStream === 'undefined') return data;

    const blob = new Blob([data]);
    const compressed = blob.stream().pipeThrough(new CompressionStream('gzip'));
    return new Response(compressed).text();
  }

  private async decompress(data: string): Promise<string> {
    if (typeof DecompressionStream === 'undefined') return data;

    const blob = new Blob([data]);
    const decompressed = blob.stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(decompressed).text();
  }

  private encrypt(data: string): string {
    // Simple XOR encryption for demo purposes
    // In production, use a proper encryption library
    const key = 'your-secret-key';
    return data
      .split('')
      .map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
      .join('');
  }

  private decrypt(data: string): string {
    // XOR decryption (same as encryption)
    return this.encrypt(data);
  }

  private async loadFromStorage(): Promise<void> {
    if (!this.storage) return;

    try {
      const stored = this.storage.getItem(this.namespace);
      if (stored) {
        const decrypted = this.decrypt(stored);
        const decompressed = await this.decompress(decrypted);
        const data = JSON.parse(decompressed);

        Object.entries(data).forEach(([key, entry]) => {
          this.cache.set(key, entry as CacheEntry<any>);
        });
      }
    } catch (error) {
      console.error('Error loading cache from storage:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    if (!this.storage) return;

    try {
      const data = Object.fromEntries(this.cache.entries());
      const serialized = JSON.stringify(data);
      const compressed = await this.compress(serialized);
      const encrypted = this.encrypt(compressed);
      this.storage.setItem(this.namespace, encrypted);
    } catch (error) {
      console.error('Error saving cache to storage:', error);
    }
  }

  private setupStorageSync(): void {
    window.addEventListener('storage', async (event) => {
      if (event.key === this.namespace && event.newValue) {
        await this.loadFromStorage();
        this.notifySubscribers();
      }
    });
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.stats));
  }

  private updateStats(): void {
    this.stats.size = this.cache.size;
    this.notifySubscribers();
  }

  private cleanup(): void {
    this.cache.prune();
    this.stats.lastCleanup = Date.now();
    this.updateStats();
    if (this.storage) {
      this.saveToStorage();
    }
  }

  public async get<T>(
    key: string,
    fetcher?: () => Promise<T>,
    options: {
      maxAge?: number;
      staleWhileRevalidate?: boolean;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<T | null> {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    const now = Date.now();

    // Cache hit
    if (entry) {
      this.stats.hits++;
      this.updateStats();

      // Check if entry is stale
      const isStale = options.maxAge && now - entry.timestamp > options.maxAge;

      if (!isStale) {
        return entry.value;
      }

      // Handle stale-while-revalidate
      if (options.staleWhileRevalidate && fetcher) {
        if (!this.revalidationQueue.has(key)) {
          this.revalidationQueue.set(
            key,
            fetcher().then((value) => {
              this.set(key, value, options);
              this.revalidationQueue.delete(key);
              return value;
            })
          );
        }
        return entry.value;
      }
    }

    // Cache miss
    this.stats.misses++;
    this.updateStats();

    if (!fetcher) return null;

    try {
      const value = await fetcher();
      await this.set(key, value, options);
      return value;
    } catch (error) {
      console.error(`Error fetching value for key ${key}:`, error);
      return null;
    }
  }

  public async set<T>(
    key: string,
    value: T,
    options: {
      maxAge?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      metadata: options.metadata,
    };

    this.cache.set(key, entry, {
      maxAge: options.maxAge,
    });

    this.updateStats();

    if (this.storage) {
      await this.saveToStorage();
    }
  }

  public delete(key: string): void {
    this.cache.delete(key);
    this.updateStats();

    if (this.storage) {
      this.saveToStorage();
    }
  }

  public clear(): void {
    this.cache.clear();
    this.updateStats();

    if (this.storage) {
      this.storage.removeItem(this.namespace);
    }
  }

  public getStats(): CacheStats {
    return { ...this.stats };
  }

  public subscribe(callback: (stats: CacheStats) => void): () => void {
    this.subscribers.add(callback);
    callback(this.stats);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  public has(key: string): boolean {
    return this.cache.has(key);
  }
}

// React Context
const CacheContext = createContext<CacheManager | null>(null);

// React Provider
export const CacheProvider: React.FC<{
  children,
  config,
}: {
  children: React.ReactNode;
  config?: CacheConfig;
}) {
  const cache = CacheManager.getInstance(config);

  return (
    <CacheContext.Provider value={cache}>
      {children}
    </CacheContext.Provider>
  );
}

// React Hook
export function useCache<T>(
  key: string,
  fetcher?: () => Promise<T>,
  options?: {
    maxAge?: number;
    staleWhileRevalidate?: boolean;
    metadata?: Record<string, any>;
  }
): [T | null, boolean, Error | null] {
  const cache = useContext(CacheContext);
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!cache) return;

    let mounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await cache.get(key, fetcher, options);
        if (mounted) {
          setData(result);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [cache, key, options?.maxAge]);

  return [data, loading, error];
}

export default CacheManager;
