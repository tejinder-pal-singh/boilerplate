import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { RedisModule } from './shared/redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LoggerModule } from './shared/logger/logger.module';
import { SecurityModule } from './security/security.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { VaultModule } from './shared/vault/vault.module';
import { VectorDbModule } from './vector-db/vector-db.module';
import { WebsocketModule } from './websocket/websocket.module';
import { CacheModule } from './shared/cache/cache.module';
import { TestController } from './test/test.controller';
import { 
  envValidationSchema,
  databaseConfig,
  redisConfig,
  jwtConfig,
  oauthConfig,
  vaultConfig,
  pineconeConfig,
} from './config/env.config';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        redisConfig,
        jwtConfig,
        oauthConfig,
        vaultConfig,
        pineconeConfig,
      ],
      validationSchema: envValidationSchema,
    }),
    
    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.name'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('database.synchronize'),
        logging: configService.get('database.logging'),
        ssl: configService.get('database.ssl') ? {
          rejectUnauthorized: false,
        } : false,
        poolSize: configService.get('database.poolSize'),
      }),
      inject: [ConfigService],
    }),

    // Rate limiting with Redis storage
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        storage: new ThrottlerStorageRedisService({
          host: config.get('redis.host'),
          port: config.get('redis.port'),
          password: config.get('redis.password'),
          db: config.get('redis.db'),
        }),
        ttl: config.get('RATE_LIMIT_TTL'),
        limit: config.get('RATE_LIMIT_MAX'),
      }),
    }),

    // Redis
    RedisModule,

    // Cache
    CacheModule,

    // Vault for secrets management
    VaultModule,

    // Vector database
    VectorDbModule,

    // WebSocket
    WebsocketModule,

    // Feature modules
    AuthModule,
    UsersModule,
    LoggerModule,
    SecurityModule,
    ApiKeysModule,
  ],
  controllers: [TestController],
})
export class AppModule {}
