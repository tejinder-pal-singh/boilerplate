import { DataSource, QueryRunner } from 'typeorm';
import { Logger } from '@enterprise/logger';

export class MigrationManager {
  private readonly dataSource: DataSource;
  private readonly logger: Logger;

  constructor(dataSource: DataSource, logger: Logger) {
    this.dataSource = dataSource;
    this.logger = logger;
  }

  async migrate(): Promise<void> {
    try {
      const pendingMigrations = await this.dataSource.showMigrations();
      
      if (!pendingMigrations) {
        this.logger.info('No pending migrations');
        return;
      }

      this.logger.info('Running migrations...');
      await this.dataSource.runMigrations({ transaction: 'all' });
      this.logger.info('Migrations completed successfully');
    } catch (error) {
      this.logger.error('Migration failed', { error });
      throw error;
    }
  }

  async revert(): Promise<void> {
    try {
      this.logger.info('Reverting last migration...');
      await this.dataSource.undoLastMigration({ transaction: 'all' });
      this.logger.info('Migration reverted successfully');
    } catch (error) {
      this.logger.error('Migration revert failed', { error });
      throw error;
    }
  }

  async createTransaction(): Promise<QueryRunner> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    return queryRunner;
  }

  async commitTransaction(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.commitTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  async rollbackTransaction(queryRunner: QueryRunner): Promise<void> {
    try {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  async backup(path: string): Promise<void> {
    this.logger.info('Starting database backup...');
    try {
      // Implementation depends on your database system
      // Here's an example for PostgreSQL using pg_dump
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      const command = `PGPASSWORD=${process.env.DB_PASSWORD} pg_dump -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -F c -f ${path}`;
      
      await execAsync(command);
      this.logger.info('Database backup completed successfully');
    } catch (error) {
      this.logger.error('Database backup failed', { error });
      throw error;
    }
  }

  async restore(path: string): Promise<void> {
    this.logger.info('Starting database restore...');
    try {
      // Implementation depends on your database system
      // Here's an example for PostgreSQL using pg_restore
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      const command = `PGPASSWORD=${process.env.DB_PASSWORD} pg_restore -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -c ${path}`;
      
      await execAsync(command);
      this.logger.info('Database restore completed successfully');
    } catch (error) {
      this.logger.error('Database restore failed', { error });
      throw error;
    }
  }
}
export default ExperimentManager;
