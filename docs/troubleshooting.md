# Troubleshooting Guide

This guide helps you solve common issues you might encounter while working with this boilerplate.

## Table of Contents
- [Development Environment Issues](#development-environment-issues)
- [Database Issues](#database-issues)
- [Authentication Issues](#authentication-issues)
- [Performance Issues](#performance-issues)
- [Testing Issues](#testing-issues)
- [Deployment Issues](#deployment-issues)
- [WebSocket Issues](#websocket-issues)
- [Frontend Issues](#frontend-issues)

## Development Environment Issues

### Services Won't Start

**Symptoms:**
- Docker containers fail to start
- Services are unreachable
- Port conflicts

**Solutions:**

1. Check if ports are already in use:
```bash
# Check ports
lsof -i :3000
lsof -i :4000
lsof -i :5432
```

2. Verify Docker status:
```bash
# Check running containers
docker ps
# Check logs
docker-compose logs
```

3. Reset Docker environment:
```bash
# Stop all containers
docker-compose down
# Remove volumes
docker-compose down -v
# Start fresh
docker-compose up -d
```

### Node.js Issues

**Symptoms:**
- npm install fails
- Build errors
- TypeScript errors

**Solutions:**

1. Clear npm cache:
```bash
npm cache clean --force
```

2. Delete and reinstall dependencies:
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

3. Check Node.js version:
```bash
node -v  # Should be 18+
```

4. Check TypeScript version and configuration:
```bash
# Check TypeScript version
npx tsc --version

# Verify tsconfig
npx tsc --noEmit
```

## Database Issues

### Connection Failures

**Symptoms:**
- Database connection errors
- Timeout errors
- Authentication failures

**Solutions:**

1. Check database status:
```bash
docker-compose ps postgres
```

2. Verify connection settings:
```bash
# Test connection
psql -h localhost -U postgres -d app
```

3. Reset database container:
```bash
docker-compose down postgres
docker-compose up -d postgres
```

4. Check database logs:
```bash
docker-compose logs postgres
```

### Migration Issues

**Symptoms:**
- Migration failures
- Schema inconsistencies
- Data integrity issues

**Solutions:**

1. Reset migrations:
```bash
npm run typeorm schema:drop
npm run typeorm migration:run
```

2. Debug migration:
```bash
# Generate SQL without executing
npm run typeorm migration:show
```

3. Create fresh migration:
```bash
npm run typeorm migration:generate -- -n FixIssue
```

4. Verify migration history:
```bash
npm run typeorm migration:show
```

## Authentication Issues

### JWT Token Problems

**Symptoms:**
- Invalid token errors
- Token expiration issues
- Authentication failures

**Solutions:**

1. Check JWT configuration:
```bash
# Verify environment variables
echo $JWT_SECRET
echo $JWT_EXPIRATION
```

2. Clear tokens:
```bash
# Clear Redis tokens
docker-compose exec redis redis-cli FLUSHALL
```

3. Debug JWT token:
```bash
# Decode JWT token
echo $TOKEN | jwt decode -
```

4. Check token in browser:
```javascript
// Browser console
localStorage.getItem('token')
```

### OAuth Issues

**Symptoms:**
- Social login failures
- Callback errors
- State mismatch errors

**Solutions:**

1. Verify OAuth credentials:
```bash
# Check environment variables
echo $GOOGLE_CLIENT_ID
echo $GITHUB_CLIENT_ID
```

2. Validate callback URLs:
```bash
# Should match OAuth provider settings
echo $OAUTH_CALLBACK_URL
```

3. Check OAuth provider status:
```bash
# Test provider endpoints
curl https://accounts.google.com/.well-known/openid-configuration
```

## Performance Issues

### API Latency

**Symptoms:**
- Slow response times
- Timeout errors
- High CPU usage

**Solutions:**

1. Check server resources:
```bash
# Monitor CPU and memory
docker stats
```

2. Enable query logging:
```typescript
// In TypeORM config
logging: true,
maxQueryExecutionTime: 1000,
```

3. Monitor Redis performance:
```bash
docker-compose exec redis redis-cli --stat
```

4. Profile API endpoints:
```bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:4000/api/endpoint
```

### Memory Leaks

**Symptoms:**
- Increasing memory usage
- Performance degradation over time
- Out of memory errors

**Solutions:**

1. Generate heap snapshot:
```bash
# Start Node with inspector
node --inspect src/main.js
```

2. Monitor memory usage:
```bash
# Check container stats
docker stats

# Node process memory
process.memoryUsage()
```

3. Check for memory leaks:
```bash
# Using Node.js --inspect
node --inspect src/main.js
```

## Testing Issues

### Test Failures

**Symptoms:**
- Random test failures
- Timeout errors in tests
- Database connection issues in tests

**Solutions:**

1. Run specific tests:
```bash
# Run single test file
npm test -- path/to/file.spec.ts

# Run tests with grep
npm test -- -t "test name"
```

2. Debug tests:
```bash
# Run tests in debug mode
npm run test:debug

# Run with increased timeout
jest --testTimeout=10000
```

3. Check test database:
```bash
# Verify test database exists
psql -h localhost -U postgres -d test_db
```

## WebSocket Issues

### Connection Problems

**Symptoms:**
- WebSocket connection failures
- Frequent disconnections
- Message delivery issues

**Solutions:**

1. Check WebSocket status:
```javascript
// Browser console
socket.connected
```

2. Monitor WebSocket events:
```javascript
socket.on('connect_error', (error) => {
  console.error('Connection Error:', error);
});
```

3. Verify CORS settings:
```typescript
// In main.ts
app.enableCors({
  origin: true,
  methods: ['GET', 'POST'],
  credentials: true,
});
```

## Frontend Issues

### Build Problems

**Symptoms:**
- Next.js build failures
- Static generation errors
- Client-side rendering issues

**Solutions:**

1. Clear Next.js cache:
```bash
rm -rf .next
npm run build
```

2. Check for type errors:
```bash
npm run type-check
```

3. Verify environment variables:
```bash
# Should exist in both .env and .env.local
echo $NEXT_PUBLIC_API_URL
```

### State Management Issues

**Symptoms:**
- Redux state inconsistencies
- React query cache issues
- Hydration errors

**Solutions:**

1. Debug Redux state:
```javascript
// Browser console
store.getState()
```

2. Clear React Query cache:
```javascript
queryClient.clear()
```

3. Check for hydration issues:
```bash
# Enable React strict mode
npm run dev -- --strict
```

## Deployment Issues

### Kubernetes Deployment

**Symptoms:**
- Pod startup failures
- Service discovery issues
- Configuration problems

**Solutions:**

1. Check pod status:
```bash
kubectl get pods
kubectl describe pod <pod-name>
```

2. View pod logs:
```bash
kubectl logs <pod-name>
kubectl logs <pod-name> --previous
```

3. Verify configurations:
```bash
kubectl get configmap
kubectl get secret
```

### Docker Image Issues

**Symptoms:**
- Build failures
- Container startup issues
- Resource constraints

**Solutions:**

1. Clean Docker system:
```bash
docker system prune -a
```

2. Build with no cache:
```bash
docker-compose build --no-cache
```

3. Check container logs:
```bash
docker-compose logs -f service_name
```

## Getting Help

If you're still experiencing issues:

1. Check the [GitHub Issues](https://github.com/your-repo/issues)
2. Search the [Documentation](./README.md)
3. Create a new issue with:
   - Detailed description of the problem
   - Steps to reproduce
   - Error messages
   - Environment details
