import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

export class TestUtils {
  private static app: INestApplication;
  private static moduleFixture: TestingModule;

  static async initializeE2ETestModule() {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();
    await app.init();

    TestUtils.app = app;
    TestUtils.moduleFixture = moduleFixture;

    return { app, moduleFixture };
  }

  static async closeE2ETestModule() {
    if (TestUtils.app) {
      await TestUtils.app.close();
    }
  }

  static async createTestingDatabase() {
    const dataSource = new DataSource({
      type: 'postgres',
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      username: process.env.TEST_DB_USERNAME || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'postgres',
      database: process.env.TEST_DB_NAME || 'test_db',
      entities: ['src/**/*.entity{.ts,.js}'],
      synchronize: true,
      dropSchema: true,
    });

    await dataSource.initialize();
    return dataSource;
  }

  static async clearDatabase(dataSource: DataSource) {
    const entities = dataSource.entityMetadatas;
    for (const entity of entities) {
      const repository = dataSource.getRepository(entity.name);
      await repository.clear();
    }
  }

  static getTestJwtToken(userId: string): string {
    // This is a mock JWT token for testing purposes
    return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(
      JSON.stringify({ sub: userId }),
    ).toString('base64')}.test-signature`;
  }
}
