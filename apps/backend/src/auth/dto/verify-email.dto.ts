import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token received via email',
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
}
