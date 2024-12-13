import { IsString, MinLength, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../shared/validators/custom.validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token received via email',
    example: 'abc123def456',
    minLength: 32,
    maxLength: 64
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  @Matches(/^[a-zA-Z0-9]+$/, { 
    message: 'Token can only contain letters and numbers' 
  })
  token: string;

  @ApiProperty({
    description: 'New password - minimum 8 characters, must contain at least one uppercase letter, one lowercase letter, one number and one special character',
    example: 'NewPassword123!',
    minLength: 8
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsStrongPassword()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
