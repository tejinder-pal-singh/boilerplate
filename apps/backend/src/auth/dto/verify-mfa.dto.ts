import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyMfaDto {
  @ApiProperty({
    description: 'MFA code from authenticator app or backup code',
    example: '123456',
    minLength: 6,
    maxLength: 8
  })
  @IsString({ message: 'MFA code must be a string' })
  @IsNotEmpty({ message: 'MFA code is required' })
  @Length(6, 8, { message: 'MFA code must be between 6 and 8 characters' })
  code: string;

  @ApiProperty({
    description: 'Temporary token received after successful password validation',
    example: 'abc123def456'
  })
  @IsString({ message: 'Token must be a string' })
  @IsNotEmpty({ message: 'Token is required' })
  token: string;
}
