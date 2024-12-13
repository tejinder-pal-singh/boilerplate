import { 
  IsBoolean, 
  IsOptional, 
  IsString, 
  IsIn, 
  IsTimeZone 
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class UpdateSettingsDto {
  @ApiPropertyOptional({
    description: 'User preferred theme',
    example: 'light',
    enum: ['light', 'dark', 'system']
  })
  @IsOptional()
  @IsString({ message: 'Theme must be a string' })
  @IsIn(['light', 'dark', 'system'], { message: 'Invalid theme value' })
  theme?: string;

  @ApiPropertyOptional({
    description: 'User preferred language',
    example: 'en',
    enum: ['en', 'es', 'fr']
  })
  @IsOptional()
  @IsString({ message: 'Language must be a string' })
  @IsIn(['en', 'es', 'fr'], { message: 'Invalid language value' })
  language?: string;

  @ApiPropertyOptional({
    description: 'User timezone',
    example: 'America/New_York'
  })
  @IsOptional()
  @IsTimeZone({ message: 'Please provide a valid timezone' })
  timezone?: string;

  @ApiPropertyOptional({
    description: 'Email notifications enabled',
    example: true
  })
  @IsOptional()
  @IsBoolean({ message: 'Email notifications must be a boolean' })
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Push notifications enabled',
    example: true
  })
  @IsOptional()
  @IsBoolean({ message: 'Push notifications must be a boolean' })
  pushNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Two-factor authentication enabled',
    example: true
  })
  @IsOptional()
  @IsBoolean({ message: 'Two-factor authentication must be a boolean' })
  twoFactorEnabled?: boolean;
}
