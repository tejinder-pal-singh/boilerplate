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
