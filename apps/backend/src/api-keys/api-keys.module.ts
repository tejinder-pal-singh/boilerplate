import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKeysService } from './api-keys.service';
import { ApiKeysController } from './api-keys.controller';
import { ApiKey } from './entities/api-key.entity';
import { LoggerService } from '../shared/services/logger.service';
import { ApiKeyCacheService } from './services/api-key-cache.service';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';
import { ApiKeyRateLimitGuard } from './guards/api-key-rate-limit.guard';
import { RedisService } from '../shared/redis/redis.service';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey])],
  controllers: [ApiKeysController],
  providers: [
    ApiKeysService,
    LoggerService,
    RedisService,
    ApiKeyCacheService,
    ApiKeyAuthGuard,
    ApiKeyRateLimitGuard,
  ],
  exports: [
    ApiKeysService,
    ApiKeyAuthGuard,
    ApiKeyRateLimitGuard,
  ],
})
export class ApiKeysModule {}
