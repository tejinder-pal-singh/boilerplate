type NextFunction = () => Promise<void>;
type Context = Record<string, any>;
type MiddlewareFunction = (context: Context, next: NextFunction) => Promise<void>;

interface MiddlewareConfig {
  name?: string;
  priority?: number;
  enabled?: boolean;
  errorHandler?: boolean;
}

class Middleware {
  private name: string;
  private fn: MiddlewareFunction;
  private priority: number;
  private enabled: boolean;
  private errorHandler: boolean;

  constructor(fn: MiddlewareFunction, config: MiddlewareConfig = {}) {
    this.fn = fn;
    this.name = config.name || fn.name;
    this.priority = config.priority || 0;
    this.enabled = config.enabled !== false;
    this.errorHandler = config.errorHandler || false;
  }

  public async execute(context: Context, next: NextFunction): Promise<void> {
    if (!this.enabled) {
      return next();
    }

    try {
      await this.fn(context, next);
    } catch (error) {
      if (!this.errorHandler) {
        throw error;
      }
      
      context.error = error;
      await next();
    }
  }

  public getName(): string {
    return this.name;
  }

  public getPriority(): number {
    return this.priority;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public isErrorHandler(): boolean {
    return this.errorHandler;
  }

  public enable(): void {
    this.enabled = true;
  }

  public disable(): void {
    this.enabled = false;
  }
}

class MiddlewareChain {
  private middlewares: Middleware[] = [];
  private errorHandlers: Middleware[] = [];

  public use(fn: MiddlewareFunction, config?: MiddlewareConfig): this {
    const middleware = new Middleware(fn, config);
    
    if (middleware.isErrorHandler()) {
      this.errorHandlers.push(middleware);
      this.errorHandlers.sort((a, b) => b.getPriority() - a.getPriority());
    } else {
      this.middlewares.push(middleware);
      this.middlewares.sort((a, b) => b.getPriority() - a.getPriority());
    }
    
    return this;
  }

  public async execute(initialContext: Context = {}): Promise<Context> {
    const context: Context = { ...initialContext };
    let currentIndex = -1;

    const createNext = (index: number): NextFunction => {
      return async () => {
        if (index <= currentIndex) {
          throw new Error('next() called multiple times');
        }

        currentIndex = index;

        if (context.error) {
          // Execute error handlers
          if (index < this.errorHandlers.length) {
            const handler = this.errorHandlers[index];
            await handler.execute(context, createNext(index + 1));
          }
        } else {
          // Execute normal middlewares
          if (index < this.middlewares.length) {
            const middleware = this.middlewares[index];
            await middleware.execute(context, createNext(index + 1));
          }
        }
      };
    };

    try {
      await createNext(0)();
    } catch (error) {
      context.error = error;
      await createNext(0)();
    }

    return context;
  }

  public remove(name: string): boolean {
    const removeFromArray = (arr: Middleware[]) => {
      const index = arr.findIndex(m => m.getName() === name);
      if (index !== -1) {
        arr.splice(index, 1);
        return true;
      }
      return false;
    };

    return removeFromArray(this.middlewares) || removeFromArray(this.errorHandlers);
  }

  public clear(): void {
    this.middlewares = [];
    this.errorHandlers = [];
  }

  public getMiddlewares(): Middleware[] {
    return [...this.middlewares];
  }

  public getErrorHandlers(): Middleware[] {
    return [...this.errorHandlers];
  }

  public enable(name: string): boolean {
    const middleware = [...this.middlewares, ...this.errorHandlers]
      .find(m => m.getName() === name);
    
    if (middleware) {
      middleware.enable();
      return true;
    }
    
    return false;
  }

  public disable(name: string): boolean {
    const middleware = [...this.middlewares, ...this.errorHandlers]
      .find(m => m.getName() === name);
    
    if (middleware) {
      middleware.disable();
      return true;
    }
    
    return false;
  }
}

// Common middleware factories
export const timing = (config: { log?: boolean } = {}): MiddlewareFunction => {
  return async (context: Context, next: NextFunction) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    
    context.timing = duration;
    if (config.log) {
      console.log(`${context.path || 'Request'} took ${duration}ms`);
    }
  };
};

export const logger = (config: { level?: string } = {}): MiddlewareFunction => {
  return async (context: Context, next: NextFunction) => {
    console.log(`[${config.level || 'INFO'}] Request started:`, context);
    await next();
    console.log(`[${config.level || 'INFO'}] Request finished:`, context);
  };
};

export const errorHandler = (): MiddlewareFunction => {
  return async (context: Context, next: NextFunction) => {
    try {
      await next();
    } catch (error) {
      context.error = error;
      console.error('Error:', error);
    }
  };
};

export const cache = (config: { ttl?: number } = {}): MiddlewareFunction => {
  const cache = new Map<string, { data: any; timestamp: number }>();
  const ttl = config.ttl || 60000; // 1 minute default

  return async (context: Context, next: NextFunction) => {
    const key = context.cacheKey || context.path;
    if (!key) {
      return next();
    }

    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      context.data = cached.data;
      context.cached = true;
      return;
    }

    await next();

    if (context.data) {
      cache.set(key, {
        data: context.data,
        timestamp: Date.now(),
      });
    }
  };
};

export const rateLimiter = (config: { limit?: number; window?: number } = {}): MiddlewareFunction => {
  const requests = new Map<string, number[]>();
  const limit = config.limit || 100;
  const window = config.window || 60000; // 1 minute default

  return async (context: Context, next: NextFunction) => {
    const key = context.ip || 'default';
    const now = Date.now();
    
    let timestamps = requests.get(key) || [];
    timestamps = timestamps.filter(time => now - time < window);
    
    if (timestamps.length >= limit) {
      throw new Error('Rate limit exceeded');
    }
    
    timestamps.push(now);
    requests.set(key, timestamps);
    
    await next();
  };
};

export { MiddlewareChain, type MiddlewareFunction, type Context };

// Example usage:
// const chain = new MiddlewareChain();
//
// chain.use(timing({ log: true }), { priority: 100 });
// chain.use(logger({ level: 'DEBUG' }));
// chain.use(cache({ ttl: 5000 }));
// chain.use(rateLimiter({ limit: 10, window: 60000 }));
// chain.use(errorHandler(), { errorHandler: true });
//
// const context = await chain.execute({
//   path: '/api/users',
//   ip: '127.0.0.1',
// });
export default ExperimentManager;
