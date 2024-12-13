import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsNumber, 
  IsEnum, 
  IsUUID, 
  IsOptional, 
  IsDate,
  Min,
  IsObject,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsValidCurrency } from '../../shared/validators/custom.validator';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  CRYPTO = 'crypto'
}

export enum PaymentProvider {
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
  COINBASE = 'coinbase'
}

export class PaymentAmountDto {
  @ApiProperty({
    description: 'Payment amount',
    example: 99.99,
    minimum: 0
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'USD'
  })
  @IsString()
  @IsValidCurrency()
  currency: string;
}

export class PaymentDto {
  @ApiProperty({
    description: 'Payment ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  userId: string;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
    example: PaymentStatus.COMPLETED
  })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.CREDIT_CARD
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({
    description: 'Payment provider',
    enum: PaymentProvider,
    example: PaymentProvider.STRIPE
  })
  @IsEnum(PaymentProvider)
  provider: PaymentProvider;

  @ApiProperty({
    description: 'Payment amount details',
    type: PaymentAmountDto
  })
  @ValidateNested()
  @Type(() => PaymentAmountDto)
  amount: PaymentAmountDto;

  @ApiPropertyOptional({
    description: 'Provider-specific payment details',
    example: {
      chargeId: 'ch_123456',
      last4: '4242'
    }
  })
  @IsOptional()
  @IsObject()
  providerDetails?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Error details if payment failed',
    example: {
      code: 'card_declined',
      message: 'Card was declined'
    }
  })
  @IsOptional()
  @IsObject()
  errorDetails?: Record<string, any>;

  @ApiProperty({
    description: 'Payment creation date',
    example: '2024-12-13T18:23:59-05:00'
  })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({
    description: 'Payment last update date',
    example: '2024-12-13T18:23:59-05:00'
  })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;
}

export class CreatePaymentDto {
  @ApiProperty({
    description: 'Payment method',
    enum: PaymentMethod,
    example: PaymentMethod.CREDIT_CARD
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({
    description: 'Payment amount details',
    type: PaymentAmountDto
  })
  @ValidateNested()
  @Type(() => PaymentAmountDto)
  amount: PaymentAmountDto;

  @ApiPropertyOptional({
    description: 'Provider-specific payment details',
    example: {
      paymentMethodId: 'pm_123456'
    }
  })
  @IsOptional()
  @IsObject()
  providerDetails?: Record<string, any>;
}

export class RefundPaymentDto {
  @ApiPropertyOptional({
    description: 'Refund reason',
    example: 'Customer requested'
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({
    description: 'Refund amount (defaults to full amount if not specified)',
    type: PaymentAmountDto
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentAmountDto)
  amount?: PaymentAmountDto;
}
