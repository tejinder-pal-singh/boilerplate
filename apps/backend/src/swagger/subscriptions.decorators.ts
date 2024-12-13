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
import { 
  SubscriptionDto, 
  SubscriptionPlanDto,
  SubscriptionStatus,
  SubscriptionTier
} from '../subscriptions/dto/subscription.dto';

export const ApiGetPlans = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get available subscription plans' }),
    ApiResponse({
      status: 200,
      description: 'Subscription plans retrieved successfully',
      type: [SubscriptionPlanDto]
    })
  );
};

export const ApiGetPlan = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get subscription plan by ID' }),
    ApiResponse({
      status: 200,
      description: 'Subscription plan retrieved successfully',
      type: SubscriptionPlanDto
    }),
    ApiNotFoundResponse({
      description: 'Plan not found',
    })
  );
};

export const ApiCreateSubscription = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Create a new subscription' }),
    ApiResponse({
      status: 201,
      description: 'Subscription created successfully',
      type: SubscriptionDto
    }),
    ApiBadRequestResponse({
      description: 'Invalid subscription details',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};

export const ApiGetSubscriptions = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get user subscriptions' }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: SubscriptionStatus,
      description: 'Filter by subscription status',
    }),
    ApiQuery({
      name: 'tier',
      required: false,
      enum: SubscriptionTier,
      description: 'Filter by subscription tier',
    }),
    ApiResponse({
      status: 200,
      description: 'Subscriptions retrieved successfully',
      type: [SubscriptionDto]
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};

export const ApiGetSubscription = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get subscription by ID' }),
    ApiResponse({
      status: 200,
      description: 'Subscription retrieved successfully',
      type: SubscriptionDto
    }),
    ApiNotFoundResponse({
      description: 'Subscription not found',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};

export const ApiUpdateSubscription = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update subscription' }),
    ApiResponse({
      status: 200,
      description: 'Subscription updated successfully',
      type: SubscriptionDto
    }),
    ApiBadRequestResponse({
      description: 'Invalid update details',
    }),
    ApiNotFoundResponse({
      description: 'Subscription not found',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};

export const ApiCancelSubscription = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Cancel subscription' }),
    ApiResponse({
      status: 200,
      description: 'Subscription cancelled successfully',
      type: SubscriptionDto
    }),
    ApiBadRequestResponse({
      description: 'Subscription already cancelled',
    }),
    ApiNotFoundResponse({
      description: 'Subscription not found',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};
