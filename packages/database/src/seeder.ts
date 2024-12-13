import { DataSource } from 'typeorm';
import { Logger } from '@enterprise/logger';
import { faker } from '@faker-js/faker';

export interface SeederOptions {
  truncate?: boolean;
  dependencies?: string[];
}

export abstract class Seeder {
  protected readonly dataSource: DataSource;
  protected readonly logger: Logger;

  constructor(dataSource: DataSource, logger: Logger) {
    this.dataSource = dataSource;
    this.logger = logger;
  }

  abstract seed(): Promise<void>;
  abstract revert(): Promise<void>;
}

export class SeederManager {
  private readonly dataSource: DataSource;
  private readonly logger: Logger;
  private readonly seeders: Map<string, Seeder>;

  constructor(dataSource: DataSource, logger: Logger) {
    this.dataSource = dataSource;
    this.logger = logger;
    this.seeders = new Map();
  }

  register(name: string, seeder: Seeder): void {
    this.seeders.set(name, seeder);
  }

  async seed(names?: string[]): Promise<void> {
    const seedersToRun = names || Array.from(this.seeders.keys());
    
    for (const name of seedersToRun) {
      const seeder = this.seeders.get(name);
      if (!seeder) {
        throw new Error(`Seeder ${name} not found`);
      }

      this.logger.info(`Running seeder: ${name}`);
      await seeder.seed();
      this.logger.info(`Seeder ${name} completed`);
    }
  }

  async revert(names?: string[]): Promise<void> {
    const seedersToRevert = names || Array.from(this.seeders.keys()).reverse();
    
    for (const name of seedersToRevert) {
      const seeder = this.seeders.get(name);
      if (!seeder) {
        throw new Error(`Seeder ${name} not found`);
      }

      this.logger.info(`Reverting seeder: ${name}`);
      await seeder.revert();
      this.logger.info(`Seeder ${name} reverted`);
    }
  }
}

// Example seeders
export class UserSeeder extends Seeder {
  async seed(): Promise<void> {
    const users = Array.from({ length: 10 }, () => ({
      email: faker.internet.email().toLowerCase(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      password: faker.internet.password(),
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    }));

    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into('users')
      .values(users)
      .execute();
  }

  async revert(): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .delete()
      .from('users')
      .execute();
  }
}

export class PostSeeder extends Seeder {
  async seed(): Promise<void> {
    const users = await this.dataSource
      .createQueryBuilder()
      .select('id')
      .from('users', 'users')
      .getRawMany();

    const posts = users.flatMap((user) =>
      Array.from({ length: 3 }, () => ({
        title: faker.lorem.sentence(),
        content: faker.lorem.paragraphs(),
        userId: user.id,
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
      }))
    );

    await this.dataSource
      .createQueryBuilder()
      .insert()
      .into('posts')
      .values(posts)
      .execute();
  }

  async revert(): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .delete()
      .from('posts')
      .execute();
  }
}
export default ExperimentManager;
