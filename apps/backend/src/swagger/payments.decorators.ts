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
import { PaymentDto, PaymentStatus } from '../payments/dto/payment.dto';

export const ApiCreatePayment = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Create a new payment' }),
    ApiResponse({
      status: 201,
      description: 'Payment created successfully',
      type: PaymentDto
    }),
    ApiBadRequestResponse({
      description: 'Invalid payment details',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};

export const ApiGetPayments = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get user payments' }),
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
      name: 'status',
      required: false,
      enum: PaymentStatus,
      description: 'Filter by payment status',
    }),
    ApiResponse({
      status: 200,
      description: 'Payments retrieved successfully',
      type: [PaymentDto]
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};

export const ApiGetPayment = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get payment by ID' }),
    ApiResponse({
      status: 200,
      description: 'Payment retrieved successfully',
      type: PaymentDto
    }),
    ApiNotFoundResponse({
      description: 'Payment not found',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};

export const ApiRefundPayment = () => {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Refund a payment' }),
    ApiResponse({
      status: 200,
      description: 'Payment refunded successfully',
      type: PaymentDto
    }),
    ApiBadRequestResponse({
      description: 'Invalid refund details or payment already refunded',
    }),
    ApiNotFoundResponse({
      description: 'Payment not found',
    }),
    ApiUnauthorizedResponse({
      description: 'Unauthorized',
    })
  );
};
