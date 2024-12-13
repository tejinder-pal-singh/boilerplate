import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import { ApiKey } from './entities/api-key.entity';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKey)
    private apiKeyRepository: Repository<ApiKey>,
  ) {}

  private hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  async createApiKey(userId: string, createApiKeyDto: CreateApiKeyDto): Promise<{ apiKey: string; id: string }> {
    const apiKey = randomBytes(32).toString('hex');
    const hashedKey = this.hashApiKey(apiKey);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90); // 90 days expiration

    const apiKeyEntity = this.apiKeyRepository.create({
      key: hashedKey,
      userId,
      name: createApiKeyDto.name,
      expiresAt,
      scopes: createApiKeyDto.scopes,
    });

    const saved = await this.apiKeyRepository.save(apiKeyEntity);
    return { apiKey, id: saved.id };
  }

  async validateApiKey(apiKey: string): Promise<ApiKey> {
    const hashedKey = this.hashApiKey(apiKey);
    const key = await this.apiKeyRepository.findOne({
      where: { key: hashedKey, revoked: false },
      relations: ['user'],
    });

    if (!key) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (key.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    return key;
  }

  async revokeApiKey(id: string, userId: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    apiKey.revoked = true;
    await this.apiKeyRepository.save(apiKey);
  }

  async rotateApiKey(id: string, userId: string): Promise<{ apiKey: string }> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { id, userId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    const newApiKey = randomBytes(32).toString('hex');
    apiKey.key = this.hashApiKey(newApiKey);
    apiKey.expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    await this.apiKeyRepository.save(apiKey);
    return { apiKey: newApiKey };
  }
}
