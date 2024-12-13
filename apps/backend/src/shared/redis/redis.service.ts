import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;

  constructor(private configService: ConfigService) {
    this.client = createClient({
      url: `redis://${this.configService.get('redis.host')}:${this.configService.get('redis.port')}`,
      password: this.configService.get('redis.password'),
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
  }

  async onModuleInit() {
    await this.client.connect();
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): RedisClientType {
    return this.client;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setEx(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async setHash(key: string, field: string, value: string): Promise<void> {
    await this.client.hSet(key, field, value);
  }

  async getHash(key: string, field: string): Promise<string | null> {
    return await this.client.hGet(key, field);
  }

  async delHash(key: string, field: string): Promise<void> {
    await this.client.hDel(key, field);
  }
}
