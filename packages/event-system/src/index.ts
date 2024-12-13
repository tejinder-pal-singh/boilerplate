type EventHandler<T = any> = (event: T) => void | Promise<void>;
type EventFilter<T = any> = (event: T) => boolean;
type EventTransformer<T = any, R = any> = (event: T) => R;

interface EventOptions {
  once?: boolean;
  priority?: number;
  filter?: EventFilter;
  transform?: EventTransformer;
  errorHandler?: (error: Error) => void;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  async?: boolean;
  debounce?: number;
  throttle?: number;
}

interface EventSubscription {
  unsubscribe: () => void;
}

class EventEmitter {
  private handlers: Map<
    string,
    Array<{
      handler: EventHandler;
      options: EventOptions;
    }>
  > = new Map();

  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private throttleTimers: Map<string, boolean> = new Map();
  private retryCounters: Map<string, number> = new Map();

  constructor() {
    // Setup cleanup interval for debounce timers
    setInterval(() => {
      this.debounceTimers.forEach((timer, key) => {
        clearTimeout(timer);
        this.debounceTimers.delete(key);
      });
    }, 60000); // Cleanup every minute
  }

  private async executeHandler(
    handler: EventHandler,
    event: any,
    options: EventOptions
  ): Promise<void> {
    const { maxRetries = 0, retryDelay = 1000, errorHandler } = options;

    const retryKey = `${handler.toString()}_${JSON.stringify(event)}`;
    let retryCount = this.retryCounters.get(retryKey) || 0;

    try {
      if (options.timeout) {
        await Promise.race([
          handler(event),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error('Handler timeout')),
              options.timeout
            )
          ),
        ]);
      } else {
        await handler(event);
      }

      // Reset retry counter on success
      this.retryCounters.delete(retryKey);
    } catch (error) {
      if (errorHandler) {
        errorHandler(error as Error);
      }

      if (retryCount < maxRetries) {
        retryCount++;
        this.retryCounters.set(retryKey, retryCount);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        await this.executeHandler(handler, event, options);
      } else {
        this.retryCounters.delete(retryKey);
        throw error;
      }
    }
  }

  public on<T = any>(
    eventName: string,
    handler: EventHandler<T>,
    options: EventOptions = {}
  ): EventSubscription {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }

    const handlers = this.handlers.get(eventName)!;
    const entry = { handler, options };

    // Insert handler based on priority
    const index = handlers.findIndex(
      h => (h.options.priority || 0) < (options.priority || 0)
    );
    if (index === -1) {
      handlers.push(entry);
    } else {
      handlers.splice(index, 0, entry);
    }

    return {
      unsubscribe: () => {
        const index = handlers.findIndex(h => h.handler === handler);
        if (index !== -1) {
          handlers.splice(index, 1);
        }
      },
    };
  }

  public once<T = any>(
    eventName: string,
    handler: EventHandler<T>,
    options: EventOptions = {}
  ): EventSubscription {
    return this.on(eventName, handler, { ...options, once: true });
  }

  public async emit<T = any>(eventName: string, event: T): Promise<void> {
    if (!this.handlers.has(eventName)) return;

    const handlers = this.handlers.get(eventName)!;
    const promises: Promise<void>[] = [];

    for (let i = handlers.length - 1; i >= 0; i--) {
      const { handler, options } = handlers[i];

      // Apply filter
      if (options.filter && !options.filter(event)) {
        continue;
      }

      // Apply transform
      const transformedEvent = options.transform
        ? options.transform(event)
        : event;

      // Handle debounce
      if (options.debounce) {
        const debounceKey = `${eventName}_${handler.toString()}`;
        const existingTimer = this.debounceTimers.get(debounceKey);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        const promise = new Promise<void>(resolve => {
          const timer = setTimeout(async () => {
            await this.executeHandler(handler, transformedEvent, options);
            this.debounceTimers.delete(debounceKey);
            resolve();
          }, options.debounce);
          this.debounceTimers.set(debounceKey, timer);
        });

        promises.push(promise);
        continue;
      }

      // Handle throttle
      if (options.throttle) {
        const throttleKey = `${eventName}_${handler.toString()}`;
        if (this.throttleTimers.get(throttleKey)) {
          continue;
        }

        this.throttleTimers.set(throttleKey, true);
        setTimeout(
          () => this.throttleTimers.delete(throttleKey),
          options.throttle
        );
      }

      const promise = this.executeHandler(handler, transformedEvent, options);
      if (options.async) {
        promise.catch(error => {
          if (options.errorHandler) {
            options.errorHandler(error);
          }
        });
      } else {
        promises.push(promise);
      }

      if (options.once) {
        handlers.splice(i, 1);
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }

  public removeAllListeners(eventName?: string): void {
    if (eventName) {
      this.handlers.delete(eventName);
    } else {
      this.handlers.clear();
    }
  }

  public listenerCount(eventName: string): number {
    return this.handlers.get(eventName)?.length || 0;
  }

  public hasListeners(eventName: string): boolean {
    return this.listenerCount(eventName) > 0;
  }

  public getEventNames(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// React integration
import { createContext, useContext, useEffect, useCallback } from 'react';

const EventContext = createContext<EventEmitter | null>(null);

export const EventProvider: React.FC<{
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const emitter = new EventEmitter();

  return (
    <EventContext.Provider value={emitter}>{children}</EventContext.Provider>
  );
}

export function useEvent() {
  const emitter = useContext(EventContext);
  if (!emitter) {
    throw new Error('useEvent must be used within an EventProvider');
  }

  const emit = useCallback(
    async (eventName: string, event: any) => {
      await emitter.emit(eventName, event);
    },
    [emitter]
  );

  const on = useCallback(
    (eventName: string, handler: EventHandler, options?: EventOptions) => {
      return emitter.on(eventName, handler, options);
    },
    [emitter]
  );

  const once = useCallback(
    (eventName: string, handler: EventHandler, options?: EventOptions) => {
      return emitter.once(eventName, handler, options);
    },
    [emitter]
  );

  return { emit, on, once };
}

export { EventEmitter, type EventHandler, type EventOptions, type EventSubscription };

// Example usage:
// const emitter = new EventEmitter();
//
// // Basic usage
// emitter.on('userLoggedIn', (user) => {
//   console.log('User logged in:', user);
// });
//
// // With options
// emitter.on('dataChanged', async (data) => {
//   await processData(data);
// }, {
//   priority: 1,
//   async: true,
//   debounce: 1000,
//   filter: (data) => data.important,
//   transform: (data) => ({ ...data, timestamp: Date.now() }),
//   errorHandler: (error) => console.error('Error:', error),
//   maxRetries: 3,
//   retryDelay: 1000,
// });
//
// // React usage
// function MyComponent() {
//   const { emit, on } = useEvent();
//
//   useEffect(() => {
//     const subscription = on('myEvent', (data) => {
//       console.log('Event received:', data);
//     });
//
//     return () => subscription.unsubscribe();
//   }, []);
//
//   const handleClick = () => {
//     emit('myEvent', { message: 'Hello!' });
//   };
//
//   return <button onClick={handleClick}>Emit Event</button>;
// }
export default ExperimentManager;
