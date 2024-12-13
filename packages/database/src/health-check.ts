import { DataSource } from 'typeorm';
import { Logger } from '@enterprise/logger';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  details: {
    responseTime: number;
    connections: {
      active: number;
      idle: number;
      total: number;
    };
    migrations: {
      pending: number;
      executed: number;
    };
    lastError?: string;
  };
}

export class DatabaseHealthCheck {
  private readonly dataSource: DataSource;
  private readonly logger: Logger;

  constructor(dataSource: DataSource, logger: Logger) {
    this.dataSource = dataSource;
    this.logger = logger;
  }

  async check(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let status: 'healthy' | 'unhealthy' = 'healthy';
    let lastError: string | undefined;

    try {
      // Check database connection
      if (!this.dataSource.isInitialized) {
        throw new Error('Database connection not initialized');
      }

      // Get connection pool stats
      const poolStats = await this.getPoolStats();

      // Check pending migrations
      const migrations = await this.getMigrationStatus();

      // Execute simple query to check response time
      await this.dataSource.query('SELECT 1');

      const responseTime = Date.now() - startTime;

      return {
        status,
        details: {
          responseTime,
          connections: poolStats,
          migrations,
        },
      };
    } catch (error) {
      status = 'unhealthy';
      lastError = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Database health check failed', { error });

      return {
        status,
        details: {
          responseTime: Date.now() - startTime,
          connections: {
            active: 0,
            idle: 0,
            total: 0,
          },
          migrations: {
            pending: 0,
            executed: 0,
          },
          lastError,
        },
      };
    }
  }

  private async getPoolStats() {
    // Implementation depends on your database driver
    // Here's an example for node-postgres
    const pool = (this.dataSource.driver as any).postgres;
    
    return {
      active: pool.totalCount - pool.idleCount,
      idle: pool.idleCount,
      total: pool.totalCount,
    };
  }

  private async getMigrationStatus() {
    const [executedMigrations, pendingMigrations] = await Promise.all([
      this.dataSource.query('SELECT COUNT(*) as count FROM migrations'),
      this.dataSource.showMigrations(),
    ]);

    return {
      executed: parseInt(executedMigrations[0].count),
      pending: pendingMigrations ? 1 : 0,
    };
  }

  async vacuum(table?: string): Promise<void> {
    try {
      this.logger.info('Starting VACUUM operation...');
      
      if (table) {
        await this.dataSource.query(`VACUUM ANALYZE ${table}`);
        this.logger.info(`VACUUM completed for table: ${table}`);
      } else {
        await this.dataSource.query('VACUUM ANALYZE');
        this.logger.info('VACUUM completed for all tables');
      }
    } catch (error) {
      this.logger.error('VACUUM operation failed', { error });
      throw error;
    }
  }

  async analyze(table?: string): Promise<void> {
    try {
      this.logger.info('Starting ANALYZE operation...');
      
      if (table) {
        await this.dataSource.query(`ANALYZE ${table}`);
        this.logger.info(`ANALYZE completed for table: ${table}`);
      } else {
        await this.dataSource.query('ANALYZE');
        this.logger.info('ANALYZE completed for all tables');
      }
    } catch (error) {
      this.logger.error('ANALYZE operation failed', { error });
      throw error;
    }
  }
}
export default ExperimentManager;
