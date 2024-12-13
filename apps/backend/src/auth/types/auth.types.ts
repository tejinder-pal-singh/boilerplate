import { User } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  roles?: string[];
  permissions?: string[];
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface OAuthProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  provider: 'google' | 'github';
  raw?: any;
}

export interface AuthSession {
  id: string;
  userId: string;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  lastActivity: Date;
  isValid: boolean;
}

export interface TwoFactorSecret {
  secret: string;
  otpauthUrl: string;
  qrCodeUrl: string;
}

export interface LoginAttempt {
  email: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  timestamp: Date;
}

export interface PasswordResetToken {
  token: string;
  expiresAt: Date;
}

export interface AuthenticatedContext {
  user: User;
  token: JwtPayload;
  session?: AuthSession;
}
