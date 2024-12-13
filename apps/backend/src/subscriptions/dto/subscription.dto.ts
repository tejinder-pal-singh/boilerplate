import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsNumber, 
  IsEnum, 
  IsUUID, 
  IsOptional, 
  IsDate,
  IsBoolean,
  Min,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsValidCurrency } from '../../shared/validators/custom.validator';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
  TRIALING = 'trialing'
}

export enum SubscriptionInterval {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export class SubscriptionPriceDto {
  @ApiProperty({
    description: 'Subscription price amount',
    example: 29.99,
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

  @ApiProperty({
    description: 'Billing interval',
    enum: SubscriptionInterval,
    example: SubscriptionInterval.MONTHLY
  })
  @IsEnum(SubscriptionInterval)
  interval: SubscriptionInterval;
}

export class SubscriptionFeatureDto {
  @ApiProperty({
    description: 'Feature name',
    example: 'Custom Domains'
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Feature description',
    example: 'Use your own domain name'
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Feature limit (null for unlimited)',
    example: 5
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  limit?: number;
}

export class SubscriptionPlanDto {
  @ApiProperty({
    description: 'Plan ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    description: 'Plan tier',
    enum: SubscriptionTier,
    example: SubscriptionTier.PRO
  })
  @IsEnum(SubscriptionTier)
  tier: SubscriptionTier;

  @ApiProperty({
    description: 'Plan name',
    example: 'Pro Plan'
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Plan description',
    example: 'Perfect for growing businesses'
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Plan price details',
    type: SubscriptionPriceDto
  })
  @ValidateNested()
  @Type(() => SubscriptionPriceDto)
  price: SubscriptionPriceDto;

  @ApiProperty({
    description: 'Plan features',
    type: [SubscriptionFeatureDto]
  })
  @ValidateNested({ each: true })
  @Type(() => SubscriptionFeatureDto)
  features: SubscriptionFeatureDto[];

  @ApiProperty({
    description: 'Trial period in days',
    example: 14
  })
  @IsNumber()
  @Min(0)
  trialPeriodDays: number;
}

export class SubscriptionDto {
  @ApiProperty({
    description: 'Subscription ID',
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
    description: 'Plan ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  planId: string;

  @ApiProperty({
    description: 'Subscription status',
    enum: SubscriptionStatus,
    example: SubscriptionStatus.ACTIVE
  })
  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus;

  @ApiProperty({
    description: 'Subscription start date',
    example: '2024-12-13T18:23:59-05:00'
  })
  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @ApiProperty({
    description: 'Current period end date',
    example: '2025-12-13T18:23:59-05:00'
  })
  @IsDate()
  @Type(() => Date)
  currentPeriodEnd: Date;

  @ApiProperty({
    description: 'Cancel at period end flag',
    example: false
  })
  @IsBoolean()
  cancelAtPeriodEnd: boolean;

  @ApiPropertyOptional({
    description: 'Cancellation date',
    example: '2024-12-13T18:23:59-05:00'
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  cancelledAt?: Date;

  @ApiPropertyOptional({
    description: 'Trial end date',
    example: '2024-12-27T18:23:59-05:00'
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  trialEndDate?: Date;

  @ApiPropertyOptional({
    description: 'Provider-specific subscription details',
    example: {
      stripeSubscriptionId: 'sub_123456'
    }
  })
  @IsOptional()
  providerDetails?: Record<string, any>;

  @ApiProperty({
    description: 'Subscription creation date',
    example: '2024-12-13T18:23:59-05:00'
  })
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiProperty({
    description: 'Subscription last update date',
    example: '2024-12-13T18:23:59-05:00'
  })
  @IsDate()
  @Type(() => Date)
  updatedAt: Date;
}

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'Plan ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsUUID()
  planId: string;

  @ApiPropertyOptional({
    description: 'Payment method ID',
    example: 'pm_123456'
  })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({
    description: 'Promotion code',
    example: 'WELCOME20'
  })
  @IsOptional()
  @IsString()
  promoCode?: string;
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({
    description: 'New plan ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({
    description: 'Cancel at period end flag',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  cancelAtPeriodEnd?: boolean;

  @ApiPropertyOptional({
    description: 'Payment method ID',
    example: 'pm_123456'
  })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}
