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
import { UserProfileDto } from '../users/dto/user-response.dto';

export const ApiGetProfile = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get user profile' }),
    ApiResponse({
      status: 200,
      description: 'User profile retrieved successfully',
      type: UserProfileDto
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};

export const ApiUpdateProfile = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update user profile' }),
    ApiResponse({
      status: 200,
      description: 'Profile updated successfully',
      type: UserProfileDto
    }),
    ApiBadRequestResponse({
      description: 'Validation error',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};

export const ApiUpdateSettings = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update user settings' }),
    ApiResponse({
      status: 200,
      description: 'Settings updated successfully',
      type: UserProfileDto
    }),
    ApiBadRequestResponse({
      description: 'Validation error',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};

export const ApiGetUsers = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get users list' }),
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
      name: 'search',
      required: false,
      type: String,
      description: 'Search term for email, first name, or last name',
    }),
    ApiResponse({
      status: 200,
      description: 'Users retrieved successfully',
      type: [UserProfileDto]
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};

export const ApiGetUserById = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get user by ID' }),
    ApiResponse({
      status: 200,
      description: 'User retrieved successfully',
      type: UserProfileDto
    }),
    ApiNotFoundResponse({
      description: 'User not found',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};
