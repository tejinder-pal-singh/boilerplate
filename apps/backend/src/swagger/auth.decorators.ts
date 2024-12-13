import { applyDecorators } from '@nestjs/common';
import { 
  ApiOperation, 
  ApiResponse, 
  ApiUnauthorizedResponse, 
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiTooManyRequestsResponse,
  ApiBearerAuth
} from '@nestjs/swagger';

export const ApiLogin = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Login with email and password' }),
    ApiResponse({
      status: 200,
      description: 'Successfully logged in',
    }),
    ApiBadRequestResponse({
      description: 'Invalid credentials or validation error',
    }),
    ApiTooManyRequestsResponse({
      description: 'Too many login attempts',
    })
  );
};

export const ApiRegister = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Register a new user account' }),
    ApiResponse({
      status: 201,
      description: 'Account successfully created',
    }),
    ApiBadRequestResponse({
      description: 'Validation error or email already exists',
    })
  );
};

export const ApiVerifyEmail = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Verify email address' }),
    ApiResponse({
      status: 200,
      description: 'Email successfully verified',
    }),
    ApiBadRequestResponse({
      description: 'Invalid or expired token',
    }),
    ApiNotFoundResponse({
      description: 'User not found',
    })
  );
};

export const ApiRequestPasswordReset = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Request password reset email' }),
    ApiResponse({
      status: 200,
      description: 'Password reset email sent',
    }),
    ApiBadRequestResponse({
      description: 'Invalid email or validation error',
    }),
    ApiTooManyRequestsResponse({
      description: 'Too many reset attempts',
    })
  );
};

export const ApiResetPassword = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Reset password using token' }),
    ApiResponse({
      status: 200,
      description: 'Password successfully reset',
    }),
    ApiBadRequestResponse({
      description: 'Invalid or expired token',
    }),
    ApiNotFoundResponse({
      description: 'User not found',
    })
  );
};

export const ApiChangePassword = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Change password' }),
    ApiResponse({
      status: 200,
      description: 'Password successfully changed',
    }),
    ApiBadRequestResponse({
      description: 'Invalid current password or validation error',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};

export const ApiVerifyMfa = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Verify MFA code' }),
    ApiResponse({
      status: 200,
      description: 'MFA code verified successfully',
    }),
    ApiBadRequestResponse({
      description: 'Invalid MFA code or token',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};

export const ApiRefreshToken = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Refresh access token' }),
    ApiResponse({
      status: 200,
      description: 'Token refreshed successfully',
    }),
    ApiBadRequestResponse({
      description: 'Invalid refresh token',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};
