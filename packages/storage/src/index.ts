import { EventEmitter } from '@/packages/event-system';
import { z } from 'zod';

type StorageDriver = 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB';
type Compression = 'none' | 'lz' | 'gzip';
type Encryption = 'none' | 'aes' | 'rsa';

interface StorageOptions {
  driver?: StorageDriver;
  prefix?: string;
  compression?: Compression;
  encryption?: Encryption;
  encryptionKey?: string;
  schema?: z.ZodType<any>;
  ttl?: number;
  maxSize?: number;
  version?: number;
  migrations?: Record<number, (data: any) => any>;
}

interface StorageItem<T = any> {
  value: T;
  timestamp: number;
  ttl?: number;
  version: number;
  size: number;
}

interface StorageStats {
  totalItems: number;
  totalSize: number;
  oldestItem: Date;
  newestItem: Date;
  compressionRatio: number;
  hitRate: number;
  missRate: number;
}

class StorageManager {
  private driver: StorageDriver;
  private prefix: string;
  private compression: Compression;
  private encryption: Encryption;
  private encryptionKey?: string;
  private schema?: z.ZodType<any>;
  private ttl?: number;
  private maxSize: number;
  private version: number;
  private migrations: Record<number, (data: any) => any>;
  private cache: Map<string, StorageItem> = new Map();
  private eventEmitter: EventEmitter;
  private stats: {
    hits: number;
    misses: number;
    totalSize: number;
    originalSize: number;
  };

  constructor(options: StorageOptions = {}) {
    this.driver = options.driver || 'localStorage';
    this.prefix = options.prefix || 'app:';
    this.compression = options.compression || 'none';
    this.encryption = options.encryption || 'none';
    this.encryptionKey = options.encryptionKey;
    this.schema = options.schema;
    this.ttl = options.ttl;
    this.maxSize = options.maxSize || 1024 * 1024 * 10; // 10MB
    this.version = options.version || 1;
    this.migrations = options.migrations || {};
    this.eventEmitter = new EventEmitter();
    this.stats = {
      hits: 0,
      misses: 0,
      totalSize: 0,
      originalSize: 0,
    };

    this.init();
  }

  private async init(): Promise<void> {
    await this.loadFromDriver();
    this.startMaintenanceInterval();
  }

  private startMaintenanceInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Run every minute
  }

  private async loadFromDriver(): Promise<void> {
    switch (this.driver) {
      case 'localStorage':
      case 'sessionStorage':
        const storage = window[this.driver];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (key?.startsWith(this.prefix)) {
            try {
              const item = JSON.parse(storage.getItem(key) || '');
              if (this.isValidItem(item)) {
                this.cache.set(key.slice(this.prefix.length), item);
              }
            } catch (error) {
              console.error(`Error loading item ${key}:`, error);
            }
          }
        }
        break;

      case 'indexedDB':
        // Implementation for IndexedDB
        break;

      case 'memory':
        // Nothing to load for memory driver
        break;
    }
  }

  private async saveToDriver(key: string, item: StorageItem): Promise<void> {
    const fullKey = this.prefix + key;
    const value = JSON.stringify(item);

    switch (this.driver) {
      case 'localStorage':
      case 'sessionStorage':
        window[this.driver].setItem(fullKey, value);
        break;

      case 'indexedDB':
        // Implementation for IndexedDB
        break;

      case 'memory':
        // Nothing to save for memory driver
        break;
    }
  }

  private async compress(data: any): Promise<any> {
    switch (this.compression) {
      case 'lz':
        // Implementation for LZ compression
        return data;

      case 'gzip':
        // Implementation for GZIP compression
        return data;

      default:
        return data;
    }
  }

  private async decompress(data: any): Promise<any> {
    switch (this.compression) {
      case 'lz':
        // Implementation for LZ decompression
        return data;

      case 'gzip':
        // Implementation for GZIP decompression
        return data;

      default:
        return data;
    }
  }

  private async encrypt(data: any): Promise<any> {
    if (!this.encryptionKey) return data;

    switch (this.encryption) {
      case 'aes':
        // Implementation for AES encryption
        return data;

      case 'rsa':
        // Implementation for RSA encryption
        return data;

      default:
        return data;
    }
  }

  private async decrypt(data: any): Promise<any> {
    if (!this.encryptionKey) return data;

    switch (this.encryption) {
      case 'aes':
        // Implementation for AES decryption
        return data;

      case 'rsa':
        // Implementation for RSA decryption
        return data;

      default:
        return data;
    }
  }

  private isValidItem(item: StorageItem): boolean {
    if (!item || typeof item !== 'object') return false;
    if (!item.timestamp || !item.version) return false;
    if (item.ttl && Date.now() - item.timestamp > item.ttl) return false;
    if (this.schema) {
      try {
        this.schema.parse(item.value);
      } catch {
        return false;
      }
    }
    return true;
  }

  private async migrate(item: StorageItem): Promise<StorageItem> {
    if (item.version === this.version) return item;

    let value = item.value;
    for (let v = item.version; v < this.version; v++) {
      const migration = this.migrations[v];
      if (migration) {
        value = await migration(value);
      }
    }

    return { ...item, value, version: this.version };
  }

  private calculateSize(value: any): number {
    return new TextEncoder().encode(JSON.stringify(value)).length;
  }

  private cleanup(): void {
    const now = Date.now();
    let totalSize = 0;

    for (const [key, item] of this.cache) {
      if (item.ttl && now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        this.eventEmitter.emit('expired', { key, item });
        continue;
      }

      totalSize += item.size;
    }

    if (totalSize > this.maxSize) {
      const sortedItems = Array.from(this.cache.entries()).sort(
        (a, b) => a[1].timestamp - b[1].timestamp
      );

      while (totalSize > this.maxSize && sortedItems.length > 0) {
        const [key, item] = sortedItems.shift()!;
        totalSize -= item.size;
        this.cache.delete(key);
        this.eventEmitter.emit('evicted', { key, item });
      }
    }
  }

  public async set<T>(
    key: string,
    value: T,
    options: Partial<StorageOptions> = {}
  ): Promise<void> {
    const size = this.calculateSize(value);
    if (size > this.maxSize) {
      throw new Error('Value exceeds maximum size limit');
    }

    const compressed = await this.compress(value);
    const encrypted = await this.encrypt(compressed);

    const item: StorageItem<T> = {
      value: encrypted,
      timestamp: Date.now(),
      ttl: options.ttl || this.ttl,
      version: this.version,
      size,
    };

    this.cache.set(key, item);
    await this.saveToDriver(key, item);
    this.eventEmitter.emit('set', { key, item });
  }

  public async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }

    if (item.ttl && Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.eventEmitter.emit('expired', { key, item });
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    const migrated = await this.migrate(item);
    const decrypted = await this.decrypt(migrated.value);
    const decompressed = await this.decompress(decrypted);
    return decompressed;
  }

  public async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      switch (this.driver) {
        case 'localStorage':
        case 'sessionStorage':
          window[this.driver].removeItem(this.prefix + key);
          break;
      }
      this.eventEmitter.emit('delete', { key });
    }
    return deleted;
  }

  public async clear(): Promise<void> {
    this.cache.clear();
    switch (this.driver) {
      case 'localStorage':
      case 'sessionStorage':
        const storage = window[this.driver];
        for (let i = storage.length - 1; i >= 0; i--) {
          const key = storage.key(i);
          if (key?.startsWith(this.prefix)) {
            storage.removeItem(key);
          }
        }
        break;
    }
    this.eventEmitter.emit('clear', null);
  }

  public async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  public async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  public async size(): Promise<number> {
    return this.cache.size;
  }

  public getStats(): StorageStats {
    const items = Array.from(this.cache.values());
    const timestamps = items.map(item => item.timestamp);

    return {
      totalItems: this.cache.size,
      totalSize: this.stats.totalSize,
      oldestItem: new Date(Math.min(...timestamps)),
      newestItem: new Date(Math.max(...timestamps)),
      compressionRatio:
        this.stats.originalSize > 0
          ? this.stats.totalSize / this.stats.originalSize
          : 1,
      hitRate:
        this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      missRate:
        this.stats.misses / (this.stats.hits + this.stats.misses) || 0,
    };
  }

  public on(event: string, handler: (data: any) => void): () => void {
    return this.eventEmitter.on(event, handler).unsubscribe;
  }
}

// React integration
import { createContext, useContext, useState, useEffect } from 'react';

const StorageContext = createContext<StorageManager | null>(null);

export const StorageProvider: React.FC<{
  children,
  options,
}: {
  children: React.ReactNode;
  options?: StorageOptions;
}): JSX.Element {
  const [storage] = useState(() => new StorageManager(options));

  return (
    <StorageContext.Provider value={storage}>{children}</StorageContext.Provider>
  );
}

export function useStorage() {
  const storage = useContext(StorageContext);
  if (!storage) {
    throw new Error('useStorage must be used within a StorageProvider');
  }

  const [stats, setStats] = useState(storage.getStats());

  useEffect(() => {
    const unsubscribe = storage.on('set', () => {
      setStats(storage.getStats());
    });

    return unsubscribe;
  }, [storage]);

  return {
    set: storage.set.bind(storage),
    get: storage.get.bind(storage),
    delete: storage.delete.bind(storage),
    clear: storage.clear.bind(storage),
    has: storage.has.bind(storage),
    keys: storage.keys.bind(storage),
    size: storage.size.bind(storage),
    stats,
  };
}

export {
  StorageManager,
  type StorageDriver,
  type StorageOptions,
  type StorageStats,
};

// Example usage:
// const storage = new StorageManager({
//   driver: 'localStorage',
//   prefix: 'myapp:',
//   compression: 'lz',
//   encryption: 'aes',
//   encryptionKey: 'secret-key',
//   schema: z.object({
//     name: z.string(),
//     age: z.number(),
//   }),
//   ttl: 3600000, // 1 hour
//   maxSize: 1024 * 1024, // 1MB
//   version: 1,
//   migrations: {
//     1: (data) => ({ ...data, newField: 'default' }),
//   },
// });
//
// await storage.set('user', { name: 'John', age: 30 });
// const user = await storage.get('user');
//
// // React usage
// function MyComponent() {
//   const { set, get, stats } = useStorage();
//
//   useEffect(() => {
//     const loadData = async () => {
//       const data = await get('myData');
//       console.log('Data:', data);
//     };
//     loadData();
//   }, []);
//
//   return (
//     <div>
//       <div>Total Items: {stats.totalItems}</div>
//       <div>Hit Rate: {stats.hitRate.toFixed(2)}</div>
//     </div>
//   );
// }
export default ExperimentManager;
