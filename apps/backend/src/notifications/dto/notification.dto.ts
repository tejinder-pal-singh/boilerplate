import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID, IsOptional, IsBoolean, IsDate } from 'class-validator';
import { Transform } from 'class-transformer';

export enum NotificationType {
  SYSTEM = 'system',
  SECURITY = 'security',
  ACCOUNT = 'account',
  PAYMENT = 'payment',
  SOCIAL = 'social'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export class NotificationDto {
  @ApiProperty({
    description: 'Notification ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: NotificationType.SYSTEM
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Notification priority',
    enum: NotificationPriority,
    example: NotificationPriority.MEDIUM
  })
  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @ApiProperty({
    description: 'Notification title',
    example: 'Security Alert'
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'Your password was recently changed'
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Additional data in JSON format',
    example: { ip: '192.168.1.1', location: 'New York' }
  })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Read status',
    example: false
  })
  @IsBoolean()
  read: boolean;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-12-13T18:22:19-05:00'
  })
  @IsDate()
  @Transform(({ value }) => new Date(value))
  createdAt: Date;
}

export class CreateNotificationDto {
  @ApiProperty({
    description: 'User ID to send notification to',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: NotificationType.SYSTEM
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Notification priority',
    enum: NotificationPriority,
    example: NotificationPriority.MEDIUM
  })
  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @ApiProperty({
    description: 'Notification title',
    example: 'Security Alert'
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'Your password was recently changed'
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    description: 'Additional data in JSON format',
    example: { ip: '192.168.1.1', location: 'New York' }
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateNotificationDto {
  @ApiProperty({
    description: 'Read status',
    example: true
  })
  @IsBoolean()
  read: boolean;
}

export class NotificationPreferencesDto {
  @ApiProperty({
    description: 'Email notification preferences',
    example: {
      [NotificationType.SECURITY]: true,
      [NotificationType.ACCOUNT]: true,
      [NotificationType.PAYMENT]: true,
      [NotificationType.SOCIAL]: false
    }
  })
  email: Record<NotificationType, boolean>;

  @ApiProperty({
    description: 'Push notification preferences',
    example: {
      [NotificationType.SECURITY]: true,
      [NotificationType.ACCOUNT]: false,
      [NotificationType.PAYMENT]: true,
      [NotificationType.SOCIAL]: true
    }
  })
  push: Record<NotificationType, boolean>;
}
