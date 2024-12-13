import { Request } from 'express';
import { User } from '../../users/entities/user.entity';

export interface AuthenticatedRequest extends Request {
  user: User;
}

export interface TokenPayload {
  sub: string;
  email: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  statusCode?: number;
  skipSuccessfulRequests?: boolean;
  skip?: (req: Request) => boolean;
}

export interface CorsConfig {
  origin: string | string[] | boolean;
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export interface CompressionConfig {
  level?: number;
  threshold?: number;
  filter?: (req: Request) => boolean;
}

export interface SecurityConfig {
  helmet: {
    contentSecurityPolicy?: boolean | object;
    crossOriginEmbedderPolicy?: boolean | object;
    crossOriginOpenerPolicy?: boolean | object;
    crossOriginResourcePolicy?: boolean | object;
    dnsPrefetchControl?: boolean | object;
    expectCt?: boolean | object;
    frameguard?: boolean | object;
    hidePoweredBy?: boolean | object;
    hsts?: boolean | object;
    ieNoOpen?: boolean | object;
    noSniff?: boolean | object;
    permittedCrossDomainPolicies?: boolean | object;
    referrerPolicy?: boolean | object;
    xssFilter?: boolean | object;
  };
  csrf?: {
    enabled: boolean;
    cookie?: {
      key: string;
      options?: {
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: boolean | 'lax' | 'strict' | 'none';
        signed?: boolean;
      };
    };
  };
}
