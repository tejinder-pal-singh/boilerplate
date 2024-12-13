import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as vault from 'node-vault';
import { PinoLoggerService } from '../services/logger.service';

@Injectable()
export class VaultService implements OnModuleInit {
  private client: vault.client;
  private readonly secretPath: string;

  constructor(
    private configService: ConfigService,
    private logger: PinoLoggerService,
  ) {
    this.secretPath = 'secret/data/app';
    this.client = vault({
      apiVersion: 'v1',
      endpoint: this.configService.get('VAULT_ADDR', 'http://localhost:8200'),
      token: this.configService.get('VAULT_TOKEN'),
    });
  }

  async onModuleInit() {
    try {
      await this.client.health();
    } catch (error) {
      this.logger.error('Failed to connect to Vault', error);
      // In development, we can continue without Vault
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  async getSecret(key: string): Promise<string> {
    try {
      const { data } = await this.client.read(this.secretPath);
      return data.data[key];
    } catch (error) {
      this.logger.error(`Failed to get secret: ${key}`, error);
      // Fallback to environment variable in development
      if (process.env.NODE_ENV !== 'production') {
        return this.configService.get(key);
      }
      throw error;
    }
  }

  async setSecret(key: string, value: string): Promise<void> {
    try {
      const currentSecrets = await this.client.read(this.secretPath);
      const updatedSecrets = {
        ...currentSecrets.data.data,
        [key]: value,
      };

      await this.client.write(this.secretPath, { data: updatedSecrets });
    } catch (error) {
      this.logger.error(`Failed to set secret: ${key}`, error);
      throw error;
    }
  }

  async rotateSecret(key: string, generateNew: () => string): Promise<void> {
    const newValue = generateNew();
    await this.setSecret(key, newValue);
    this.logger.info(`Rotated secret: ${key}`);
  }
}
