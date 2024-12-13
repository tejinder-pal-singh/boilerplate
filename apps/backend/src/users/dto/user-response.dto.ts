import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserSettingsDto {
  @ApiProperty({
    description: 'User preferred theme',
    example: 'light',
    enum: ['light', 'dark', 'system']
  })
  theme: string;

  @ApiProperty({
    description: 'User preferred language',
    example: 'en',
    enum: ['en', 'es', 'fr']
  })
  language: string;

  @ApiProperty({
    description: 'User timezone',
    example: 'America/New_York'
  })
  timezone: string;

  @ApiProperty({
    description: 'Email notifications enabled',
    example: true
  })
  emailNotifications: boolean;

  @ApiProperty({
    description: 'Push notifications enabled',
    example: true
  })
  pushNotifications: boolean;

  @ApiProperty({
    description: 'Two-factor authentication enabled',
    example: false
  })
  twoFactorEnabled: boolean;
}

export class UserProfileDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com'
  })
  email: string;

  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John'
  })
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe'
  })
  lastName?: string;

  @ApiPropertyOptional({
    description: 'User full name',
    example: 'John Doe'
  })
  fullName?: string;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1234567890'
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg'
  })
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'User bio',
    example: 'Software engineer passionate about building great products'
  })
  bio?: string;

  @ApiProperty({
    description: 'User settings',
    type: UserSettingsDto
  })
  settings: UserSettingsDto;

  @ApiProperty({
    description: 'Email verified status',
    example: true
  })
  emailVerified: boolean;

  @ApiProperty({
    description: 'Account creation date',
    example: '2024-12-13T18:19:07-05:00'
  })
  createdAt: string;

  @ApiProperty({
    description: 'Account last update date',
    example: '2024-12-13T18:19:07-05:00'
  })
  updatedAt: string;
}
