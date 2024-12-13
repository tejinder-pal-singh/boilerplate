interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDuration?: number;
  keyGenerator?: (req: any) => string;
  handler?: (req: any, res: any) => void;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
}

interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: number;
}

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private refillRate: number;
  private capacity: number;

  constructor(capacity: number, refillRate: number) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
    this.refillRate = refillRate;
    this.capacity = capacity;
  }

  refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const newTokens = (timePassed * this.refillRate) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }

  consume(tokens: number = 1): boolean {
    this.refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  getTokens(): number {
    this.refill();
    return this.tokens;
  }
}

class SlidingWindowCounter {
  private hits: Map<number, number>;
  private windowMs: number;

  constructor(windowMs: number) {
    this.hits = new Map();
    this.windowMs = windowMs;
    this.cleanup();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [timestamp] of this.hits) {
      if (now - timestamp > this.windowMs) {
        this.hits.delete(timestamp);
      }
    }
    setTimeout(() => this.cleanup(), this.windowMs);
  }

  increment(): void {
    const now = Date.now();
    this.hits.set(now, (this.hits.get(now) || 0) + 1);
  }

  getHits(): number {
    this.cleanup();
    return Array.from(this.hits.values()).reduce((sum, count) => sum + count, 0);
  }
}

class RateLimiter {
  private static instance: RateLimiter;
  private limits: Map<string, TokenBucket | SlidingWindowCounter>;
  private blocked: Map<string, number>;
  private config: RateLimitConfig;

  private constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: 60000, // 1 minute
      maxRequests: 100,
      blockDuration: 0,
      keyGenerator: (req) => req.ip || 'default',
      handler: (req, res) => {
        res.status(429).json({
          error: 'Too Many Requests',
          retryAfter: this.getRetryAfter(this.config.keyGenerator!(req)),
        });
      },
      skipFailedRequests: false,
      skipSuccessfulRequests: false,
      ...config,
    };

    this.limits = new Map();
    this.blocked = new Map();

    // Cleanup blocked IPs periodically
    setInterval(() => this.cleanupBlocked(), 60000);
  }

  public static getInstance(config: RateLimitConfig): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter(config);
    }
    return RateLimiter.instance;
  }

  private cleanupBlocked(): void {
    const now = Date.now();
    for (const [key, time] of this.blocked) {
      if (now >= time) {
        this.blocked.delete(key);
      }
    }
  }

  private isBlocked(key: string): boolean {
    const blockedUntil = this.blocked.get(key);
    if (!blockedUntil) return false;
    
    if (Date.now() >= blockedUntil) {
      this.blocked.delete(key);
      return false;
    }
    
    return true;
  }

  private getRetryAfter(key: string): number {
    const blockedUntil = this.blocked.get(key);
    if (!blockedUntil) return 0;
    return Math.max(0, blockedUntil - Date.now());
  }

  private getLimiter(key: string): TokenBucket | SlidingWindowCounter {
    let limiter = this.limits.get(key);
    
    if (!limiter) {
      if (this.config.windowMs) {
        limiter = new SlidingWindowCounter(this.config.windowMs);
      } else {
        const refillRate = this.config.maxRequests / (this.config.windowMs / 1000);
        limiter = new TokenBucket(this.config.maxRequests, refillRate);
      }
      this.limits.set(key, limiter);
    }
    
    return limiter;
  }

  public middleware() {
    return async (req: any, res: any, next: Function) => {
      const key = this.config.keyGenerator!(req);

      // Check if blocked
      if (this.isBlocked(key)) {
        return this.config.handler!(req, res);
      }

      const limiter = this.getLimiter(key);
      let allowed = false;

      if (limiter instanceof TokenBucket) {
        allowed = limiter.consume();
      } else {
        limiter.increment();
        allowed = limiter.getHits() <= this.config.maxRequests;
      }

      // Set headers
      const info = this.getRateLimitInfo(key);
      res.setHeader('X-RateLimit-Limit', info.limit);
      res.setHeader('X-RateLimit-Remaining', info.remaining);
      res.setHeader('X-RateLimit-Reset', info.resetTime);

      if (!allowed) {
        if (this.config.blockDuration) {
          this.blocked.set(key, Date.now() + this.config.blockDuration);
        }
        return this.config.handler!(req, res);
      }

      // Store original end function
      const originalEnd = res.end;
      res.end = (...args: any[]) => {
        // Skip based on response status
        if (
          (this.config.skipSuccessfulRequests && res.statusCode < 400) ||
          (this.config.skipFailedRequests && res.statusCode >= 400)
        ) {
          if (limiter instanceof TokenBucket) {
            limiter.consume(-1); // Return token
          }
        }
        
        originalEnd.apply(res, args);
      };

      next();
    };
  }

  public getRateLimitInfo(key: string): RateLimitInfo {
    const limiter = this.getLimiter(key);
    let current: number;
    let remaining: number;

    if (limiter instanceof TokenBucket) {
      current = this.config.maxRequests - limiter.getTokens();
      remaining = Math.floor(limiter.getTokens());
    } else {
      current = limiter.getHits();
      remaining = Math.max(0, this.config.maxRequests - current);
    }

    return {
      limit: this.config.maxRequests,
      current,
      remaining,
      resetTime: Date.now() + this.config.windowMs,
    };
  }

  public async reset(key: string): Promise<void> {
    this.limits.delete(key);
    this.blocked.delete(key);
  }

  public async resetAll(): Promise<void> {
    this.limits.clear();
    this.blocked.clear();
  }
}

// Express/Connect middleware factory
export function rateLimit(config: RateLimitConfig) {
  const limiter = RateLimiter.getInstance(config);
  return limiter.middleware();
}

// Fastify plugin
export function fastifyRateLimit(fastify: any, config: RateLimitConfig) {
  const limiter = RateLimiter.getInstance(config);
  fastify.addHook('onRequest', async (request: any, reply: any) => {
    return new Promise((resolve, reject) => {
      limiter.middleware()(request.raw, reply.raw, (err: Error) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

export default RateLimiter;
