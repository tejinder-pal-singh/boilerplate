import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersService } from '../users.service';
import { User, AuthProvider } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { LoggerService } from '../../shared/services/logger.service';
import { MetricsService } from '../../shared/services/metrics.service';
import { RedisService } from '../../shared/redis/redis.service';
import { ServiceResult } from '../../shared/types/service.types';
import { ErrorCode } from '../../shared/types/error.types';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('UsersService Integration Tests', () => {
  let module: TestingModule;
  let usersService: UsersService;
  let configService: ConfigService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            type: 'postgres',
            host: configService.get('DB_HOST'),
            port: configService.get('DB_PORT'),
            username: configService.get('DB_USERNAME'),
            password: configService.get('DB_PASSWORD'),
            database: configService.get('DB_DATABASE'),
            entities: [User],
            synchronize: true,
          }),
          inject: [ConfigService],
        }),
        TypeOrmModule.forFeature([User]),
      ],
      providers: [
        UsersService,
        LoggerService,
        MetricsService,
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              switch (key) {
                case 'DB_HOST':
                  return 'localhost';
                case 'DB_PORT':
                  return 5432;
                case 'DB_USERNAME':
                  return 'test';
                case 'DB_PASSWORD':
                  return 'test';
                case 'DB_DATABASE':
                  return 'test';
                default:
                  return null;
              }
            }),
          },
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'John',
      lastName: 'Doe',
      provider: AuthProvider.LOCAL,
    };

    it('should create a new user', async () => {
      const result = await usersService.create({ data: createUserDto });

      expect(result).toBeDefined();
      expect(result.email).toBe(createUserDto.email);
      expect(result.firstName).toBe(createUserDto.firstName);
      expect(result.lastName).toBe(createUserDto.lastName);
      expect(result.provider).toBe(createUserDto.provider);
    });

    it('should throw ConflictException when email already exists', async () => {
      await expect(
        usersService.create({ data: createUserDto }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      const result: ServiceResult<User[]> = await usersService.findAll({
        pagination: {
          page: 1,
          limit: 10,
        },
      });

      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.meta).toBeDefined();
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(typeof result.meta.total).toBe('number');
    });

    it('should filter users by email', async () => {
      const result = await usersService.findAll({
        where: { email: 'test@example.com' },
      });

      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].email).toBe('test@example.com');
    });
  });

  describe('findOne', () => {
    let userId: string;

    beforeAll(async () => {
      const user = await usersService.create({
        data: {
          email: 'findone@example.com',
          password: 'Password123!',
          firstName: 'Find',
          lastName: 'One',
          provider: AuthProvider.LOCAL,
        },
      });
      userId = user.id;
    });

    it('should find a user by id', async () => {
      const user = await usersService.findOne(userId);
      expect(user).toBeDefined();
      expect(user.id).toBe(userId);
    });

    it('should throw NotFoundException when user not found', async () => {
      await expect(
        usersService.findOne('non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    let userId: string;

    beforeAll(async () => {
      const user = await usersService.create({
        data: {
          email: 'update@example.com',
          password: 'Password123!',
          firstName: 'Update',
          lastName: 'User',
          provider: AuthProvider.LOCAL,
        },
      });
      userId = user.id;
    });

    it('should update user details', async () => {
      const updateUserDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const result = await usersService.update(userId, {
        data: updateUserDto,
      });

      expect(result).toBeDefined();
      expect(result.firstName).toBe(updateUserDto.firstName);
      expect(result.lastName).toBe(updateUserDto.lastName);
    });

    it('should throw ConflictException when updating to existing email', async () => {
      await expect(
        usersService.update(userId, {
          data: { email: 'test@example.com' },
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    let userId: string;

    beforeAll(async () => {
      const user = await usersService.create({
        data: {
          email: 'delete@example.com',
          password: 'Password123!',
          firstName: 'Delete',
          lastName: 'User',
          provider: AuthProvider.LOCAL,
        },
      });
      userId = user.id;
    });

    it('should delete a user', async () => {
      const result = await usersService.delete(userId);
      expect(result).toBe(true);

      await expect(
        usersService.findOne(userId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
