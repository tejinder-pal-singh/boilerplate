import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthTokensDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Access token expiration time in seconds',
    example: 3600
  })
  expiresIn: number;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'Authentication tokens',
    type: AuthTokensDto
  })
  tokens: AuthTokensDto;

  @ApiPropertyOptional({
    description: 'MFA setup required flag',
    example: false
  })
  mfaRequired?: boolean;

  @ApiPropertyOptional({
    description: 'MFA QR code URL for initial setup',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA...'
  })
  mfaQrCode?: string;

  @ApiPropertyOptional({
    description: 'MFA backup codes',
    example: ['12345678', '87654321']
  })
  mfaBackupCodes?: string[];
}
