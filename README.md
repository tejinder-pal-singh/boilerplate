# Enterprise TypeScript Boilerplate

A production-ready, full-stack TypeScript monorepo boilerplate with Next.js 14 and NestJS. This boilerplate is designed to be:
- 🚀 Easy to set up and start developing
- 🔍 Easy to debug with comprehensive logging and monitoring
- 🛠 Maintainable with clear structure and best practices
- 🔒 Secure with built-in security features
- 📈 Scalable for large applications

## 🌟 Features

### Frontend (Next.js 14+)
- App Router architecture
- Type-safe API integration
- Authentication flows
- Real-time features with WebSocket
- Performance optimized
- Tailwind CSS for styling
- Radix UI components

### Backend (NestJS)
- Modular architecture
- Type-safe REST APIs
- WebSocket support
- OpenAPI (Swagger) documentation
- Comprehensive security features:
  - Helmet security headers
  - Rate limiting with Redis
  - CORS protection
  - Input validation
  - JWT authentication
  - API key management
- Advanced error handling:
  - Global exception filters
  - Validation error handling
  - Request timeout handling
  - Comprehensive logging
- Database integration:
  - TypeORM with PostgreSQL
  - Redis for caching
  - Connection pooling
- Monitoring and logging:
  - Structured logging with Pino
  - OpenTelemetry integration
  - Health check endpoints
  - Request timing
  - Audit logging

### Infrastructure
- Docker & Docker Compose setup
- Resource limits and health checks
- GitHub Actions CI/CD
- Kubernetes ready
- Monitoring & logging
- Security scanning

### Development Tools
- VSCode debugging configurations
- Commit message linting
- ESLint & Prettier
- Husky git hooks
- Jest testing setup
- E2E testing ready

## 🚀 Quick Start

1. **Prerequisites**
   - Node.js >= 18
   - pnpm >= 8
   - Docker & Docker Compose
   - Git

2. **Setup**
   ```bash
   # Clone the repository
   git clone [your-repo-url]
   
   # Install dependencies
   pnpm install
   
   # Setup environment variables
   cp .env.example .env
   
   # Start development environment
   pnpm dev
   ```

## 🔍 Debugging Guide

### VSCode Debugging
Pre-configured debug configurations are available for:
- Backend API (F5)
- Frontend Next.js (Chrome)
- Unit Tests
- E2E Tests

### Common Issues
1. **Port Conflicts**
   - Frontend runs on 3000
   - Backend runs on 4000
   - Redis on 6379
   - PostgreSQL on 5432

2. **Database Issues**
   - Run `docker-compose up db` for database only
   - Check logs with `docker-compose logs db`

3. **Cache Issues**
   - Clear Turborepo cache: `pnpm turbo clean`
   - Clear Next.js cache: `pnpm clean`

## 🛡️ Security Features

1. **API Security**
   - Helmet.js security headers
   - Rate limiting with Redis
   - JWT authentication
   - Input validation
   - CORS protection
   - XSS prevention
   - CSRF protection
   - SQL injection prevention

2. **Infrastructure Security**
   - Docker security best practices
   - Secure environment variables
   - Dependency scanning
   - Regular security updates

3. **Monitoring & Logging**
   - OpenTelemetry integration
   - Structured logging with Pino
   - Error tracking
   - Performance monitoring

## 🔄 Development Workflow

1. **Branch Strategy**
   - main: production-ready code
   - develop: integration branch
   - feature/*: new features
   - fix/*: bug fixes

2. **Commit Convention**
   - feat: new feature
   - fix: bug fix
   - docs: documentation
   - style: formatting
   - refactor: code restructuring
   - test: adding tests
   - chore: maintenance

3. **Code Quality**
   - ESLint for linting
   - Prettier for formatting
   - Husky for git hooks
   - Jest for testing
   - Playwright for E2E tests

## 🏗 Project Structure

```
/monorepo-root
  /apps
    /frontend          # Next.js application
    /backend          # NestJS application
  /packages
    /shared          # Shared TypeScript types & utilities
    /ui              # Shared UI components
    /config          # Shared configurations
  /infrastructure
    /docker          # Docker configurations
    /k8s             # Kubernetes manifests
  /docs             # Documentation
```

## 🔧 Development Guide

### Environment Variables
The following environment variables are required:
- Database configuration (DB_HOST, DB_PORT, etc.)
- Redis configuration (REDIS_HOST, REDIS_PORT, etc.)
- JWT configuration (JWT_SECRET, JWT_EXPIRATION, etc.)
- Rate limiting configuration (RATE_LIMIT_TTL, RATE_LIMIT_MAX)
- OAuth configuration (for social login)
- Vault configuration (for secrets management)

### Running Tests
```bash
# Run all tests
pnpm test

# Run specific test suites
pnpm run test:frontend
pnpm run test:backend
pnpm run test:e2e

# Run tests in watch mode
pnpm run test:watch
```

### Code Quality

- ESLint and Prettier are configured
- Pre-commit hooks check code quality
- Commit message format: `type(scope): message`
  - Types: feat, fix, docs, style, refactor, test, chore
  - Example: `feat(auth): add Google OAuth login`

## 📚 Documentation

Detailed documentation is available in the `/docs` directory:

- [Architecture Overview](docs/architecture.md) - System design, flows, and deployment architecture
- [Code Examples](docs/examples.md) - Examples for backend, frontend, and infrastructure
- [Troubleshooting Guide](docs/troubleshooting.md) - Solutions for common issues

### Quick Links

- [Backend API Documentation](http://localhost:4000/api) - OpenAPI/Swagger documentation
- [Environment Variables](docs/examples.md#environment-variables) - Configuration guide
- [Development Guide](docs/examples.md#development-guide) - Setup and development workflow
- [Deployment Guide](docs/examples.md#deployment) - Production deployment instructions
- [Contributing Guide](docs/examples.md#contributing) - Guidelines for contributors

## 📈 Monitoring & Logging

1. **Application Logs**
   - Structured JSON logging
   - Log levels (ERROR, WARN, INFO, DEBUG)
   - Request/Response logging
   - Error stack traces
   - Performance metrics

2. **Infrastructure Monitoring**
   - Container health checks
   - Resource usage monitoring
   - Database connection pooling
   - Cache hit rates
   - API response times

## 🚢 Deployment

### Development
```bash
# Start all services
docker-compose up -d

# Start with specific services
docker-compose up -d postgres redis

# View logs
docker-compose logs -f
```

### Production
1. Build Docker images
   ```bash
   docker-compose -f docker-compose.prod.yml build
   ```

2. Deploy using Docker Compose
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. Deploy to Kubernetes
   ```bash
   kubectl apply -f infrastructure/k8s/
   ```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes (following commit message convention)
4. Push to the branch
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## Comprehensive Documentation for All Packages and Features

### Validation System
- Schema-based validation using Zod
- Custom validation rules
- Async validation support
- Validation caching
- Error message customization
- React integration

### Form Builder
- Declarative form configuration
- Field-level validation
- Schema validation
- Form state management
- Custom field rendering
- Form submission handling
- Error handling
- React hooks integration

### State Machine
- Finite state machine implementation
- Support for atomic, compound, and parallel states
- Entry/exit actions
- Guards and conditions
- Async transitions
- Event queueing
- History tracking
- React integration
- Undo/redo support

### Query Builder
- Fluent SQL query building
- Support for complex joins
- Where conditions with multiple operators
- Group by with having clauses
- Order by with direction
- Pagination (limit/offset)
- Parameter binding
- Query cloning
- Type safety

### Event System
- Advanced event emitter with options
- Priority-based event handling
- Event filtering and transformation
- Debouncing and throttling
- Retry mechanism with delay
- Async event handling
- Error handling and timeouts
- React integration
- Subscription management

### Worker Pool
- Configurable worker pool size
- Priority-based task scheduling
- Task timeout and retry mechanisms
- Progress tracking
- Pool metrics and monitoring
- Worker status tracking
- Dynamic pool resizing
- Error handling
- React integration

### Router System
- Client-side routing with history management
- Route guards and middleware
- Nested routes support
- Route parameters and query parsing
- Layout system
- Error boundaries per route
- Loading states
- Navigation API
- React integration

### WebSocket Manager
- Robust WebSocket client
- Automatic reconnection
- Ping/pong heartbeat
- Message type subscription
- Message filtering and transformation
- Error handling
- Connection state management
- Event system integration
- React integration

### Storage System
- Multiple storage drivers (memory, localStorage, sessionStorage, IndexedDB)
- Data compression and encryption
- Schema validation with Zod
- TTL support
- Size limits and cleanup
- Version control and migrations
- Cache management
- Performance metrics
- React integration

### Notification Manager
- Multiple notification types
- Customizable positions
- Animation support
- Progress indicators
- Action buttons
- Auto-dismiss
- Queue management
- Event system
- React integration

### Email Service
- Multiple provider support (SendGrid, AWS SES, Mailgun, Postmark, SMTP)
- Template management
- Email queuing and scheduling
- Rate limiting per provider
- Retry mechanism
- Priority levels
- Attachments support
- Open and click tracking
- Bounce handling
- Analytics and metrics
- React integration

## Detailed Package Examples

### 1. Validation System
```typescript
import { useValidation } from '@boilerplate/validator';

// Define schema
const userSchema = z.object({
  username: z.string().min(3).max(20),
  email: z.string().email(),
  age: z.number().min(18),
});

function UserForm() {
  const { validate, validateSchema } = useValidation();

  const handleSubmit = async (data) => {
    // Schema validation
    const result = await validateSchema(data, userSchema);
    if (!result.valid) {
      console.error(result.errors);
      return;
    }

    // Custom validation
    const emailResult = await validate(data.email, {
      unique: true,
      customRule: (value) => value.endsWith('@company.com'),
    });
  };
}
```

### 2. Form Builder
```typescript
import { Form, Field, useForm } from '@boilerplate/form-builder';

// Define form configuration
const formConfig = {
  fields: [
    {
      name: 'username',
      type: 'text',
      label: 'Username',
      validation: {
        required: true,
        minLength: 3,
      },
    },
    {
      name: 'preferences',
      type: 'select',
      label: 'Preferences',
      options: [
        { label: 'Option 1', value: '1' },
        { label: 'Option 2', value: '2' },
      ],
      multiple: true,
    },
  ],
  onSubmit: async (values) => {
    await saveUser(values);
  },
  validateOnChange: true,
};

// Custom field rendering
function CustomField() {
  const { values, setFieldValue } = useForm();
  
  return (
    <Field
      name="custom"
      render={({ value, onChange, error }) => (
        <div>
          <input value={value} onChange={onChange} />
          {error && <span className="error">{error}</span>}
        </div>
      )}
    />
  );
}
```

### 3. State Machine
```typescript
import { useMachine } from '@boilerplate/state-machine';

// Define machine configuration
const checkoutMachine = {
  id: 'checkout',
  initial: 'cart',
  context: { items: [] },
  states: {
    cart: {
      on: {
        CHECKOUT: {
          target: 'payment',
          guards: [(ctx) => ctx.items.length > 0],
        },
      },
    },
    payment: {
      entry: [(ctx) => calculateTotal(ctx.items)],
      on: {
        SUCCESS: 'confirmation',
        FAILURE: 'cart',
      },
      invoke: {
        src: async (ctx) => processPayment(ctx.items),
        onDone: { target: 'confirmation' },
        onError: { target: 'cart' },
      },
    },
    confirmation: {
      type: 'final',
    },
  },
};

function Checkout() {
  const { state, send, can } = useMachine(checkoutMachine);
  
  return (
    <div>
      <div>Current State: {state.value}</div>
      <button
        disabled={!can('CHECKOUT')}
        onClick={() => send('CHECKOUT')}
      >
        Proceed to Payment
      </button>
    </div>
  );
}
```

### 4. Query Builder
```typescript
import { QueryBuilder } from '@boilerplate/query-builder';

// Build complex queries
const query = new QueryBuilder('users')
  .select('users.id', 'users.name', 'orders.total')
  .leftJoin('orders', 'users.id', '=', 'orders.user_id')
  .where('users.status', '=', 'active')
  .orWhere('users.role', '=', 'admin')
  .groupBy(['users.role'])
  .having('COUNT(*)', '>', 5)
  .orderBy('users.name', 'ASC')
  .limit(10)
  .offset(20);

const { text, values } = query.toSQL();
// Result:
// SELECT users.id, users.name, orders.total
// FROM users
// LEFT JOIN orders ON users.id = orders.user_id
// WHERE users.status = $1 OR users.role = $2
// GROUP BY users.role
// HAVING COUNT(*) > $3
// ORDER BY users.name ASC
// LIMIT 10 OFFSET 20
```

### 5. Event System
```typescript
import { useEvent } from '@boilerplate/event-system';

function NotificationSystem() {
  const { emit, on } = useEvent();

  // Subscribe to events with options
  useEffect(() => {
    const subscription = on('notification', (data) => {
      showNotification(data);
    }, {
      priority: 1,
      filter: (data) => data.important,
      debounce: 1000,
      async: true,
      errorHandler: (error) => console.error(error),
    });

    return () => subscription.unsubscribe();
  }, []);

  // Emit events
  const notify = () => {
    emit('notification', {
      message: 'New message!',
      important: true,
    });
  };
}
```

### 6. Worker Pool
```typescript
import { useWorkerPool } from '@boilerplate/worker-pool';

function DataProcessor() {
  const { addTask, getMetrics } = useWorkerPool();

  const processData = async (data) => {
    try {
      const result = await addTask(
        async () => {
          // Heavy computation
          return processLargeDataset(data);
        },
        {
          priority: 'high',
          timeout: 5000,
          retries: 3,
          onProgress: (progress) => {
            updateProgress(progress);
          },
        }
      );
      
      console.log('Task completed:', result);
    } catch (error) {
      console.error('Task failed:', error);
    }
  };

  return (
    <div>
      <div>Active Workers: {getMetrics().activeWorkers}</div>
      <div>Queue Length: {getMetrics().queueLength}</div>
    </div>
  );
}
```

### 7. Router System
```typescript
import { RouterProvider, Route, Link, useRouter } from '@boilerplate/router';

// Define routes with guards and layouts
const routes = [
  {
    path: '/',
    component: Home,
    guards: [authGuard],
    layout: MainLayout,
  },
  {
    path: '/users/:id',
    component: UserProfile,
    errorBoundary: ErrorFallback,
    loading: LoadingSpinner,
  },
];

// Route guard example
const authGuard = {
  canActivate: async (to, from) => {
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
      // Redirect to login
      return false;
    }
    return true;
  },
};

function App() {
  return (
    <RouterProvider routes={routes} initialPath="/">
      <nav>
        <Link to="/" activeClassName="active">Home</Link>
        <Link to="/users/123">User Profile</Link>
      </nav>
      {routes.map(route => (
        <Route key={route.path} {...route} />
      ))}
    </RouterProvider>
  );
}
```

### 8. WebSocket Manager
```typescript
import { useWebSocket } from '@boilerplate/websocket';

function ChatApp() {
  const { state, send, subscribe } = useWebSocket();

  useEffect(() => {
    // Subscribe to message types
    const unsubscribe = subscribe('chat', (message) => {
      addMessage(message);
    }, {
      filter: (msg) => msg.room === currentRoom,
      transform: (msg) => ({
        ...msg,
        timestamp: new Date(),
      }),
    });

    return unsubscribe;
  }, []);

  const sendMessage = (text) => {
    send('chat', {
      text,
      room: currentRoom,
      user: currentUser,
    });
  };

  return (
    <div>
      <div>Status: {state.connected ? 'Connected' : 'Disconnected'}</div>
      <div>Reconnecting: {state.reconnecting ? 'Yes' : 'No'}</div>
    </div>
  );
}
```

### 9. Storage System
```typescript
import { useStorage } from '@boilerplate/storage';

function UserPreferences() {
  const { set, get, stats } = useStorage();

  useEffect(() => {
    const loadPreferences = async () => {
      const prefs = await get('preferences');
      if (prefs) {
        applyPreferences(prefs);
      }
    };
    loadPreferences();
  }, []);

  const savePreferences = async (prefs) => {
    await set('preferences', prefs, {
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      compression: 'lz',
      encryption: 'aes',
    });
  };

  return (
    <div>
      <div>Cache Hit Rate: {(stats.hitRate * 100).toFixed(2)}%</div>
      <div>Storage Used: {stats.totalSize} bytes</div>
    </div>
  );
}
```

### 10. Notification Manager
```typescript
import { useNotifications } from '@boilerplate/notifications';

function NotificationDemo() {
  const notifications = useNotifications();

  const showNotification = () => {
    notifications.show({
      type: 'success',
      title: 'Success!',
      message: 'Operation completed successfully',
      duration: 5000,
      position: 'top-right',
      animation: 'slide',
      dismissible: true,
      progress: true,
      action: {
        label: 'Undo',
        onClick: () => handleUndo(),
      },
    });
  };

  // Convenience methods
  const showError = () => {
    notifications.error('Something went wrong!', {
      duration: 0, // Won't auto-dismiss
    });
  };
}
```

### 11. Email Service
```typescript
import { useEmail } from '@boilerplate/email';

function EmailCampaign() {
  const { send, createTemplate, stats } = useEmail();

  useEffect(() => {
    // Create email template
    createTemplate({
      id: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to {{appName}}!',
      html: `
        <h1>Welcome, {{name}}!</h1>
        <p>Thanks for joining {{appName}}.</p>
      `,
      variables: ['appName', 'name'],
    });
  }, []);

  const sendWelcomeEmail = async (user) => {
    await send({
      to: [{ email: user.email, name: user.name }],
      templateId: 'welcome',
      templateData: {
        appName: 'MyApp',
        name: user.name,
      },
      priority: 'high',
      trackOpens: true,
      trackClicks: true,
      attachments: [
        {
          filename: 'welcome.pdf',
          content: welcomePdfBuffer,
        },
      ],
    });
  };

  return (
    <div>
      <div>Sent: {stats.sent}</div>
      <div>Open Rate: {(stats.openRate * 100).toFixed(2)}%</div>
      <div>Click Rate: {(stats.clickRate * 100).toFixed(2)}%</div>
    </div>
  );
}
```

## Best Practices

1. **Error Handling**
   - Always use try-catch blocks for async operations
   - Implement proper error boundaries
   - Provide meaningful error messages
   - Log errors appropriately

2. **Performance**
   - Use debouncing and throttling where appropriate
   - Implement proper caching strategies
   - Optimize bundle size with code splitting
   - Monitor and optimize memory usage

3. **Security**
   - Validate all inputs
   - Sanitize data before rendering
   - Use proper encryption for sensitive data
   - Implement rate limiting
   - Follow security best practices for each feature

4. **Testing**
   - Write unit tests for all features
   - Implement integration tests
   - Use proper mocking strategies
   - Test error scenarios
   - Maintain good test coverage
