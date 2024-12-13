import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto, RegisterDto, ResetPasswordDto } from './dto';
import { User, AuthProvider } from '../users/entities/user.entity';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { RedisService } from '../shared/redis/redis.service';
import { LoggerService } from '../shared/services/logger.service';
import { MetricsService } from '../shared/services/metrics.service';
import { ErrorCode } from '../shared/types/error.types';
import {
  JwtPayload,
  AuthTokens,
  TwoFactorSecret,
  AuthenticatedContext,
} from './types/auth.types';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.usersService.findByEmail(email);
      if (user && (await user.comparePassword(password))) {
        this.metrics.increment('auth.validation.success');
        return user;
      }
      this.metrics.increment('auth.validation.failed');
      return null;
    } catch (error) {
      this.logger.error('Error validating user', { error, context: 'AuthService.validateUser', email });
      this.metrics.increment('auth.validation.error');
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthTokens> {
    try {
      const user = await this.validateUser(loginDto.email, loginDto.password);
      if (!user) {
        this.metrics.increment('auth.login.invalidCredentials');
        throw new UnauthorizedException({
          code: ErrorCode.INVALID_CREDENTIALS,
          message: 'Invalid credentials'
        });
      }

      if (!user.isEmailVerified) {
        this.metrics.increment('auth.login.emailNotVerified');
        throw new UnauthorizedException({
          code: ErrorCode.EMAIL_NOT_VERIFIED,
          message: 'Please verify your email first'
        });
      }

      if (user.isMfaEnabled) {
        if (!loginDto.mfaCode) {
          this.metrics.increment('auth.login.mfaRequired');
          throw new BadRequestException({
            code: ErrorCode.MFA_REQUIRED,
            message: 'MFA code required'
          });
        }

        const isValidMfaCode = authenticator.verify({
          token: loginDto.mfaCode,
          secret: user.mfaSecret,
        });

        if (!isValidMfaCode) {
          this.metrics.increment('auth.login.invalidMfaCode');
          throw new UnauthorizedException({
            code: ErrorCode.INVALID_MFA_CODE,
            message: 'Invalid MFA code'
          });
        }
      }

      const tokens = await this.generateTokens(user);
      await this.usersService.addRefreshToken(user.id, tokens.refreshToken);

      this.logger.info('User logged in successfully', { 
        userId: user.id, 
        context: 'AuthService.login' 
      });
      this.metrics.increment('auth.login.success');

      return tokens;
    } catch (error) {
      this.logger.error('Error during login', { 
        error, 
        context: 'AuthService.login',
        email: loginDto.email 
      });
      this.metrics.increment('auth.login.error');
      throw error;
    }
  }

  async register(registerDto: RegisterDto): Promise<AuthTokens> {
    try {
      const existingUser = await this.usersService.findByEmail(registerDto.email);
      if (existingUser) {
        this.metrics.increment('auth.register.emailExists');
        throw new ConflictException({
          code: ErrorCode.ALREADY_EXISTS,
          message: 'Email already exists'
        });
      }

      const user = await this.usersService.create({
        data: {
          ...registerDto,
          provider: AuthProvider.LOCAL,
          emailVerificationToken: crypto.randomBytes(32).toString('hex'),
        },
      });

      // Send verification email
      await this.sendVerificationEmail(user);

      const tokens = await this.generateTokens(user);
      await this.usersService.addRefreshToken(user.id, tokens.refreshToken);

      this.logger.info('User registered successfully', { 
        userId: user.id, 
        context: 'AuthService.register' 
      });
      this.metrics.increment('auth.register.success');

      return tokens;
    } catch (error) {
      this.logger.error('Error during registration', { 
        error, 
        context: 'AuthService.register',
        email: registerDto.email 
      });
      this.metrics.increment('auth.register.error');
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = await this.verifyToken(refreshToken, 'refresh');
      const user = await this.usersService.findById(payload.sub);

      if (!user.refreshTokens?.includes(refreshToken)) {
        this.metrics.increment('auth.refresh.invalidToken');
        throw new UnauthorizedException({
          code: ErrorCode.INVALID_REFRESH_TOKEN,
          message: 'Invalid refresh token'
        });
      }

      // Remove the old refresh token
      await this.usersService.removeRefreshToken(user.id, refreshToken);

      // Generate new tokens
      const tokens = await this.generateTokens(user);
      await this.usersService.addRefreshToken(user.id, tokens.refreshToken);

      this.metrics.increment('auth.refresh.success');
      return tokens;
    } catch (error) {
      this.logger.error('Error refreshing token', { 
        error, 
        context: 'AuthService.refreshToken' 
      });
      this.metrics.increment('auth.refresh.error');
      throw error;
    }
  }

  async generateMfaSecret(userId: string): Promise<TwoFactorSecret> {
    try {
      const user = await this.usersService.findById(userId);
      const secret = authenticator.generateSecret();
      const otpauthUrl = authenticator.keyuri(
        user.email,
        this.configService.get('APP_NAME', 'YourApp'),
        secret,
      );

      const qrCodeUrl = await toDataURL(otpauthUrl);
      await this.usersService.enableMfa(userId, secret);

      this.metrics.increment('auth.mfa.secretGenerated');
      return { secret, otpauthUrl, qrCodeUrl };
    } catch (error) {
      this.logger.error('Error generating MFA secret', { 
        error, 
        context: 'AuthService.generateMfaSecret',
        userId 
      });
      this.metrics.increment('auth.mfa.secretError');
      throw error;
    }
  }

  async verifyMfaToken(userId: string, token: string): Promise<boolean> {
    try {
      const user = await this.usersService.findById(userId);
      const isValid = authenticator.verify({
        token,
        secret: user.mfaSecret,
      });

      this.metrics.increment(isValid ? 'auth.mfa.verify.success' : 'auth.mfa.verify.failed');
      return isValid;
    } catch (error) {
      this.logger.error('Error verifying MFA token', { 
        error, 
        context: 'AuthService.verifyMfaToken',
        userId 
      });
      this.metrics.increment('auth.mfa.verify.error');
      throw error;
    }
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: parseInt(this.configService.get('JWT_EXPIRES_IN', '3600')),
      tokenType: 'Bearer',
    };
  }

  private async generateAccessToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      type: 'access',
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '1h'),
      secret: this.configService.get('JWT_SECRET'),
    });
  }

  private async generateRefreshToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      type: 'refresh',
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      secret: this.configService.get('JWT_REFRESH_SECRET'),
    });
  }

  private async verifyToken(token: string, type: 'access' | 'refresh'): Promise<JwtPayload> {
    try {
      const secret = type === 'access' 
        ? this.configService.get('JWT_SECRET')
        : this.configService.get('JWT_REFRESH_SECRET');

      const payload = await this.jwtService.verifyAsync(token, { secret });
      
      if (payload.type !== type) {
        throw new UnauthorizedException({
          code: ErrorCode.INVALID_TOKEN_TYPE,
          message: 'Invalid token type'
        });
      }

      return payload;
    } catch (error) {
      this.logger.error('Error verifying token', { 
        error, 
        context: 'AuthService.verifyToken',
        type 
      });
      throw new UnauthorizedException({
        code: ErrorCode.INVALID_TOKEN,
        message: 'Invalid token'
      });
    }
  }

  private async sendVerificationEmail(user: User): Promise<void> {
    // Implementation of email sending logic
    this.logger.info('Verification email sent', { 
      userId: user.id, 
      context: 'AuthService.sendVerificationEmail' 
    });
  }
}
