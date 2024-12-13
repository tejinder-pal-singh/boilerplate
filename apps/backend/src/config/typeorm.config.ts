import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SeederOptions } from 'typeorm-extension';

const getTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 5432),
  username: configService.get('DB_USER', 'postgres'),
  password: configService.get('DB_PASSWORD', 'postgres'),
  database: configService.get('DB_NAME', 'app'),
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/migrations/*{.ts,.js}'],
  synchronize: configService.get('NODE_ENV', 'development') === 'development',
  logging: configService.get('DB_LOGGING', 'false') === 'true',
  ssl: configService.get('DB_SSL', 'false') === 'true' ? {
    rejectUnauthorized: false,
  } : false,
  poolSize: configService.get('DB_POOL_SIZE', 10),
  extra: {
    max: configService.get('DB_POOL_SIZE', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
});

export default getTypeOrmConfig;

// For CLI migrations and seeds
export const getDataSourceConfig = (configService: ConfigService): DataSourceOptions & SeederOptions => ({
  ...getTypeOrmConfig(configService),
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],
  seeds: ['src/seeds/**/*{.ts,.js}'],
  factories: ['src/factories/**/*{.ts,.js}'],
});

// For CLI usage
export const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'app',
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],
  seeds: ['src/seeds/**/*{.ts,.js}'],
  factories: ['src/factories/**/*{.ts,.js}'],
});
