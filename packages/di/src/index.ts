import 'reflect-metadata';
import { createContext, useContext, useState, useEffect } from 'react';

type Constructor<T = any> = new (...args: any[]) => T;
type Token<T = any> = Constructor<T> | string | symbol;
type Factory<T = any> = (...args: any[]) => T;

interface Provider<T = any> {
  provide: Token<T>;
  useClass?: Constructor<T>;
  useFactory?: Factory<T>;
  useValue?: T;
  deps?: Token[];
  scope?: 'singleton' | 'transient' | 'request';
}

interface ContainerConfig {
  providers: Provider[];
  parent?: Container;
  autoRegister?: boolean;
}

const INJECT_METADATA_KEY = Symbol('INJECT');
const INJECTABLE_METADATA_KEY = Symbol('INJECTABLE');

// Decorators
export function Injectable(): ClassDecorator {
  return (target: any) => {
    Reflect.defineMetadata(INJECTABLE_METADATA_KEY, true, target);
    return target;
  };
}

export function Inject(token: Token): ParameterDecorator {
  return (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) => {
    const existingInjections = Reflect.getMetadata(INJECT_METADATA_KEY, target) || [];
    existingInjections[parameterIndex] = token;
    Reflect.defineMetadata(INJECT_METADATA_KEY, existingInjections, target);
  };
}

class Container {
  private static instance: Container;
  private instances: Map<Token, any> = new Map();
  private factories: Map<Token, Factory> = new Map();
  private providers: Map<Token, Provider> = new Map();
  private parent?: Container;
  private children: Set<Container> = new Set();
  private autoRegister: boolean;

  constructor(config: ContainerConfig) {
    this.parent = config.parent;
    this.autoRegister = config.autoRegister ?? true;

    if (this.parent) {
      this.parent.children.add(this);
    }

    config.providers.forEach(provider => this.register(provider));
  }

  public static getInstance(config: ContainerConfig): Container {
    if (!Container.instance) {
      Container.instance = new Container(config);
    }
    return Container.instance;
  }

  private register<T>(provider: Provider<T>): void {
    this.providers.set(provider.provide, provider);

    if (provider.useFactory) {
      this.factories.set(provider.provide, provider.useFactory);
    }
  }

  public resolve<T>(token: Token<T>): T {
    // Check existing instance
    const existingInstance = this.instances.get(token);
    if (existingInstance) {
      return existingInstance;
    }

    // Get provider
    const provider = this.providers.get(token);
    if (!provider) {
      if (this.parent) {
        return this.parent.resolve(token);
      }

      if (this.autoRegister && typeof token === 'function') {
        return this.createInstance(token);
      }

      throw new Error(`No provider found for ${token.toString()}`);
    }

    // Create instance
    let instance: T;

    if (provider.useValue) {
      instance = provider.useValue;
    } else if (provider.useFactory) {
      const deps = (provider.deps || []).map(dep => this.resolve(dep));
      instance = provider.useFactory(...deps);
    } else if (provider.useClass) {
      instance = this.createInstance(provider.useClass);
    } else {
      instance = this.createInstance(token as Constructor<T>);
    }

    // Cache instance if singleton
    if (provider.scope !== 'transient') {
      this.instances.set(token, instance);
    }

    return instance;
  }

  private createInstance<T>(target: Constructor<T>): T {
    // Get constructor parameters
    const paramTypes = Reflect.getMetadata('design:paramtypes', target) || [];
    const injections = Reflect.getMetadata(INJECT_METADATA_KEY, target) || [];

    // Resolve dependencies
    const deps = paramTypes.map((type: Token, index: number) => {
      const injectionToken = injections[index] || type;
      return this.resolve(injectionToken);
    });

    return new target(...deps);
  }

  public createChild(providers: Provider[] = []): Container {
    return new Container({
      providers,
      parent: this,
      autoRegister: this.autoRegister,
    });
  }

  public clearInstances(): void {
    this.instances.clear();
    this.children.forEach(child => child.clearInstances());
  }

  public hasProvider(token: Token): boolean {
    return this.providers.has(token) || (this.parent?.hasProvider(token) ?? false);
  }

  public remove(token: Token): void {
    this.providers.delete(token);
    this.factories.delete(token);
    this.instances.delete(token);
  }
}

// React Context
const DIContext = createContext<Container | null>(null);

// React Provider
export const DIProvider: React.FC<{
  children,
  providers,
  parent,
}: {
  children: React.ReactNode;
  providers: Provider[];
  parent?: Container;
}) {
  const [container] = useState(() => new Container({ providers, parent }));

  return (
    <DIContext.Provider value={container}>
      {children}
    </DIContext.Provider>
  );
}

// React Hook
export function useInjection<T>(token: Token<T>): T {
  const container = useContext(DIContext);
  if (!container) {
    throw new Error('useInjection must be used within a DIProvider');
  }

  const [instance, setInstance] = useState<T>(() => container.resolve(token));

  useEffect(() => {
    setInstance(container.resolve(token));
  }, [container, token]);

  return instance;
}

// Higher Order Component
export function withInjection<P extends object, T>(
  Component: React.ComponentType<P>,
  token: Token<T>,
  propertyName: keyof P
) {
  return function WithInjection(props: Omit<P, keyof T>) {
    const injected = useInjection(token);
    return <Component {...(props as P)} {...{ [propertyName]: injected }} />;
  };
}

// Module Decorator
export function Module(metadata: {
  providers?: Provider[];
  imports?: any[];
  exports?: any[];
}) {
  return (target: any) => {
    Reflect.defineMetadata('providers', metadata.providers || [], target);
    Reflect.defineMetadata('imports', metadata.imports || [], target);
    Reflect.defineMetadata('exports', metadata.exports || [], target);
    return target;
  };
}

export { Container, type Provider, type Token };

// Example usage:
// @Injectable()
// class UserService {
//   constructor(private http: HttpClient) {}
// }
//
// @Injectable()
// class AuthService {
//   constructor(
//     private userService: UserService,
//     @Inject('CONFIG') private config: Config
//   ) {}
// }
//
// const container = Container.getInstance({
//   providers: [
//     { provide: UserService, useClass: UserService },
//     { provide: 'CONFIG', useValue: { apiUrl: 'http://api.example.com' } },
//     {
//       provide: AuthService,
//       useFactory: (userService: UserService, config: Config) => {
//         return new AuthService(userService, config);
//       },
//       deps: [UserService, 'CONFIG'],
//     },
//   ],
// });
export default ExperimentManager;
