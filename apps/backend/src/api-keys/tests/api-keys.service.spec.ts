import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKeysService } from '../api-keys.service';
import { ApiKey } from '../entities/api-key.entity';
import { LoggerService } from '../../shared/services/logger.service';
import { CreateApiKeyDto } from '../dto/create-api-key.dto';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';

describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let repository: Repository<ApiKey>;
  let logger: LoggerService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    find: jest.fn(),
  };

  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        {
          provide: getRepositoryToken(ApiKey),
          useValue: mockRepository,
        },
        {
          provide: LoggerService,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
    repository = module.get<Repository<ApiKey>>(getRepositoryToken(ApiKey));
    logger = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createApiKey', () => {
    const userId = 'test-user-id';
    const createDto: CreateApiKeyDto = {
      name: 'Test API Key',
      scopes: ['read'],
    };

    it('should create a new API key', async () => {
      const mockApiKey = {
        id: 'test-id',
        key: 'hashed-key',
        ...createDto,
      };

      mockRepository.create.mockReturnValue(mockApiKey);
      mockRepository.save.mockResolvedValue(mockApiKey);

      const result = await service.createApiKey(userId, createDto);

      expect(result).toHaveProperty('apiKey');
      expect(result).toHaveProperty('id', 'test-id');
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should throw BadRequestException for past expiration date', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await expect(
        service.createApiKey(userId, { ...createDto, expiresAt: pastDate.toISOString() })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validateApiKey', () => {
    const apiKey = 'test-api-key';

    it('should validate an existing API key', async () => {
      const mockApiKey = {
        id: 'test-id',
        key: expect.any(String),
        expiresAt: new Date(Date.now() + 86400000), // tomorrow
        revoked: false,
        isValid: () => true,
      };

      mockRepository.findOne.mockResolvedValue(mockApiKey);

      const result = await service.validateApiKey(apiKey);

      expect(result).toBeDefined();
      expect(mockRepository.findOne).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid API key', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.validateApiKey(apiKey)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for expired API key', async () => {
      const mockApiKey = {
        id: 'test-id',
        key: expect.any(String),
        expiresAt: new Date(Date.now() - 86400000), // yesterday
        revoked: false,
        isValid: () => false,
      };

      mockRepository.findOne.mockResolvedValue(mockApiKey);

      await expect(service.validateApiKey(apiKey)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('revokeApiKey', () => {
    const userId = 'test-user-id';
    const apiKeyId = 'test-api-key-id';

    it('should revoke an existing API key', async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 });

      await service.revokeApiKey(apiKeyId, userId);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: apiKeyId, userId },
        { revoked: true }
      );
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent API key', async () => {
      mockRepository.update.mockResolvedValue({ affected: 0 });

      await expect(service.revokeApiKey(apiKeyId, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('rotateApiKey', () => {
    const userId = 'test-user-id';
    const apiKeyId = 'test-api-key-id';

    it('should rotate an existing API key', async () => {
      const mockApiKey = {
        id: apiKeyId,
        revoked: false,
        isValid: () => true,
      };

      mockRepository.findOne.mockResolvedValue(mockApiKey);
      mockRepository.save.mockResolvedValue(mockApiKey);

      const result = await service.rotateApiKey(apiKeyId, userId);

      expect(result).toHaveProperty('apiKey');
      expect(mockRepository.findOne).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent API key', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.rotateApiKey(apiKeyId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for expired API key', async () => {
      const mockApiKey = {
        id: apiKeyId,
        revoked: false,
        isValid: () => false,
      };

      mockRepository.findOne.mockResolvedValue(mockApiKey);

      await expect(service.rotateApiKey(apiKeyId, userId)).rejects.toThrow(BadRequestException);
    });
  });
});
