import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PineconeClient } from '@pinecone-database/pinecone';
import { PinoLoggerService } from '../shared/services/logger.service';
import { VaultService } from '../shared/vault/vault.service';

@Injectable()
export class VectorDbService implements OnModuleInit {
  private client: PineconeClient;
  private readonly indexName: string;

  constructor(
    private configService: ConfigService,
    private logger: PinoLoggerService,
    private vaultService: VaultService,
  ) {
    this.indexName = this.configService.get('PINECONE_INDEX_NAME', 'app-index');
  }

  async onModuleInit() {
    this.client = new PineconeClient();
    await this.initializePinecone();
  }

  private async initializePinecone() {
    try {
      const apiKey = await this.vaultService.getSecret('PINECONE_API_KEY');
      await this.client.init({
        environment: this.configService.get('PINECONE_ENVIRONMENT'),
        apiKey,
      });
    } catch (error) {
      this.logger.error('Failed to initialize Pinecone', error);
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  async upsertVectors(vectors: Array<{ id: string; values: number[]; metadata?: Record<string, any> }>) {
    const index = this.client.Index(this.indexName);
    try {
      await index.upsert({
        vectors,
      });
    } catch (error) {
      this.logger.error('Failed to upsert vectors', error);
      throw error;
    }
  }

  async queryVectors(queryVector: number[], topK: number = 10) {
    const index = this.client.Index(this.indexName);
    try {
      const queryResponse = await index.query({
        queryRequest: {
          vector: queryVector,
          topK,
          includeMetadata: true,
        },
      });
      return queryResponse.matches;
    } catch (error) {
      this.logger.error('Failed to query vectors', error);
      throw error;
    }
  }

  async deleteVectors(ids: string[]) {
    const index = this.client.Index(this.indexName);
    try {
      await index.delete1({
        ids,
      });
    } catch (error) {
      this.logger.error('Failed to delete vectors', error);
      throw error;
    }
  }
}
