# Code Examples

## Backend Examples

### 1. Controller with CRUD Operations
```typescript
@Controller('users')
@ApiTags('Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create user' })
  @UseGuards(JwtAuthGuard)
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
```

### 2. Service with Database Operations
```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
  ) {}

  async findOne(id: string): Promise<User> {
    // Try cache first
    const cached = await this.cacheService.get(`user:${id}`);
    if (cached) return cached;

    // Query database
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }

    // Cache result
    await this.cacheService.set(`user:${id}`, user);
    return user;
  }
}
```

### 3. Custom Decorator
```typescript
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

### 4. Custom Guard
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

## Frontend Examples

### 1. API Integration with RTK Query
```typescript
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => 'users',
    }),
    updateUser: builder.mutation<User, Partial<User>>({
      query: (update) => ({
        url: `users/${update.id}`,
        method: 'PATCH',
        body: update,
      }),
    }),
  }),
});

export const { useGetUsersQuery, useUpdateUserMutation } = api;
```

### 2. Protected Route Component
```typescript
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return isAuthenticated ? children : null;
}
```

### 3. Custom Hook for WebSocket
```typescript
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useWebSocket(url: string) {
  const socket = useRef<Socket>();

  useEffect(() => {
    socket.current = io(url, {
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    socket.current.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    return () => {
      socket.current?.disconnect();
    };
  }, [url]);

  const emit = (event: string, data: any) => {
    socket.current?.emit(event, data);
  };

  const on = (event: string, callback: (data: any) => void) => {
    socket.current?.on(event, callback);
  };

  return { emit, on };
}
```

## Docker Examples

### 1. Production Dockerfile for Backend
```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY tsconfig*.json ./
COPY apps/backend ./apps/backend

RUN npm ci
RUN npm run build --workspace=@enterprise/backend

# Production stage
FROM node:18-alpine

WORKDIR /app
COPY --from=builder /app/apps/backend/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

ENV NODE_ENV production
EXPOSE 4000

CMD ["npm", "run", "start:prod"]
```

### 2. Production Docker Compose
```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
    depends_on:
      postgres:
        condition: service_healthy
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 1G
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:4000
    ports:
      - "3000:3000"
    depends_on:
      - backend
```
