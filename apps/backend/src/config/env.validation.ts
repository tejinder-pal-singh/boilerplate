import { plainToClass, Transform } from 'class-transformer';
import { IsString, IsNumber, IsBoolean, validateSync, IsOptional } from 'class-validator';

export class EnvironmentVariables {
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  PORT: number = 3000;

  @IsString()
  NODE_ENV: string = 'development';

  // Database
  @IsString()
  DB_HOST: string = 'localhost';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  DB_PORT: number = 5432;

  @IsString()
  DB_USER: string = 'postgres';

  @IsString()
  DB_PASSWORD: string = 'postgres';

  @IsString()
  DB_NAME: string = 'boilerplate';

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  DB_SSL: boolean = false;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  DB_POOL_SIZE: number = 10;

  // Redis
  @IsString()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  REDIS_DB: number = 0;

  // JWT
  @IsString()
  JWT_SECRET: string = 'your-secret-key';

  @IsString()
  JWT_EXPIRATION: string = '15m';

  @IsString()
  JWT_REFRESH_SECRET: string = 'your-refresh-secret';

  @IsString()
  JWT_REFRESH_EXPIRATION: string = '7d';

  // Rate Limiting
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_TTL: number = 60;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  RATE_LIMIT_MAX: number = 100;

  // CORS
  @IsString()
  ALLOWED_ORIGINS: string = '*';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
