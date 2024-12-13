import { IsEmail, IsString, MinLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsStrongPassword } from '../../shared/validators/custom.validator';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email'
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'User password - minimum 8 characters, must contain at least one uppercase letter, one lowercase letter, one number and one special character',
    example: 'Password123!',
    minLength: 8
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsStrongPassword()
  password: string;

  @ApiPropertyOptional({
    description: 'Two-factor authentication code (6 digits)',
    example: '123456',
    minLength: 6,
    maxLength: 6,
    pattern: '^[0-9]{6}$'
  })
  @IsOptional()
  @IsString({ message: 'MFA code must be a string' })
  @Matches(/^[0-9]{6}$/, { message: 'MFA code must be exactly 6 digits' })
  mfaCode?: string;
}
