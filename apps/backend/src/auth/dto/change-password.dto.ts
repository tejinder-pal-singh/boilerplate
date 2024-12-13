import { IsString, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../shared/validators/custom.validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'CurrentPassword123!',
  })
  @IsString({ message: 'Current password must be a string' })
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword: string;

  @ApiProperty({
    description: 'New password - minimum 8 characters, must contain at least one uppercase letter, one lowercase letter, one number and one special character',
    example: 'NewPassword123!',
    minLength: 8
  })
  @IsString({ message: 'New password must be a string' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @IsStrongPassword()
  @IsNotEmpty({ message: 'New password is required' })
  newPassword: string;
}
