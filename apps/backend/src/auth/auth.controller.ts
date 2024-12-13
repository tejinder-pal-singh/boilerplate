import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, ResetPasswordDto } from './dto';
import { TokenResponse } from './interfaces';
import { User } from '../users/entities/user.entity';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  async register(@Body() registerDto: RegisterDto): Promise<{ message: string }> {
    await this.authService.register(registerDto);
    return { message: 'Registration successful. Please check your email for verification.' };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() loginDto: LoginDto): Promise<TokenResponse> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refresh(@Body('refreshToken') refreshToken: string): Promise<TokenResponse> {
    return this.authService.refreshToken(refreshToken);
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth login' })
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthCallback(@Req() req: any): Promise<TokenResponse> {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return req.user;
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth login' })
  async githubAuth() {
    // Guard redirects to GitHub
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  async githubAuthCallback(@Req() req: any): Promise<TokenResponse> {
    if (!req.user) {
      throw new UnauthorizedException();
    }
    return req.user;
  }

  @Post('mfa/generate')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate MFA secret' })
  async generateMfaSecret(@Req() req: { user: User }): Promise<{ qrCode: string }> {
    const { qrCode } = await this.authService.generateMfaSecret(req.user.id);
    return { qrCode };
  }

  @Post('mfa/verify')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify and enable MFA' })
  async verifyAndEnableMfa(
    @Req() req: { user: User },
    @Body('token') token: string,
  ): Promise<{ message: string }> {
    await this.authService.verifyAndEnableMfa(req.user.id, token);
    return { message: 'MFA enabled successfully' };
  }

  @Post('password/reset-request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  async requestPasswordReset(
    @Body('email') email: string,
  ): Promise<{ message: string }> {
    await this.authService.initiatePasswordReset(email);
    return {
      message: 'If an account exists with this email, you will receive password reset instructions.',
    };
  }

  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(resetPasswordDto);
    return { message: 'Password reset successful' };
  }
}
