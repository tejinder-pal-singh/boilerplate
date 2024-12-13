import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { UsersService } from '../users/users.service';
import { RedisService } from '../shared/redis/redis.service';
import { AuthProvider, User } from '../users/entities/user.entity';
import { LoginDto, RegisterDto, ResetPasswordDto } from './dto';
import { JwtPayload, TokenResponse } from './interfaces';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await user.validatePassword(password))) {
      return user;
    }
    return null;
  }

  async register(registerDto: RegisterDto): Promise<User> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await this.usersService.create({
      ...registerDto,
      emailVerificationToken: verificationToken,
      provider: AuthProvider.LOCAL,
    });

    // Send verification email
    await this.sendVerificationEmail(user.email, verificationToken);

    return user;
  }

  async login(loginDto: LoginDto): Promise<TokenResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    if (user.isMfaEnabled) {
      if (!loginDto.mfaCode) {
        throw new BadRequestException('MFA code required');
      }
      const isValidMfaCode = authenticator.verify({
        token: loginDto.mfaCode,
        secret: user.mfaSecret,
      });
      if (!isValidMfaCode) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    return this.generateTokens(user);
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('jwt.secret'),
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user || !user.refreshTokens?.includes(refreshToken)) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Remove the used refresh token
      await this.usersService.removeRefreshToken(user.id, refreshToken);

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async generateTokens(user: User): Promise<TokenResponse> {
    const payload: JwtPayload = { sub: user.id, email: user.email, roles: user.roles };
    
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get('jwt.refreshTokenExpiration'),
      }),
    ]);

    // Store refresh token
    await this.usersService.addRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: parseInt(this.configService.get('jwt.accessTokenExpiration')),
    };
  }

  async validateOAuthLogin(profile: any, provider: AuthProvider): Promise<TokenResponse> {
    let user = await this.usersService.findByEmail(profile.email);

    if (!user) {
      user = await this.usersService.create({
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        provider,
        providerId: profile.id,
        isEmailVerified: true,
      });
    } else if (user.provider !== provider) {
      throw new ConflictException(`You have previously signed up with ${user.provider}`);
    }

    return this.generateTokens(user);
  }

  async generateMfaSecret(userId: string): Promise<{ secret: string; qrCode: string }> {
    const user = await this.usersService.findById(userId);
    const secret = authenticator.generateSecret();
    const otpAuthUrl = authenticator.keyuri(user.email, 'Enterprise App', secret);
    
    const qrCode = await toDataURL(otpAuthUrl);
    
    // Store secret temporarily in Redis
    await this.redisService.set(
      `mfa_secret:${userId}`,
      secret,
      60 * 10, // 10 minutes expiration
    );

    return { secret, qrCode };
  }

  async verifyAndEnableMfa(userId: string, token: string): Promise<void> {
    const secret = await this.redisService.get(`mfa_secret:${userId}`);
    if (!secret) {
      throw new BadRequestException('MFA setup expired. Please try again.');
    }

    const isValid = authenticator.verify({ token, secret });
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    await this.usersService.enableMfa(userId, secret);
    await this.redisService.del(`mfa_secret:${userId}`);
  }

  async initiatePasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Return void to prevent email enumeration
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour

    await this.usersService.setPasswordReset(user.id, resetToken, resetExpires);
    await this.sendPasswordResetEmail(email, resetToken);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const user = await this.usersService.findByPasswordResetToken(
      resetPasswordDto.token,
    );

    if (!user || user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    await this.usersService.updatePassword(
      user.id,
      resetPasswordDto.password,
    );
  }

  private async sendVerificationEmail(email: string, token: string): Promise<void> {
    // Implement email sending logic here
    console.log(`Verification email sent to ${email} with token ${token}`);
  }

  private async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    // Implement email sending logic here
    console.log(`Password reset email sent to ${email} with token ${token}`);
  }
}
