import { plainToClass } from 'class-transformer';
import { IsString, IsNumber, IsBoolean, validateSync, IsOptional, Min, Max } from 'class-validator';

export class EnvironmentVariables {
  @IsNumber()
  @Min(1)
  @Max(65535)
  PORT: number;

  @IsString()
  NODE_ENV: string;

  // Database
  @IsString()
  DB_HOST: string;

  @IsNumber()
  DB_PORT: number;

  @IsString()
  DB_USER: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_NAME: string;

  @IsBoolean()
  DB_SSL: boolean;

  @IsNumber()
  @Min(1)
  DB_POOL_SIZE: number;

  // Redis
  @IsString()
  REDIS_HOST: string;

  @IsNumber()
  REDIS_PORT: number;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD: string;

  @IsNumber()
  REDIS_DB: number;

  // JWT
  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRATION: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_REFRESH_EXPIRATION: string;

  // Rate Limiting
  @IsNumber()
  RATE_LIMIT_TTL: number;

  @IsNumber()
  RATE_LIMIT_MAX: number;

  // CORS
  @IsString()
  ALLOWED_ORIGINS: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(
    EnvironmentVariables,
    {
      PORT: parseInt(process.env.PORT, 10),
      NODE_ENV: process.env.NODE_ENV,
      DB_HOST: process.env.DB_HOST,
      DB_PORT: parseInt(process.env.DB_PORT, 10),
      DB_USER: process.env.DB_USER,
      DB_PASSWORD: process.env.DB_PASSWORD,
      DB_NAME: process.env.DB_NAME,
      DB_SSL: process.env.DB_SSL === 'true',
      DB_POOL_SIZE: parseInt(process.env.DB_POOL_SIZE, 10),
      REDIS_HOST: process.env.REDIS_HOST,
      REDIS_PORT: parseInt(process.env.REDIS_PORT, 10),
      REDIS_PASSWORD: process.env.REDIS_PASSWORD,
      REDIS_DB: parseInt(process.env.REDIS_DB, 10),
      JWT_SECRET: process.env.JWT_SECRET,
      JWT_EXPIRATION: process.env.JWT_EXPIRATION,
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
      JWT_REFRESH_EXPIRATION: process.env.JWT_REFRESH_EXPIRATION,
      RATE_LIMIT_TTL: parseInt(process.env.RATE_LIMIT_TTL, 10),
      RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10),
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    },
    { enableImplicitConversion: true },
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
