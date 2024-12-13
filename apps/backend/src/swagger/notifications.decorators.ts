import { applyDecorators } from '@nestjs/common';
import { 
  ApiOperation, 
  ApiResponse, 
  ApiUnauthorizedResponse, 
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
  ApiQuery
} from '@nestjs/swagger';
import { NotificationDto, NotificationType } from '../notifications/dto/notification.dto';

export const ApiGetNotifications = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get user notifications' }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (starts from 1)',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Number of items per page',
    }),
    ApiQuery({
      name: 'type',
      required: false,
      enum: NotificationType,
      description: 'Filter by notification type',
    }),
    ApiQuery({
      name: 'read',
      required: false,
      type: Boolean,
      description: 'Filter by read status',
    }),
    ApiResponse({
      status: 200,
      description: 'Notifications retrieved successfully',
      type: [NotificationDto]
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};

export const ApiMarkNotificationRead = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Mark notification as read' }),
    ApiResponse({
      status: 200,
      description: 'Notification marked as read',
      type: NotificationDto
    }),
    ApiNotFoundResponse({
      description: 'Notification not found',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};

export const ApiMarkAllNotificationsRead = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Mark all notifications as read' }),
    ApiResponse({
      status: 200,
      description: 'All notifications marked as read',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};

export const ApiDeleteNotification = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Delete notification' }),
    ApiResponse({
      status: 204,
      description: 'Notification deleted successfully',
    }),
    ApiNotFoundResponse({
      description: 'Notification not found',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};

export const ApiUpdateNotificationPreferences = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update notification preferences' }),
    ApiResponse({
      status: 200,
      description: 'Preferences updated successfully',
    }),
    ApiBadRequestResponse({
      description: 'Invalid preferences format',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};
