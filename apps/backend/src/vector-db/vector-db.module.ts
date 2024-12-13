import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VectorDbService } from './vector-db.service';
import { VaultModule } from '../shared/vault/vault.module';

@Module({
  imports: [ConfigModule, VaultModule],
  providers: [VectorDbService],
  exports: [VectorDbService],
})
export class VectorDbModule {}
