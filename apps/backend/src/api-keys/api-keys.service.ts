import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import { ApiKey } from './entities/api-key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { LoggerService } from '../shared/services/logger.service';
import { ApiKeyCacheService } from './services/api-key-cache.service';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
    private readonly logger: LoggerService,
    private readonly cacheService: ApiKeyCacheService,
  ) {}

  private hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  async createApiKey(userId: string, createApiKeyDto: CreateApiKeyDto): Promise<{ apiKey: string; id: string }> {
    try {
      const apiKey = randomBytes(32).toString('hex');
      const hashedKey = this.hashApiKey(apiKey);

      let expiresAt: Date;
      if (createApiKeyDto.expiresAt) {
        expiresAt = new Date(createApiKeyDto.expiresAt);
        if (expiresAt < new Date()) {
          throw new BadRequestException('Expiration date cannot be in the past');
        }
      } else {
        expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Default 1 year expiration
      }

      const apiKeyEntity = this.apiKeyRepository.create({
        key: hashedKey,
        userId,
        name: createApiKeyDto.name,
        expiresAt,
        scopes: createApiKeyDto.scopes || ['read'],
      });

      const saved = await this.apiKeyRepository.save(apiKeyEntity);
      
      // Cache the new API key
      await this.cacheService.set(hashedKey, saved);
      
      this.logger.info(`API key created for user ${userId}`);
      return { apiKey, id: saved.id };
    } catch (error) {
      this.logger.error('Failed to create API key', error);
      throw error;
    }
  }

  async validateApiKey(apiKey: string): Promise<ApiKey> {
    try {
      const hashedKey = this.hashApiKey(apiKey);
      
      // Try to get from cache first
      const cachedKey = await this.cacheService.get(hashedKey);
      if (cachedKey && cachedKey.isValid()) {
        return cachedKey;
      }

      // If not in cache or invalid, get from database
      const key = await this.apiKeyRepository.findOne({
        where: { key: hashedKey, revoked: false },
        relations: ['user'],
      });

      if (!key) {
        throw new UnauthorizedException('Invalid API key');
      }

      if (!key.isValid()) {
        throw new UnauthorizedException('API key has expired or been revoked');
      }

      // Cache the valid key
      await this.cacheService.set(hashedKey, key);

      return key;
    } catch (error) {
      this.logger.error('API key validation failed', error);
      throw error;
    }
  }

  async revokeApiKey(id: string, userId: string): Promise<void> {
    try {
      const apiKey = await this.apiKeyRepository.findOne({
        where: { id, userId }
      });

      if (!apiKey) {
        throw new NotFoundException('API key not found');
      }

      apiKey.revoked = true;
      await this.apiKeyRepository.save(apiKey);
      
      // Invalidate cache
      await this.cacheService.invalidate(apiKey.key);
      
      this.logger.info(`API key ${id} revoked for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to revoke API key ${id}`, error);
      throw error;
    }
  }

  async rotateApiKey(id: string, userId: string): Promise<{ apiKey: string }> {
    try {
      const apiKey = await this.apiKeyRepository.findOne({
        where: { id, userId, revoked: false },
      });

      if (!apiKey) {
        throw new NotFoundException('API key not found or already revoked');
      }

      if (!apiKey.isValid()) {
        throw new BadRequestException('Cannot rotate an expired API key');
      }

      // Invalidate old key in cache
      await this.cacheService.invalidate(apiKey.key);

      const newApiKey = randomBytes(32).toString('hex');
      apiKey.key = this.hashApiKey(newApiKey);
      
      // Extend expiration by 1 year from now
      apiKey.expiresAt = new Date();
      apiKey.expiresAt.setFullYear(apiKey.expiresAt.getFullYear() + 1);

      const saved = await this.apiKeyRepository.save(apiKey);
      
      // Cache the new key
      await this.cacheService.set(saved.key, saved);
      
      this.logger.info(`API key ${id} rotated for user ${userId}`);
      return { apiKey: newApiKey };
    } catch (error) {
      this.logger.error(`Failed to rotate API key ${id}`, error);
      throw error;
    }
  }

  async listApiKeys(userId: string): Promise<ApiKey[]> {
    try {
      return await this.apiKeyRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' }
      });
    } catch (error) {
      this.logger.error(`Failed to list API keys for user ${userId}`, error);
      throw error;
    }
  }

  async cleanupExpiredKeys(): Promise<number> {
    try {
      const result = await this.apiKeyRepository.update(
        { 
          expiresAt: LessThan(new Date()),
          revoked: false 
        },
        { revoked: true }
      );

      // Invalidate all cache on cleanup
      await this.cacheService.invalidateByUserId('*');

      const count = result.affected || 0;
      this.logger.info(`Cleaned up ${count} expired API keys`);
      return count;
    } catch (error) {
      this.logger.error('Failed to cleanup expired API keys', error);
      throw error;
    }
  }
}
