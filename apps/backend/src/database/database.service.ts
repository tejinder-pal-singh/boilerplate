import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, QueryRunner } from 'typeorm';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private queryRunner: QueryRunner;

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
  }

  async onModuleDestroy() {
    if (this.queryRunner) {
      await this.queryRunner.release();
    }
  }

  async startTransaction(): Promise<QueryRunner> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    return queryRunner;
  }

  async commitTransaction(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.commitTransaction();
    await queryRunner.release();
  }

  async rollbackTransaction(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  }

  async executeWithTransaction<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    const queryRunner = await this.startTransaction();
    try {
      const result = await operation(queryRunner);
      await this.commitTransaction(queryRunner);
      return result;
    } catch (error) {
      await this.rollbackTransaction(queryRunner);
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

  async getQueryRunner(): Promise<QueryRunner> {
    return this.dataSource.createQueryRunner();
  }
}
