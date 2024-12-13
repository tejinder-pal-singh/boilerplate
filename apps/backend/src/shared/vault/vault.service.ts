import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import vault from 'node-vault';
import { PinoLoggerService } from '../services/logger.service';

@Injectable()
export class VaultService {
  private client: vault.client;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLoggerService,
  ) {
    this.initializeVault().catch(error => {
      this.logger.error('Failed to connect to Vault', error.message);
    });
  }

  private async initializeVault() {
    const options = {
      apiVersion: 'v1',
      endpoint: this.configService.get('VAULT_ADDR', 'http://localhost:8200'),
      token: this.configService.get('VAULT_TOKEN'),
    };

    this.client = vault(options);
  }

  async getSecret(key: string): Promise<string> {
    try {
      const path = `secret/data/${key}`;
      const { data } = await this.client.read(path);
      return data.data[key];
    } catch (error) {
      this.logger.error(`Failed to get secret: ${key}`, error.message);
      // Fallback to environment variable
      const value = this.configService.get<string>(key);
      if (!value) {
        throw new Error(`Secret ${key} not found in Vault or environment`);
      }
      return value;
    }
  }

  async setSecret(key: string, value: string): Promise<void> {
    try {
      const path = `secret/data/${key}`;
      await this.client.write(path, { data: { [key]: value } });
    } catch (error) {
      this.logger.error(`Failed to set secret: ${key}`, error.message);
      throw error;
    }
  }

  async deleteSecret(key: string): Promise<void> {
    try {
      const path = `secret/data/${key}`;
      await this.client.delete(path);
    } catch (error) {
      this.logger.error(`Failed to delete secret: ${key}`, error.message);
      throw error;
    }
  }
}
