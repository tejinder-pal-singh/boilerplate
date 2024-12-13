import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner } from 'typeorm';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private queryRunner: QueryRunner | null = null;

  constructor(
    private dataSource: DataSource,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Ensure database connection is established
    if (!this.dataSource.isInitialized) {
      await this.dataSource.initialize();
    }
    this.queryRunner = this.dataSource.createQueryRunner();
    await this.queryRunner.connect();
  }

  async onModuleDestroy() {
    if (this.queryRunner) {
      await this.queryRunner.release();
      this.queryRunner = null;
    }
  }

  async startTransaction(): Promise<QueryRunner> {
    if (!this.queryRunner) {
      throw new Error('QueryRunner not initialized');
    }
    await this.queryRunner.startTransaction();
    return this.queryRunner;
  }

  async commitTransaction(): Promise<void> {
    if (!this.queryRunner) {
      throw new Error('QueryRunner not initialized');
    }
    await this.queryRunner.commitTransaction();
  }

  async rollbackTransaction(): Promise<void> {
    if (!this.queryRunner) {
      throw new Error('QueryRunner not initialized');
    }
    await this.queryRunner.rollbackTransaction();
  }

  async executeWithTransaction<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    const queryRunner = await this.startTransaction();
    try {
      const result = await operation(queryRunner);
      await this.commitTransaction();
      return result;
    } catch (error) {
      await this.rollbackTransaction();
      throw error;
    }
  }

  async checkDatabaseConnection(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }

  async getDatabaseStats(): Promise<any> {
    const stats = await this.dataSource.query(`
      SELECT 
        schemaname as schema,
        relname as table,
        n_live_tup as rows,
        pg_size_pretty(pg_total_relation_size(relid)) as total_size
      FROM pg_stat_user_tables
      ORDER BY n_live_tup DESC;
    `);
    return stats;
  }

  async vacuum(table: string): Promise<void> {
    await this.dataSource.query(`VACUUM ANALYZE ${table};`);
  }

  getQueryRunner(): QueryRunner {
    if (!this.queryRunner) {
      throw new Error('QueryRunner not initialized');
    }
    return this.queryRunner;
  }
}
